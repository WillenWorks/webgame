// src/services/xp.service.js (ESM)
// Cálculo de XP final com bônus/debuff por reputação e desempenho

import { getXpRuleByDifficulty } from '../repositories/xp_rules.repo.js';
import { getReputationMultipliers } from '../repositories/reputation_rules.repo.js';
import { insertXpHistory } from '../repositories/player_xp_history.repo.js';

export async function computeXP({ playerId, caseId, difficulty, reputationScore, performance }) {
  console.log('[xp] difficulty recebido', difficulty);
  // performance: { finished: boolean, routeErrors: number, finishedEarlierMinutes: number, perfectPrecision: boolean }
  const xpRule = await getXpRuleByDifficulty(difficulty); // { xp_base, bonus_time_factor, bonus_precision, debuff_failure_factor }
  console.log('[xp] xpRule', xpRule);
  const mult = await getReputationMultipliers(reputationScore); // { debuff_base_factor, bonus_multiplier }

  let xpBase = xpRule.xp_base;
  if (!performance.finished) {
    xpBase = Math.round(xpBase * xpRule.debuff_failure_factor * mult.debuff_base_factor);
  } else {
    xpBase = Math.round(xpBase * mult.debuff_base_factor); // em rep baixa, reduz a base; neutra/alta = 1.0
  }

  let bonusTime = 0;
  if (performance.finishedEarlierMinutes && performance.finishedEarlierMinutes > 0) {
    bonusTime = Math.round(performance.finishedEarlierMinutes * xpRule.bonus_time_factor * mult.bonus_multiplier);
  }

  let bonusPrecision = 0;
  if (performance.perfectPrecision) {
    bonusPrecision = Math.round(xpRule.bonus_precision * mult.bonus_multiplier);
  }

  const xpFinal = xpBase + bonusTime + bonusPrecision;

  await insertXpHistory({
    playerId,
    caseId,
    xpAwarded: xpFinal,
    breakdown: {
      xpBase,
      bonusTime,
      bonusPrecision,
      difficulty,
      reputationScore,
      multipliers: mult,
    },
  });

  console.log('[xp] breakdown para insert', { xpBase, bonusTime, bonusPrecision, difficulty, reputationScore });
  return { xpFinal, xpBase, bonusTime, bonusPrecision };
}
