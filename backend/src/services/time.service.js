// src/services/time.service.js (ESM)
// Lógica de tempo completa: sono, consumo por ação, viagem com overrides por dificuldade,
// deadline por simulação com piso mínimo, e sumário em ISO UTC.

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezonePlugin from 'dayjs/plugin/timezone.js';

import {
  advanceClock,
  computeDaysEarly,
  haversineKm,
  classifyTravelMinutes,
  fallbackTravelMinutes,
} from '../domain/time.rules.js';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// Config padrão
const DEFAULT_TZ = 'America/Sao_Paulo';
const SLEEP_START = 23; // 23:00
const SLEEP_END = 8;    // 08:00

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
import { getTravelOverrideMinutes } from '../repositories/travel_overrides.repo.js';
import { upsertCaseTimeState, getCaseTimeState } from '../repositories/case_time_state.repo.js';
import { getCaseDifficulty } from '../repositories/case.repo.js';
import { getCountryRegionId, isNeighborCountry } from '../repositories/world.repo.js';
import { deadlineModelFor, INVESTIGATE_MINUTES } from '../config/game.rules.js';

// Aux: obter label de dificuldade do caso
async function getCaseDifficultyLabel(caseId) {
  try {
    const code = await getCaseDifficulty(caseId);
    return code || 'EASY';
  } catch {
    return 'EASY';
  }
}

// Estima minutos de viagem entre cidades (ajustado por dificuldade do caso)
export async function estimateTravelMinutes(fromCityId, toCityId, caseId = null ) {

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

  // 3) Regions/neighbors para classificação fictícia
  try {
    const regionFrom = await getCountryRegionId(from.country_id);
    const regionTo = await getCountryRegionId(to.country_id);
    const isNeighbor = await isNeighborCountry(from.country_id, to.country_id);
    const sameRegion = regionFrom && regionTo && regionFrom === regionTo;
    return classifyTravelMinutes({ sameCountry, isNeighbor, sameRegion, difficulty: diffLabel });
  } catch (e) {
    // 4) Fallback por distância com overheads por dificuldade
    return fallbackTravelMinutes({ km, sameCountry, difficulty: diffLabel });
  }
}

// Consumo de tempo por ação (aplica janela de sono)
export async function consumeActionTime({ caseId, minutes, timezone = DEFAULT_TZ }) {
  const state = await getCaseTimeState(caseId);
  if (!state) throw new Error('Estado temporal do caso não encontrado');

  const deadline = dayjs.tz(state.deadline_time, timezone);
  const current = advanceClock(dayjs.tz(state.current_time, timezone), minutes);

  await upsertCaseTimeState({ caseId, currentTime: current.utc().toDate() });
  const failed = current.isAfter(deadline);
  return { currentTimeISO: current.utc().toISOString(), deadlineISO: deadline.utc().toISOString(), failed };
}

// Inicializa relógio do caso, calcula deadline por simulação + piso mínimo
// expectedRoute: [{ from, to, visits, investigateExtra }]
export async function startCaseClock({ caseId, difficulty = 'EASY', timezone = DEFAULT_TZ, expectedRoute = [] }) {
  // Derivar dificuldade do próprio caso quando possível
  try {
    const code = await getCaseDifficulty(caseId);
    if (code) difficulty = code;
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
      shortcutSkips: params.shortcutSkips,
    };
  }

  // Segunda 08:00 da semana corrente (TZ)
  const now = dayjs.tz(new Date(), timezone);
  const start = now.startOf('week').add(1, 'day').hour(SLEEP_END).minute(0).second(0);

  // Simular consumo: viagens reais + investigações esperadas por cidade + folga.
  // Cada investigação custa INVESTIGATE_MINUTES (mesmo custo cobrado no gameplay).
  void params;
  const model = deadlineModelFor(difficulty);
  let simulatedMinutes = 0;
  for (const step of expectedRoute) {
    simulatedMinutes += await estimateTravelMinutes(step.from, step.to, caseId);
  }
  const cityCount = expectedRoute.length + 1;
  simulatedMinutes += cityCount * model.investigationsPerCity * INVESTIGATE_MINUTES;
  simulatedMinutes += model.bufferHours * 60;

  // deadline = start + simulatedMinutes (respeitando sono)
  let currentDeadline = advanceClock(start, simulatedMinutes);

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

// Sumário coerente para relatórios (ISO UTC + dias adiantados / restantes).
// `days_remaining` vai pronto para o front (GameClock) — antes era derivado lá.
export async function getCaseTimeSummary({ caseId, timezone = DEFAULT_TZ }) {
  const state = await getCaseTimeState(caseId);
  if (!state) throw new Error('Estado temporal do caso não encontrado');
  const start    = dayjs.tz(state.start_time,    timezone).utc();
  const deadline = dayjs.tz(state.deadline_time, timezone).utc();
  const current  = dayjs.tz(state.current_time,  timezone).utc();
  const daysEarly = computeDaysEarly(deadline, current);
  const days_remaining = Math.max(0, Math.ceil((deadline.valueOf() - current.valueOf()) / 86_400_000));
  return {
    start_time:    start.toISOString(),
    deadline_time: deadline.toISOString(),
    current_time:  current.toISOString(),
    daysEarly,
    days_remaining,
  };
}
