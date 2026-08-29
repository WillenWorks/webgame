import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeXpBreakdown,
  rankForXp,
  evaluatePromotion,
} from '../src/domain/xp.rules.js';

const XP_RULE = { xp_base: 100, bonus_precision: 50, debuff_failure_factor: 0.5 };
const MULT = { debuff_base_factor: 0.9, bonus_multiplier: 1.2 };

describe('computeXpBreakdown — cálculo de XP', () => {
  it('caso resolvido com precisão perfeita (EASY): base + dias + precisão + skip', () => {
    const { xpFinal, breakdown } = computeXpBreakdown({
      xpRule: XP_RULE,
      multipliers: MULT,
      difficulty: 'EASY',
      reputationScore: 0,
      performance: { finished: true, perfectPrecision: true, routeErrors: 0 },
      daysEarly: 5,
      placesSkippedPct: 0.3,
    });

    // xpBase 100 (finished, sem debuff)
    // bonusDays: effDays = min(5, cap 2) = 2 → round(2*30*0.8) = 48
    // bonusSkip: effSkipPct = min(0.30, cap 0.15) = 0.15 → round(100*0.15*1.2) = 18
    // bonusPrecision: round(50*1.2) = 60
    assert.equal(breakdown.xpBase, 100);
    assert.equal(breakdown.bonusDays, 48);
    assert.equal(breakdown.bonusSkip, 18);
    assert.equal(breakdown.bonusPrecision, 60);
    assert.equal(breakdown.daysEarly, 2);
    assert.equal(breakdown.placesSkippedBonusPct, 0.15);
    assert.equal(xpFinal, 226);
    assert.equal(breakdown.multipliers.bonus_multiplier, '1.20');
    assert.ok(!('debuff_base_factor' in breakdown.multipliers));
  });

  it('caso falho (HARD) aplica debuff de base e atenua bônus de dias por erros de rota', () => {
    const { xpFinal, breakdown } = computeXpBreakdown({
      xpRule: XP_RULE,
      multipliers: MULT,
      difficulty: 'HARD',
      reputationScore: -20,
      performance: { finished: false, perfectPrecision: false, routeErrors: 2 },
      daysEarly: 3,
      placesSkippedPct: 0.5,
    });

    // xpBase = round(100 * 0.5 * 0.9) = 45
    // bonusDays: effDays = min(3, cap 3) = 3 → round(3*60*0.9) = 162
    //           atten = max(0.5, 1 - 0.15*2) = 0.7 → round(162*0.7) = 113
    // sem precisão → bonusSkip 0, bonusPrecision 0
    assert.equal(breakdown.xpBase, 45);
    assert.equal(breakdown.bonusDays, 113);
    assert.equal(breakdown.bonusSkip, 0);
    assert.equal(breakdown.bonusPrecision, 0);
    assert.equal(xpFinal, 158);
    assert.equal(breakdown.multipliers.debuff_base_factor, '0.90');
  });

  it('sem xpRule e sem antecedência → XP zero, sem quebrar', () => {
    const { xpFinal, breakdown } = computeXpBreakdown({
      xpRule: null,
      multipliers: null,
      difficulty: 'EASY',
      reputationScore: 0,
      performance: { finished: true, perfectPrecision: true },
      daysEarly: 0,
    });
    assert.equal(xpFinal, 0);
    assert.equal(breakdown.xpBase, 0);
    assert.equal(breakdown.bonusPrecision, 0);
  });

  it('daysEarly negativo é tratado como 0', () => {
    const { breakdown } = computeXpBreakdown({
      xpRule: XP_RULE,
      multipliers: MULT,
      difficulty: 'EASY',
      reputationScore: 0,
      performance: { finished: true },
      daysEarly: -4,
    });
    assert.equal(breakdown.daysEarly, 0);
    assert.equal(breakdown.bonusDays, 0);
  });
});

describe('rankForXp / evaluatePromotion — evolução de patente', () => {
  const RANKS = [
    { id: 3, title: 'Investigador', min_xp: 500 },
    { id: 1, title: 'Recruta', min_xp: 0 },
    { id: 2, title: 'Agente', min_xp: 100 },
  ];

  it('escolhe a maior patente cujo min_xp <= xp (aceita lista desordenada)', () => {
    assert.equal(rankForXp(0, RANKS).id, 1);
    assert.equal(rankForXp(99, RANKS).id, 1);
    assert.equal(rankForXp(100, RANKS).id, 2);
    assert.equal(rankForXp(499, RANKS).id, 2);
    assert.equal(rankForXp(500, RANKS).id, 3);
    assert.equal(rankForXp(999999, RANKS).id, 3);
  });

  it('detecta promoção quando o XP cruza o limiar', () => {
    const r = evaluatePromotion({ currentRankId: 1, newXp: 150, ranks: RANKS });
    assert.equal(r.promoted, true);
    assert.equal(r.rankId, 2);
    assert.equal(r.rank.title, 'Agente');
  });

  it('não promove quando permanece na mesma faixa', () => {
    const r = evaluatePromotion({ currentRankId: 2, newXp: 150, ranks: RANKS });
    assert.equal(r.promoted, false);
    assert.equal(r.rankId, 2);
  });
});
