// src/services/time.service.js (ESM)
// Lógica de tempo: sono 23h–8h, consumo por ação, viagem por lat/lng (haversine) + overrides
// Deadline 100% calculado por simulação conforme dificuldade (sem fixo em domingo 17h)

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezonePlugin from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// Config padrão (pode vir de config/index.js)
const DEFAULT_TZ = 'America/Sao_Paulo';
const SLEEP_START = 23; // 23:00
const SLEEP_END = 8;    // 08:00

// Velocidades e overheads
const PLANE_SPEED_KMH = 800;
const PLANE_OVERHEAD_MIN = 120; // 2h
const CAR_SPEED_KMH = 90;
const CAR_OVERHEAD_MIN = 30;    // 0.5h

// Parâmetros de visita/investigação (ajustáveis via DB/parâmetros)
const VISIT_MINUTES = 30;       // tempo base por visita a um place
const INVESTIGATE_EXTRA_MIN = 15; // opcional, pode ser 0

// Buffers por dificuldade (exemplos; ideal ler de game_difficulty/xp_rules)
const DEFAULT_DIFFICULTY_PARAMS = {
  EASY: { maxFailsAllowed: 3, visitsBuffer: 5, shortcutSkips: 0 },
  HARD: { maxFailsAllowed: 0, visitsBuffer: 1, shortcutSkips: 0 },
  EXTREME: { maxFailsAllowed: 0, visitsBuffer: 0, shortcutSkips: 2 }, // permite pular até 2 visitas/pistas
};

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

// Estima minutos de viagem entre cidades
export async function estimateTravelMinutes({ fromCityId, toCityId }) {
  // 1) Override
  const override = await getTravelOverrideMinutes(fromCityId, toCityId);
  if (override != null) return override;

  // 2) Buscar lat/lng
  const from = await getCityById(fromCityId); // { id, lat, lng, country_id }
  const to = await getCityById(toCityId);
  if (!from || !to) throw new Error('Cidade inválida para cálculo de viagem');

  const km = haversineKm(from.lat, from.lng, to.lat, to.lng);
  const sameCountry = from.country_id && to.country_id && from.country_id === to.country_id;

  if (sameCountry) {
    const minutes = (km / CAR_SPEED_KMH) * 60 + CAR_OVERHEAD_MIN;
    return Math.ceil(minutes);
  } else {
    const minutes = (km / PLANE_SPEED_KMH) * 60 + PLANE_OVERHEAD_MIN;
    return Math.ceil(minutes);
  }
}

// Aplica sono e consome minutos do relógio do caso
export async function consumeActionTime({ caseId, minutes, timezone = DEFAULT_TZ }) {
  const state = await getCaseTimeState(caseId);
  if (!state) throw new Error('Estado temporal do caso não encontrado');

  let current = dayjs.tz(state.current_time, timezone);
  const deadline = dayjs.tz(state.deadline_time, timezone);

  let remaining = minutes;
  while (remaining > 0) {
    const hour = current.hour();
    if (hour >= SLEEP_START || hour < SLEEP_END) {
      // dentro da janela de sono → avança até 08:00
      if (hour >= SLEEP_START) {
        current = current.add(1, 'day').hour(SLEEP_END).minute(0).second(0);
      } else {
        current = current.hour(SLEEP_END).minute(0).second(0);
      }
      continue; // não consome minutos enquanto dorme
    }

    // calcular quanto cabe até próximo sleep
    const untilSleep = dayjs(current).hour(SLEEP_START).minute(0).second(0);
    let chunk = Math.min(remaining, untilSleep.diff(current, 'minute'));
    if (chunk <= 0) {
      // cruzou a janela → força início de sono no próximo loop
      current = dayjs(current).hour(SLEEP_START).minute(0).second(0);
      continue;
    }

    // consome chunk
    current = current.add(chunk, 'minute');
    remaining -= chunk;
  }

  // Persistir novo current_time
  await upsertCaseTimeState({ caseId, currentTime: current.toDate() });

  // Verificar deadline
  const failed = current.isAfter(deadline);
  return { currentTime: current.toDate(), deadline: deadline.toDate(), failed };
}

// Inicializa relógio do caso (segunda 08:00), calcula deadline apenas pela simulação (sem fixo)
// expectedRoute: array de passos esperados, incluindo decoys quando aplicável
// cada passo: { from: cityId, to: cityId, visits: count, investigateExtra: boolean }
export async function startCaseClock({ caseId, difficulty = 'EASY', timezone = DEFAULT_TZ, expectedRoute = [] }) {
  let params = DEFAULT_DIFFICULTY_PARAMS[difficulty] || DEFAULT_DIFFICULTY_PARAMS.EASY;
  const dbParams = await getGameDifficultyByCode(difficulty);
  if (dbParams) {
    params = {
      maxFailsAllowed: Number(dbParams.max_fails_allowed ?? params.maxFailsAllowed),
      visitsBuffer: Number(dbParams.visits_buffer ?? params.visitsBuffer),
      shortcutSkips: difficulty === 'EXTREME' ? params.shortcutSkips : params.shortcutSkips,
    };
  }
  await getXpRuleByDifficulty(difficulty);

  // segunda 08:00 da semana corrente (TZ)
  const now = dayjs.tz(new Date(), timezone);
  const start = now.startOf('week').add(1, 'day').hour(SLEEP_END).minute(0).second(0); // segunda 08:00

  // Simular consumo conforme rota esperada (inclui viagens decoy e visitas previstas)
  let simulatedMinutes = 0;
  for (const step of expectedRoute) {
    const travelMin = await estimateTravelMinutes({ fromCityId: step.from, toCityId: step.to });
    simulatedMinutes += travelMin;

    const visitsCount = Math.max(0, step.visits || 0);
    simulatedMinutes += visitsCount * VISIT_MINUTES;

    if (step.investigateExtra) simulatedMinutes += INVESTIGATE_EXTRA_MIN;
  }

  // Aplicar política por dificuldade
  if (difficulty === 'EASY') {
    // incluir margem para falhas (rotas erradas) e visitas extras
    const avgFailCostMin = 90; // custo médio de um erro de rota (estimativa conservadora)
    simulatedMinutes += params.maxFailsAllowed * avgFailCostMin;
    simulatedMinutes += params.visitsBuffer * VISIT_MINUTES;
  } else if (difficulty === 'HARD') {
    // praticamente sem margem (rota perfeita)
    simulatedMinutes += Math.max(0, (params.visitsBuffer || 0) * VISIT_MINUTES);
  } else if (difficulty === 'EXTREME') {
    // otimizar: permitir pular até 2 pistas/visitas
    const skipCount = Math.min(params.shortcutSkips, expectedRoute.length);
    simulatedMinutes = Math.max(0, simulatedMinutes - skipCount * VISIT_MINUTES);
  }

  // deadline = start + simulatedMinutes (aplicando sono implicitamente no consumo durante o jogo)
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
const deadline = currentDeadline;

  await upsertCaseTimeState({
    caseId,
    startTime: start.toDate(),
    deadlineTime: deadline.toDate(),
    currentTime: start.toDate(),
    timezone,
  });

  return { startTime: start.toDate(), deadlineTime: deadline.toDate(), simulatedMinutes };
}
