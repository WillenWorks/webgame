// src/domain/time.rules.js
// Regras puras de tempo in-game — SEM acesso a banco.
// Extraído de time.service.js para permitir testes unitários determinísticos.

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezonePlugin from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

// ── Janela de sono do detetive ──────────────────────────────────────────────
export const SLEEP_START = 23; // 23:00 — para de investigar
export const SLEEP_END = 8; //  08:00 — volta a campo

// ── Custos fixos de ação (minutos in-game) ─────────────────────────────────
export const VISIT_MINUTES = 30; // visitar um local do mapa
export const INVESTIGATE_MINUTES = 60; // interrogar / investigar um ponto-chave
export const INVESTIGATE_EXTRA_MIN = 15; // custo extra de investigação aprofundada

// ── Velocidades e overheads base de viagem ─────────────────────────────────
export const PLANE_SPEED_KMH = 800;
export const CAR_SPEED_KMH = 90;
const BASE_PLANE_OVERHEAD_MIN = 120; // 2h (embarque + traslados)
const BASE_CAR_OVERHEAD_MIN = 30; // 0.5h

// Overrides de tempo de viagem por dificuldade (elevação em HARD/EXTREME)
export const DIFF_TRAVEL_OVERRIDES = {
  EASY: { intra_min: 240, inter_min: 360, plane_overhead: BASE_PLANE_OVERHEAD_MIN, car_overhead: BASE_CAR_OVERHEAD_MIN },
  HARD: { intra_min: 330, inter_min: 480, plane_overhead: BASE_PLANE_OVERHEAD_MIN + 30, car_overhead: BASE_CAR_OVERHEAD_MIN + 15 },
  EXTREME: { intra_min: 360, inter_min: 600, plane_overhead: BASE_PLANE_OVERHEAD_MIN + 60, car_overhead: BASE_CAR_OVERHEAD_MIN + 30 },
};

function diffCfg(difficulty) {
  return DIFF_TRAVEL_OVERRIDES[difficulty] || DIFF_TRAVEL_OVERRIDES.EASY;
}

/**
 * Distância haversine em km entre dois pontos geográficos.
 */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180.0;
  const R = 6371; // raio médio da Terra (km)
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Avança o relógio in-game em `minutes`, respeitando a janela de sono:
 * entre SLEEP_START e SLEEP_END nenhum minuto de ação é consumido — o relógio
 * "pula" para as 08:00 do dia seguinte (ou do mesmo dia, na madrugada).
 *
 * @param {import('dayjs').Dayjs} from  instante inicial (dayjs, timezone preservada)
 * @param {number} minutes              minutos de ação a consumir (>= 0)
 * @param {{ sleepStart?: number, sleepEnd?: number }} [opts]
 * @returns {import('dayjs').Dayjs}     novo instante (dayjs) após o consumo
 */
export function advanceClock(from, minutes, { sleepStart = SLEEP_START, sleepEnd = SLEEP_END } = {}) {
  let current = from;
  let remaining = Math.max(0, Number(minutes) || 0);

  while (remaining > 0) {
    const hour = current.hour();

    // Dentro da janela de sono → pular para o próximo horário útil.
    if (hour >= sleepStart || hour < sleepEnd) {
      if (hour >= sleepStart) {
        current = current.add(1, 'day').hour(sleepEnd).minute(0).second(0);
      } else {
        current = current.hour(sleepEnd).minute(0).second(0);
      }
      continue;
    }

    const untilSleep = current.hour(sleepStart).minute(0).second(0);
    const chunk = Math.min(remaining, untilSleep.diff(current, 'minute'));
    if (chunk <= 0) {
      current = current.hour(sleepStart).minute(0).second(0);
      continue;
    }
    current = current.add(chunk, 'minute');
    remaining -= chunk;
  }

  return current;
}

/**
 * Dias inteiros (>= 24h) de antecedência entre o deadline e o instante de
 * conclusão. Nunca negativo.
 */
export function computeDaysEarly(deadline, finish) {
  const diffMs = dayjs(deadline).valueOf() - dayjs(finish).valueOf();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Classificação fictícia de tempo de viagem quando há dados de região/fronteira.
 * - mesma cidade-país ou países vizinhos → intra (piso de 3h)
 * - mesma região/continente             → intra
 * - inter-continente                    → inter
 */
export function classifyTravelMinutes({ sameCountry, isNeighbor, sameRegion, difficulty = 'EASY' }) {
  const cfg = diffCfg(difficulty);
  if (sameCountry) return Math.max(cfg.intra_min, 180);
  if (isNeighbor) return Math.max(cfg.intra_min, 180);
  if (sameRegion) return cfg.intra_min;
  return cfg.inter_min;
}

/**
 * Estimativa por distância (fallback quando não há região/fronteira no banco).
 * Carro dentro do mesmo país, avião caso contrário — com overhead por dificuldade.
 */
export function fallbackTravelMinutes({ km, sameCountry, difficulty = 'EASY' }) {
  const cfg = diffCfg(difficulty);
  if (sameCountry) {
    return Math.ceil((km / CAR_SPEED_KMH) * 60 + cfg.car_overhead);
  }
  return Math.ceil((km / PLANE_SPEED_KMH) * 60 + cfg.plane_overhead);
}
