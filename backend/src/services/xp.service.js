// src/services/xp.service.js (ESM)
// Cálculo de XP final com bônus por dias adiantados e eficiência (skip), com caps e antifraude

import { getXpRuleByDifficulty } from '../repositories/xp_rules.repo.js';
import { getReputationMultipliers } from '../repositories/reputation_rules.repo.js';
import { insertXpHistory } from '../repositories/player_xp_history.repo.js';
import { computeXpBreakdown } from '../domain/xp.rules.js';

/**
 * Balanceamento por dificuldade (EASY/HARD/EXTREME):
 * - EASY: perDay=30, cap=2, factor=0.8 (já aplicado)
 * - HARD: perDay=60, cap=3, factor=0.9
 * - EXTREME: perDay=70, cap=3, factor=1.0
 * - Atenuação por erros de rota (HARD/EXTREME): bonusDays *= max(0.5, 1 - 0.15*routeErrors)
 * - Cap de bonusSkip por dificuldade: EASY=0.15, HARD=0.18, EXTREME=0.20
 */
export async function computeXP({ playerId, caseId, difficulty, reputationScore, performance, daysEarly = 0, placesSkippedPct = 0 }) {
  console.log('[xp] difficulty recebido', difficulty);
  let xpRule = await getXpRuleByDifficulty(difficulty);
  if (!xpRule) {
    console.warn('[xp] xpRule não encontrada para', difficulty, '- usando EASY como fallback');
    xpRule = await getXpRuleByDifficulty('EASY');
  }
  console.log('[xp] xpRule', xpRule);
  const mult = await getReputationMultipliers(reputationScore); // { debuff_base_factor, bonus_multiplier }

  const { xpFinal, breakdown } = computeXpBreakdown({
    xpRule,
    multipliers: mult,
    difficulty,
    reputationScore,
    performance,
    daysEarly,
    placesSkippedPct,
  });

  await insertXpHistory({ playerId, caseId, xpAwarded: xpFinal, breakdown });
  console.log('[xp] breakdown para insert', breakdown);
  return { xpFinal, ...breakdown };
}
