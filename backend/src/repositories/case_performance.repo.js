// src/repositories/case_performance.repo.js
import prisma from '../config/prisma.js';

export async function insertCasePerformance({
  id,
  caseId,
  playerId,
  difficultyId,
  visitsCount = 0,
  routeErrors = 0,
  finishedEarlierMinutes = 0,
  perfectPrecision = false,
  xpAwarded = 0,
  reputationDelta = 0,
}) {
  await prisma.casePerformance.create({
    data: {
      id,
      caseId,
      profileId: playerId,
      difficultyCode: Number(difficultyId),
      visitsCount,
      routeErrors,
      finishedEarlierMinutes,
      perfectPrecision: Boolean(perfectPrecision),
      xpAwarded,
      reputationDelta,
    },
  });
}

export async function getCasePerformanceByCaseId(caseId) {
  const cp = await prisma.casePerformance.findFirst({
    where: { caseId },
    orderBy: { createdAt: 'desc' },
    include: { case: { include: { difficulty: true } } },
  });
  if (!cp) return null;
  return {
    id: cp.id,
    case_id: cp.caseId,
    profile_id: cp.profileId,
    difficulty_code: cp.difficultyCode,
    visits_count: cp.visitsCount,
    route_errors: cp.routeErrors,
    finished_earlier_minutes: cp.finishedEarlierMinutes,
    perfect_precision: cp.perfectPrecision,
    xp_awarded: cp.xpAwarded,
    reputation_delta: cp.reputationDelta,
    created_at: cp.createdAt,
    difficulty: cp.case?.difficulty?.code ?? null,
  };
}
