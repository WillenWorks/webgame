// src/services/finish_case.service.js
import { v4 as uuid } from 'uuid';
import { solveCase, getCaseById } from '../repositories/warrant.repo.js';
import { getCaseDifficulty } from '../repositories/case.repo.js';
import { findProfileById, updateProfileStats, updateProfileRank } from '../repositories/profile.repo.js';
import { getAllRanks } from '../repositories/ranks.repo.js';
import { upsertPlayerReputation } from '../repositories/player_reputation.repo.js';
import { insertProfileStatsHistory } from '../repositories/profile_stats_history.repo.js';
import { insertCasePerformance } from '../repositories/case_performance.repo.js';
import { countRouteErrors } from '../repositories/travel_log.repo.js';
import { countCluesForCase } from '../repositories/clue.repo.js';
import { computeXP } from './xp.service.js';
import { getCaseTimeSummary } from './time.service.js';
import { buildPerformance, evaluatePromotion } from '../domain/xp.rules.js';
import { reputationDeltaFor, clampReputation } from '../config/game.rules.js';

/**
 * Encerra um caso (SOLVED ou FAILED) e consolida a progressão do perfil com
 * métricas REAIS: dias adiantados, erros de rota, precisão, XP com bônus de
 * tempo, delta de reputação por dificuldade, linha em `case_performance` e
 * checagem de promoção de patente.
 */
export async function finishCaseService({ caseId, status, finalDialogue, timeState }) {
  await solveCase(caseId, status);

  const gameCase = await getCaseById(caseId);
  if (!gameCase) throw new Error('Case not found');
  const profileId = gameCase.profile_id;
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Profile not found');

  const difficulty = (await getCaseDifficulty(caseId)) || 'EASY';
  const solved = status === 'SOLVED';

  // ── Métricas reais ────────────────────────────────────────────────────
  const summary = timeState || (await getCaseTimeSummary({ caseId }));
  const routeErrors = await countRouteErrors(caseId);
  const visitsCount = await countCluesForCase(caseId);

  const performance = buildPerformance({
    status,
    routeErrors,
    deadlineISO: summary?.deadline_time,
    finishISO: summary?.current_time,
  });
  const daysEarly = Number(summary?.daysEarly) || 0;

  // ── XP (com bônus de dias adiantados / precisão) ──────────────────────
  const xpResult = await computeXP({
    playerId: profileId,
    caseId,
    difficulty,
    reputationScore: profile.reputation_score || 0,
    performance,
    daysEarly,
  });
  const xpEarned = xpResult.xpFinal;

  // ── Reputação ────────────────────────────────────────────────────────
  const repDelta = reputationDeltaFor(difficulty, solved);
  const newRepScore = clampReputation((profile.reputation_score || 0) + repDelta);

  // ── Persistência ─────────────────────────────────────────────────────
  const casesSolved = (profile.cases_solved || 0) + (solved ? 1 : 0);
  const casesFailed = (profile.cases_failed || 0) + (solved ? 0 : 1);
  const newXpTotal = (profile.xp || 0) + xpEarned;

  await updateProfileStats(profileId, {
    xp: newXpTotal,
    reputation_score: newRepScore,
    cases_solved: casesSolved,
    cases_failed: casesFailed,
  });

  // Promoção de patente
  const ranks = (await getAllRanks()).map((r) => ({ id: r.id, title: r.title, min_xp: r.min_xp ?? r.minXp ?? 0 }));
  const promo = evaluatePromotion({ currentRankId: profile.rank_id, newXp: newXpTotal, ranks });
  if (promo.promoted && promo.rankId) {
    await updateProfileRank(profileId, promo.rankId);
  }

  await upsertPlayerReputation({ playerId: profileId, caseId, reputationScore: newRepScore });

  await insertCasePerformance({
    id: uuid(),
    caseId,
    playerId: profileId,
    difficultyId: gameCase.difficulty_id,
    visitsCount,
    routeErrors,
    finishedEarlierMinutes: performance.finishedEarlierMinutes,
    perfectPrecision: performance.perfectPrecision,
    xpAwarded: xpEarned,
    reputationDelta: repDelta,
  });

  await insertProfileStatsHistory({
    id: uuid(),
    profileId,
    caseId,
    xp: xpEarned,
    reputationScore: newRepScore,
    rankId: promo.rankId ?? profile.rank_id,
    casesSolved,
    casesFailed,
  });

  return {
    text: finalDialogue,
    gameOver: true,
    solved,
    timeState: summary,
    xpEarned,
    repDelta,
    promotion: promo.promoted ? { rankId: promo.rankId, title: promo.rank?.title ?? null } : null,
  };
}
