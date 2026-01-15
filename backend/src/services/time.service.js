// src/services/time.service.js (ESM)
// Lógica de tempo completa: sono, consumo por ação, viagem com overrides por dificuldade,
// deadline por simulação com piso mínimo, e sumário em ISO UTC.

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezonePlugin from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// Config padrão
const DEFAULT_TZ = 'America/Sao_Paulo';
const SLEEP_START = 23; // 23:00
const SLEEP_END = 8;    // 08:00

// Velocidades e overheads base
const PLANE_SPEED_KMH = 800;
const CAR_SPEED_KMH = 90;
const BASE_PLANE_OVERHEAD_MIN = 120; // 2h
const BASE_CAR_OVERHEAD_MIN = 30;    // 0.5h

// Overrides de tempo de viagem por dificuldade (elevação em HARD/EXTREME)
const DIFF_TRAVEL_OVERRIDES = {
  EASY:    { intra_min: 240, inter_min: 360, plane_overhead: BASE_PLANE_OVERHEAD_MIN,      car_overhead: BASE_CAR_OVERHEAD_MIN      },
  HARD:    { intra_min: 330, inter_min: 480, plane_overhead: BASE_PLANE_OVERHEAD_MIN + 30, car_overhead: BASE_CAR_OVERHEAD_MIN + 15 },
  EXTREME: { intra_min: 360, inter_min: 600, plane_overhead: BASE_PLANE_OVERHEAD_MIN + 60, car_overhead: BASE_CAR_OVERHEAD_MIN + 30 },
};

// Buffers por dificuldade (usados na simulação de deadline)
const DEFAULT_DIFFICULTY_PARAMS = {
  EASY:    { maxFailsAllowed: 3, visitsBuffer: 5, shortcutSkips: 0 },
  HARD:    { maxFailsAllowed: 0, visitsBuffer: 1, shortcutSkips: 0 },
  EXTREME: { maxFailsAllowed: 0, visitsBuffer: 0, shortcutSkips: 2 },
};

// Piso mínimo de deadline por dificuldade (dias)
const MIN_DEADLINE_DAYS = { EASY: 7, HARD: 5, EXTREME: 3 };

// Repositórios
import { getCityById } from '../repositories/city.repo.js';
import { getGameDifficultyByCode } from '../repositories/game_difficulty.repo.js';
import { getXpRuleByDifficulty } from '../repositories/xp_rules.repo.js';
import { getTravelOverrideMinutes } from '../repositories/travel_overrides.repo.js';
import { upsertCaseTimeState, getCaseTimeState } from '../repositories/case_time_state.repo.js';

// Util: distância haversine (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = d => (d * Math.PI) / 180.0;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Aux: obter label de dificuldade do caso
async function getCaseDifficultyLabel(caseId) {
  try {
    const { default: db } = await import('../config/database.js');
    const [[row]] = await db.execute(
      'SELECT gd.code AS difficulty_code FROM active_cases ac JOIN game_difficulty gd ON gd.id = ac.difficulty_id WHERE ac.id = ? LIMIT 1',
      [caseId]
    );
    return row?.difficulty_code || 'EASY';
  } catch {
    return 'EASY';
  }
}

// Estima minutos de viagem entre cidades (ajustado por dificuldade do caso)
export async function estimateTravelMinutes({ fromCityId, toCityId, caseId = null }) {
  // 1) Override direto do DB
  const override = await getTravelOverrideMinutes(fromCityId, toCityId);
  if (override != null) return override;

  // 2) Buscar lat/lng
  const from = await getCityById(fromCityId);
  const to = await getCityById(toCityId);
  if (!from || !to) throw new Error('Cidade inválida para cálculo de viagem');

  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const sameCountry = from.country_id && to.country_id && from.country_id === to.country_id;

  let diffLabel = 'EASY';
  if (caseId) diffLabel = await getCaseDifficultyLabel(caseId);
  const diffCfg = DIFF_TRAVEL_OVERRIDES[diffLabel] || DIFF_TRAVEL_OVERRIDES.EASY;

  // 3) Regions/neighbors para classificação fictícia
  try {
    const { default: db } = await import('../config/database.js');
    const [[r1]] = await db.execute('SELECT region_id FROM countries WHERE id = ? LIMIT 1', [from.country_id]);
    const [[r2]] = await db.execute('SELECT region_id FROM countries WHERE id = ? LIMIT 1', [to.country_id]);
    const [[nei]] = await db.execute('SELECT 1 AS ok FROM country_neighbors WHERE country_id = ? AND neighbor_country_id = ? LIMIT 1', [from.country_id, to.country_id]);
    const sameRegion = r1?.region_id && r2?.region_id && r1.region_id === r2.region_id;
    if (sameCountry) return Math.max(diffCfg.intra_min, 180); // mínimo 3h
    if (nei?.ok)   return Math.max(diffCfg.intra_min, 180);
    if (sameRegion) return diffCfg.intra_min;                  // intra-continente
    return diffCfg.inter_min;                                  // inter-continente
  } catch (e) {
    // 4) Fallback por distância com overheads por dificuldade
    const planeOver = diffCfg.plane_overhead;
    const carOver   = diffCfg.car_overhead;
    if (sameCountry) {
      const minutes = (km / CAR_SPEED_KMH) * 60 + carOver;
      return Math.ceil(minutes);
    } else {
      const minutes = (km / PLANE_SPEED_KMH) * 60 + planeOver;
      return Math.ceil(minutes);
    }
  }
}

// Helper: diferença de dias inteiros (>= 24h) entre deadline e current
function computeDaysEarly(deadlineUtc, finishUtc) {
  const diffMs = dayjs(deadlineUtc).valueOf() - dayjs(finishUtc).valueOf();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

// Consumo de tempo por ação (aplica janela de sono)
export async function consumeActionTime({ caseId, minutes, timezone = DEFAULT_TZ }) {
  const state = await getCaseTimeState(caseId);
  if (!state) throw new Error('Estado temporal do caso não encontrado');

  let current  = dayjs.tz(state.current_time, timezone);
  const deadline = dayjs.tz(state.deadline_time, timezone);

  let remaining = minutes;
  while (remaining > 0) {
    const hour = current.hour();
    if (hour >= SLEEP_START || hour < SLEEP_END) {
      if (hour >= SLEEP_START) {
        current = current.add(1, 'day').hour(SLEEP_END).minute(0).second(0);
      } else {
        current = current.hour(SLEEP_END).minute(0).second(0);
      }
      continue;
    }
    const untilSleep = dayjs(current).hour(SLEEP_START).minute(0).second(0);
    let chunk = Math.min(remaining, untilSleep.diff(current, 'minute'));
    if (chunk <= 0) {
      current = dayjs(current).hour(SLEEP_START).minute(0).second(0);
      continue;
    }
    current = current.add(chunk, 'minute');
    remaining -= chunk;
  }

  await upsertCaseTimeState({ caseId, currentTime: current.utc().toDate() });
  const failed = current.isAfter(deadline);
  return { currentTimeISO: current.utc().toISOString(), deadlineISO: deadline.utc().toISOString(), failed };
}

// Inicializa relógio do caso, calcula deadline por simulação + piso mínimo
// expectedRoute: [{ from, to, visits, investigateExtra }]
export async function startCaseClock({ caseId, difficulty = 'EASY', timezone = DEFAULT_TZ, expectedRoute = [] }) {
  // Derivar dificuldade do próprio caso quando possível
  try {
    const { default: db } = await import('../config/database.js');
    const [[row]] = await db.execute(
      'SELECT gd.code AS difficulty_code FROM active_cases ac JOIN game_difficulty gd ON gd.id = ac.difficulty_id WHERE ac.id = ? LIMIT 1',
      [caseId]
    );
    if (row?.difficulty_code) {
      difficulty = row.difficulty_code;
      console.log('[time] startCaseClock difficulty from case', { caseId, difficulty });
    }
  } catch (err) {
    console.warn('[time] startCaseClock: falha ao ler dificuldade do caso, usando parâmetro', String(err));
  }

  // Parâmetros por dificuldade
  let params = DEFAULT_DIFFICULTY_PARAMS[difficulty] || DEFAULT_DIFFICULTY_PARAMS.EASY;
  const dbParams = await getGameDifficultyByCode(difficulty);
  if (dbParams) {
    params = {
      maxFailsAllowed: Number(dbParams.max_fails_allowed ?? params.maxFailsAllowed),
      visitsBuffer: Number(dbParams.visits_buffer ?? params.visitsBuffer),
      shortcutSkips: difficulty === 'EXTREME' ? params.shortcutSkips : params.shortcutSkips,
    };
  }

  // (Opcional) consultar xp_rules
  try {
    const xpRule = await getXpRuleByDifficulty(difficulty);
    console.log('[time] xpRule for difficulty', difficulty, xpRule);
  } catch (e) {
    console.warn('[time] getXpRuleByDifficulty falhou (não crítico):', String(e));
  }

  // Segunda 08:00 da semana corrente (TZ)
  const now = dayjs.tz(new Date(), timezone);
  const start = now.startOf('week').add(1, 'day').hour(SLEEP_END).minute(0).second(0);

  // Simular consumo conforme rota esperada
  let simulatedMinutes = 0;
  for (const step of expectedRoute) {
    const travelMin = await estimateTravelMinutes({ fromCityId: step.from, toCityId: step.to, caseId });
    simulatedMinutes += travelMin;
    const visitsCount = Math.max(0, step.visits || 0);
    simulatedMinutes += visitsCount * 30; // VISIT_MINUTES = 30
    if (step.investigateExtra) simulatedMinutes += 15; // INVESTIGATE_EXTRA_MIN = 15
  }

  // Política por dificuldade
  if (difficulty === 'EASY') {
    simulatedMinutes += params.maxFailsAllowed * 90; // custo médio de erro
    simulatedMinutes += params.visitsBuffer * 30;
  } else if (difficulty === 'HARD') {
    simulatedMinutes += Math.max(0, (params.visitsBuffer || 0) * 30);
  } else if (difficulty === 'EXTREME') {
    const skipCount = Math.min(params.shortcutSkips, expectedRoute.length);
    simulatedMinutes = Math.max(0, simulatedMinutes - skipCount * 30);
  }

  // deadline = start + simulatedMinutes (respeitando sono)
  let currentDeadline = start;
  let remaining = simulatedMinutes;
  while (remaining > 0) {
    const hour = currentDeadline.hour();
    if (hour >= SLEEP_START || hour < SLEEP_END) {
      if (hour >= SLEEP_START) {
        currentDeadline = currentDeadline.add(1, 'day').hour(SLEEP_END).minute(0).second(0);
      } else {
        currentDeadline = currentDeadline.hour(SLEEP_END).minute(0).second(0);
      }
      continue;
    }
    const untilSleep = dayjs(currentDeadline).hour(SLEEP_START).minute(0).second(0);
    let chunk = Math.min(remaining, untilSleep.diff(currentDeadline, 'minute'));
    if (chunk <= 0) {
      currentDeadline = dayjs(currentDeadline).hour(SLEEP_START).minute(0).second(0);
      continue;
    }
    currentDeadline = currentDeadline.add(chunk, 'minute');
    remaining -= chunk;
  }

  // Aplicar piso mínimo por dificuldade
  const minDays = MIN_DEADLINE_DAYS[difficulty] ?? MIN_DEADLINE_DAYS.EASY;
  const deadlineFloor = start.add(minDays, 'day').hour(SLEEP_START).minute(0).second(0);
  if (currentDeadline.isBefore(deadlineFloor)) currentDeadline = deadlineFloor;

  const deadline = currentDeadline;

  await upsertCaseTimeState({
    caseId,
    startTime:   start.utc().toDate(),
    deadlineTime: deadline.utc().toDate(),
    currentTime:  start.utc().toDate(),
    timezone,
  });

  return { startTimeISO: start.utc().toISOString(), deadlineTimeISO: deadline.utc().toISOString(), simulatedMinutes };
}

// Sumário coerente para relatórios (ISO UTC + daysEarly)
export async function getCaseTimeSummary({ caseId, timezone = DEFAULT_TZ }) {
  const state = await getCaseTimeState(caseId);
  if (!state) throw new Error('Estado temporal do caso não encontrado');
  const start    = dayjs.tz(state.start_time,    timezone).utc();
  const deadline = dayjs.tz(state.deadline_time, timezone).utc();
  const current  = dayjs.tz(state.current_time,  timezone).utc();
  const daysEarly = computeDaysEarly(deadline, current);
  return {
    start_time:    start.toISOString(),
    deadline_time: deadline.toISOString(),
    current_time:  current.toISOString(),
    daysEarly,
  };
}
