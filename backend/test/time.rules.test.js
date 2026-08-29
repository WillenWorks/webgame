import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';

import {
  advanceClock,
  computeDaysEarly,
  haversineKm,
  classifyTravelMinutes,
  fallbackTravelMinutes,
  SLEEP_START,
  SLEEP_END,
} from '../src/domain/time.rules.js';

dayjs.extend(utc);

const at = (iso) => dayjs.utc(iso);

describe('advanceClock — avanço de tempo in-game (viagem e visita)', () => {
  it('consome minutos normalmente dentro da janela de trabalho', () => {
    const out = advanceClock(at('2026-01-05T10:00:00Z'), 60);
    assert.equal(out.toISOString(), '2026-01-05T11:00:00.000Z');
  });

  it('não altera o relógio quando minutes = 0', () => {
    const start = at('2026-01-05T10:00:00Z');
    assert.equal(advanceClock(start, 0).toISOString(), start.toISOString());
  });

  it('pula a janela noturna: 22:30 + 60min de ação → 08:30 do dia seguinte', () => {
    // 22:30 → 23:00 (30min) → dorme → 08:00 → 08:30 (30min restantes)
    const out = advanceClock(at('2026-01-05T22:30:00Z'), 60);
    assert.equal(out.toISOString(), '2026-01-06T08:30:00.000Z');
  });

  it('madrugada: 03:00 + 30min → 08:30 do mesmo dia', () => {
    const out = advanceClock(at('2026-01-05T03:00:00Z'), 30);
    assert.equal(out.toISOString(), '2026-01-05T08:30:00.000Z');
  });

  it('uma visita (30min) e uma investigação (60min) somam 90min de relógio', () => {
    const afterVisit = advanceClock(at('2026-01-05T09:00:00Z'), 30);
    const afterInvestigate = advanceClock(afterVisit, 60);
    assert.equal(afterInvestigate.toISOString(), '2026-01-05T10:30:00.000Z');
  });

  it('respeita janela de sono customizada', () => {
    const out = advanceClock(at('2026-01-05T12:00:00Z'), 30, { sleepStart: 12, sleepEnd: SLEEP_END });
    // hora 12 já é sono → pula para 08:00 do dia seguinte, depois +30
    assert.equal(out.toISOString(), '2026-01-06T08:30:00.000Z');
  });

  it('constantes de janela de sono expostas', () => {
    assert.equal(SLEEP_START, 23);
    assert.equal(SLEEP_END, 8);
  });
});

describe('computeDaysEarly — antecedência em dias inteiros', () => {
  it('3 dias completos de folga', () => {
    assert.equal(computeDaysEarly('2026-01-10T00:00:00Z', '2026-01-07T00:00:00Z'), 3);
  });

  it('arredonda para baixo (2d23h → 2)', () => {
    assert.equal(computeDaysEarly('2026-01-10T00:00:00Z', '2026-01-07T01:00:00Z'), 2);
  });

  it('nunca negativo quando estourou o prazo', () => {
    assert.equal(computeDaysEarly('2026-01-05T00:00:00Z', '2026-01-10T00:00:00Z'), 0);
  });

  it('exatamente no prazo → 0', () => {
    assert.equal(computeDaysEarly('2026-01-10T00:00:00Z', '2026-01-10T00:00:00Z'), 0);
  });
});

describe('classifyTravelMinutes — buckets fictícios por dificuldade', () => {
  it('mesma região em HARD usa intra_min (330)', () => {
    assert.equal(classifyTravelMinutes({ sameRegion: true, difficulty: 'HARD' }), 330);
  });

  it('inter-continente em HARD usa inter_min (480)', () => {
    assert.equal(classifyTravelMinutes({ difficulty: 'HARD' }), 480);
  });

  it('mesmo país tem piso de 180min mesmo com intra_min menor', () => {
    // não há dificuldade com intra_min < 180, mas a regra do piso deve valer
    assert.equal(classifyTravelMinutes({ sameCountry: true, difficulty: 'EASY' }), 240);
  });

  it('vizinho de fronteira é tratado como intra (piso 180)', () => {
    assert.equal(classifyTravelMinutes({ isNeighbor: true, difficulty: 'EXTREME' }), 360);
  });

  it('dificuldade desconhecida cai em EASY', () => {
    assert.equal(classifyTravelMinutes({ difficulty: 'NOPE' }), 360);
  });
});

describe('fallbackTravelMinutes — estimativa por distância', () => {
  it('mesmo país → carro + overhead', () => {
    assert.equal(fallbackTravelMinutes({ km: 90, sameCountry: true, difficulty: 'EASY' }), 90);
  });

  it('internacional → avião + overhead de 2h', () => {
    // 900km / 800kmh * 60 = 67.5 + 120 = 187.5 → ceil 188
    assert.equal(fallbackTravelMinutes({ km: 900, sameCountry: false, difficulty: 'EASY' }), 188);
  });

  it('overhead maior em EXTREME', () => {
    // EXTREME plane_overhead = 180
    assert.equal(fallbackTravelMinutes({ km: 0, sameCountry: false, difficulty: 'EXTREME' }), 180);
  });
});

describe('haversineKm — distância geográfica', () => {
  it('mesmo ponto → 0', () => {
    assert.equal(haversineKm(10, 20, 10, 20), 0);
  });

  it('Londres → Paris ≈ 343 km', () => {
    const km = haversineKm(51.5074, -0.1278, 48.8566, 2.3522);
    assert.ok(km > 340 && km < 346, `esperado ~343, obtido ${km}`);
  });
});
