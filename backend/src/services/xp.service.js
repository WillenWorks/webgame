// src/services/xp.service.js (ESM)
// Cálculo de XP final com bônus por dias adiantados e eficiência (skip), com caps e antifraude

import { getXpRuleByDifficulty } from '../repositories/xp_rules.repo.js';
import { getReputationMultipliers } from '../repositories/reputation_rules.repo.js';
import { insertXpHistory } from '../repositories/player_xp_history.repo.js';

export async function computeXP({ playerId, caseId, difficulty, reputationScore, performance, daysEarly = 0, placesSkippedPct = 0 }) {
  console.log('[xp] difficulty recebido', difficulty);
  // performance: { finished: boolean, routeErrors: number, finishedEarlierMinutes: number, perfectPrecision: boolean }
  let xpRule = await getXpRuleByDifficulty(difficulty); // { xp_base, bonus_time_factor, bonus_precision, debuff_failure_factor }
  if (!xpRule) {
    console.warn('[xp] xpRule não encontrada para', difficulty, '- usando EASY como fallback');
    xpRule = await getXpRuleByDifficulty('EASY');
  }
  console.log('[xp] xpRule', xpRule);
  const mult = await getReputationMultipliers(reputationScore); // { debuff_base_factor, bonus_multiplier }

  // Base com multiplicadores de reputação
  const xpBaseRaw = xpRule.xp_base;
  let xpBase = xpBaseRaw;
  if (!performance.finished) {
    xpBase = Math.round(xpBaseRaw * xpRule.debuff_failure_factor * (mult.debuff_base_factor ?? 1.0));
  } else {
    xpBase = Math.round(xpBaseRaw * (mult.debuff_base_factor ?? 1.0));
  }

  // Bônus por dias adiantados (cap por dificuldade)
  const PER_DAY_BONUS = { EASY: 50, HARD: 100, EXTREME: 150 };
  const CAP_DAYS = { EASY: 3, HARD: 4, EXTREME: 5 };
  const perDay = PER_DAY_BONUS[difficulty] ?? 50;
  const capDays = CAP_DAYS[difficulty] ?? 3;
  const effDays = Math.max(0, Math.min(Number(daysEarly) || 0, capDays));
  let bonusDays = Math.round(effDays * perDay);

  // Bônus de precisão por locais não visitados (apenas com perfectPrecision), cap 20%
  const effSkipPct = performance.perfectPrecision ? Math.min(Math.max(Number(placesSkippedPct) || 0, 0), 0.20) : 0;
  let bonusSkip = 0;
  if (effSkipPct > 0) {
    bonusSkip = Math.round(xpBaseRaw * effSkipPct * (mult.bonus_multiplier ?? 1.0));
  }

  // Bônus de precisão intrínseco da dificuldade
  let bonusPrecision = 0;
  if (performance.perfectPrecision) {
    bonusPrecision = Math.round(xpRule.bonus_precision * (mult.bonus_multiplier ?? 1.0));
  }

  const xpFinal = xpBase + bonusDays + bonusPrecision + bonusSkip;

  await insertXpHistory({
    playerId,
    caseId,
    xpAwarded: xpFinal,
    breakdown: {
      xpBase,
      bonusDays,
      bonusPrecision,
      bonusSkip,
      daysEarly: effDays,
      placesSkippedBonusPct: effSkipPct,
      difficulty,
      reputationScore,
      multipliers: mult,
    },
  });

  console.log('[xp] breakdown para insert', { xpBase, bonusDays, bonusPrecision, bonusSkip, daysEarly: effDays, placesSkippedBonusPct: effSkipPct, difficulty, reputationScore });
  return { xpFinal, xpBase, bonusDays, bonusPrecision, bonusSkip, daysEarly: effDays, placesSkippedBonusPct: effSkipPct };
}
