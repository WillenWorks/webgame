// src/domain/xp.rules.js
// Regras puras de cálculo de XP — SEM acesso a banco.
// Extraído de xp.service.js para testes unitários determinísticos.

/**
 * Balanceamento por dificuldade (EASY / HARD / EXTREME).
 * - bônus por dia adiantado: perDay * fator, com teto de dias (capDays)
 * - atenuação por erros de rota em HARD/EXTREME: bonusDays *= max(0.5, 1 - 0.15*routeErrors)
 * - bônus de skip: só com precisão perfeita, com teto percentual por dificuldade
 */
export const PER_DAY_BONUS = { EASY: 30, HARD: 60, EXTREME: 70 };
export const CAP_DAYS = { EASY: 2, HARD: 3, EXTREME: 3 };
export const DIFFICULTY_DAY_FACTOR = { EASY: 0.8, HARD: 0.9, EXTREME: 1.0 };
export const SKIP_CAP = { EASY: 0.15, HARD: 0.18, EXTREME: 0.2 };

/**
 * @param {object} params
 * @param {{ xp_base:number, bonus_precision?:number, debuff_failure_factor?:number }} params.xpRule
 * @param {{ debuff_base_factor?:number, bonus_multiplier?:number }} params.multipliers
 * @param {'EASY'|'HARD'|'EXTREME'} params.difficulty
 * @param {number} params.reputationScore
 * @param {{ finished:boolean, routeErrors?:number, perfectPrecision?:boolean }} params.performance
 * @param {number} [params.daysEarly]
 * @param {number} [params.placesSkippedPct]
 * @returns {{ xpFinal:number, breakdown:object }}
 */
export function computeXpBreakdown({
  xpRule,
  multipliers,
  difficulty,
  reputationScore,
  performance,
  daysEarly = 0,
  placesSkippedPct = 0,
}) {
  const mult = multipliers || {};
  const perf = performance || {};

  const xpBaseRaw = Number(xpRule?.xp_base || 0);
  let xpBase = xpBaseRaw;
  let appliedDebuffBase = null;

  // Penalidade de base quando o caso não foi concluído.
  if (!perf.finished) {
    const df = Number(xpRule?.debuff_failure_factor ?? 1.0);
    const repDebuff = Number(mult.debuff_base_factor ?? 1.0);
    xpBase = Math.round(xpBaseRaw * df * repDebuff);
    appliedDebuffBase = { debuff_failure_factor: df, debuff_base_factor: repDebuff };
  }

  // Bônus por dias adiantados.
  const perDay = PER_DAY_BONUS[difficulty] ?? PER_DAY_BONUS.EASY;
  const capDays = CAP_DAYS[difficulty] ?? CAP_DAYS.EASY;
  const effDays = Math.max(0, Math.min(Number(daysEarly) || 0, capDays));
  let bonusDays = Math.round(effDays * perDay * (DIFFICULTY_DAY_FACTOR[difficulty] ?? 1.0));
  if (difficulty !== 'EASY') {
    const re = Number(perf.routeErrors || 0);
    const atten = Math.max(0.5, 1 - 0.15 * re);
    bonusDays = Math.round(bonusDays * atten);
  }

  // Bônus de skip (eficiência) — só com precisão perfeita e com teto por dificuldade.
  const skipCap = SKIP_CAP[difficulty] ?? 0.2;
  const effSkipPct = perf.perfectPrecision
    ? Math.min(Math.max(Number(placesSkippedPct) || 0, 0), skipCap)
    : 0;
  let bonusSkip = 0;
  if (effSkipPct > 0) {
    bonusSkip = Math.round(xpBase * effSkipPct * Number(mult.bonus_multiplier ?? 1.0));
  }

  // Bônus intrínseco de precisão.
  let bonusPrecision = 0;
  if (perf.perfectPrecision) {
    bonusPrecision = Math.round(Number(xpRule?.bonus_precision ?? 0) * Number(mult.bonus_multiplier ?? 1.0));
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
      ...(appliedDebuffBase
        ? { debuff_base_factor: Number(appliedDebuffBase.debuff_base_factor).toFixed(2) }
        : {}),
    },
  };

  return { xpFinal, breakdown };
}

/**
 * Minutos inteiros de antecedência entre o deadline e a conclusão. Nunca negativo.
 */
export function finishedEarlierMinutes(deadline, finish) {
  const diffMs = new Date(deadline).getTime() - new Date(finish).getTime();
  if (!Number.isFinite(diffMs) || diffMs <= 0) return 0;
  return Math.floor(diffMs / 60000);
}

/**
 * Monta o objeto de performance do caso a partir do desfecho e dos números
 * reais rastreados (erros de rota, tempo). Puro e testável.
 * @returns {{ finished:boolean, routeErrors:number, perfectPrecision:boolean, finishedEarlierMinutes:number }}
 */
export function buildPerformance({ status, routeErrors = 0, deadlineISO, finishISO }) {
  const finished = status === 'SOLVED';
  const errs = Math.max(0, Number(routeErrors) || 0);
  return {
    finished,
    routeErrors: errs,
    perfectPrecision: finished && errs === 0,
    finishedEarlierMinutes: finished ? finishedEarlierMinutes(deadlineISO, finishISO) : 0,
  };
}

/**
 * Patente correspondente a um total de XP, dada a tabela de ranks.
 * `ranks` deve conter { id, title, min_xp } — a maior patente cujo min_xp <= xp.
 */
export function rankForXp(xp, ranks) {
  const sorted = [...(ranks || [])].sort((a, b) => (a.min_xp ?? 0) - (b.min_xp ?? 0));
  let chosen = sorted[0] || null;
  for (const r of sorted) {
    if ((Number(xp) || 0) >= (r.min_xp ?? 0)) chosen = r;
    else break;
  }
  return chosen;
}

/**
 * Houve promoção? Retorna a nova patente quando `rankForXp(newXp)` difere da atual.
 */
export function evaluatePromotion({ currentRankId, newXp, ranks }) {
  const target = rankForXp(newXp, ranks);
  const promoted = !!target && target.id !== currentRankId;
  return { promoted, rank: target, rankId: target?.id ?? currentRankId ?? null };
}
