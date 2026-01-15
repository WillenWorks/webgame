// src/services/xp.service.js (ESM)
// Cálculo de XP final com bônus por dias adiantados e eficiência (skip), com caps e antifraude

import { getXpRuleByDifficulty } from '../repositories/xp_rules.repo.js';
import { getReputationMultipliers } from '../repositories/reputation_rules.repo.js';
import { insertXpHistory } from '../repositories/player_xp_history.repo.js';

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

  const xpBaseRaw = Number(xpRule.xp_base || 0);
  let xpBase = xpBaseRaw;
  let appliedDebuffBase = null;
  if (!performance.finished) {
    const df = Number(xpRule.debuff_failure_factor ?? 1.0);
    const repDebuff = Number(mult.debuff_base_factor ?? 1.0);
    xpBase = Math.round(xpBaseRaw * df * repDebuff);
    appliedDebuffBase = { debuff_failure_factor: df, debuff_base_factor: repDebuff };
  }

  // Bônus por dias – parâmetros por dificuldade
  const PER_DAY_BONUS = { EASY: 30, HARD: 60, EXTREME: 70 };
  const CAP_DAYS = { EASY: 2, HARD: 3, EXTREME: 3 };
  const DIFFICULTY_DAY_FACTOR = { EASY: 0.8, HARD: 0.9, EXTREME: 1.0 };
  const perDay = PER_DAY_BONUS[difficulty] ?? PER_DAY_BONUS.EASY;
  const capDays = CAP_DAYS[difficulty] ?? CAP_DAYS.EASY;
  const effDays = Math.max(0, Math.min(Number(daysEarly) || 0, capDays));
  let bonusDays = Math.round(effDays * perDay * (DIFFICULTY_DAY_FACTOR[difficulty] ?? 1.0));
  // Atenuar por erros de rota em HARD/EXTREME
  if (difficulty !== 'EASY') {
    const re = Number(performance.routeErrors || 0);
    const atten = Math.max(0.5, 1 - 0.15 * re);
    bonusDays = Math.round(bonusDays * atten);
  }

  // Bônus de skip com cap por dificuldade
  const SKIP_CAP = { EASY: 0.15, HARD: 0.18, EXTREME: 0.20 };
  const skipCap = SKIP_CAP[difficulty] ?? 0.20;
  const effSkipPct = performance.perfectPrecision ? Math.min(Math.max(Number(placesSkippedPct) || 0, 0), skipCap) : 0;
  let bonusSkip = 0;
  if (effSkipPct > 0) {
    bonusSkip = Math.round(xpBase * effSkipPct * Number(mult.bonus_multiplier ?? 1.0));
  }

  // Bônus de precisão intrínseco
  let bonusPrecision = 0;
  if (performance.perfectPrecision) {
    bonusPrecision = Math.round(Number(xpRule.bonus_precision ?? 0) * Number(mult.bonus_multiplier ?? 1.0));
  }

  const xpFinal = xpBase + bonusDays + bonusPrecision + bonusSkip;

  const breakdown = {
    xpBase,
    bonusDays,
    bonusPrecision,
    bonusSkip,
    daysEarly: effDays,
    placesSkippedBonusPct: effSkipPct,
    difficulty,
    reputationScore,
    multipliers: {
      bonus_multiplier: Number(mult.bonus_multiplier ?? 1.0).toFixed(2),
      ...(appliedDebuffBase ? { debuff_base_factor: Number(appliedDebuffBase.debuff_base_factor).toFixed(2) } : {}),
    },
  };

  await insertXpHistory({ playerId, caseId, xpAwarded: xpFinal, breakdown });
  console.log('[xp] breakdown para insert', breakdown);
  return { xpFinal, ...breakdown };
}
