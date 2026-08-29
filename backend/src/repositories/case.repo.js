import prisma from '../config/prisma.js';

export function toCaseRow(c) {
  if (!c) return undefined;
  return {
    id: c.id,
    profile_id: c.profileId,
    stolen_object: c.stolenObject,
    intro_text: c.introText,
    start_time: c.startTime,
    time_limit_hours: c.timeLimitHours,
    difficulty_id: c.difficultyId,
    status: c.status,
    warrant_suspect_id: c.warrantSuspectId,
    capture_place_id: c.capturePlaceId,
    created_at: c.createdAt,
  };
}

export async function createCase({
  id,
  profileId,
  stolenObject,
  startTime,
  timeLimitHours,
  difficultyCode,
}) {
  await prisma.activeCase.create({
    data: {
      id,
      profile: { connect: { id: profileId } },
      stolenObject,
      startTime,
      timeLimitHours: timeLimitHours ?? null,
      difficulty: { connect: { code: difficultyCode } },
    },
  });
}

export async function findActiveCaseByProfile(profileId) {
  return toCaseRow(
    await prisma.activeCase.findFirst({
      where: { profileId, status: 'ACTIVE' },
    })
  );
}

export async function getCaseById(caseId) {
  return toCaseRow(await prisma.activeCase.findUnique({ where: { id: caseId } }));
}

export async function getCaseDifficulty(caseId) {
  const c = await prisma.activeCase.findUnique({
    where: { id: caseId },
    include: { difficulty: true },
  });
  return c?.difficulty?.code ?? null;
}

export async function updateCaseMetadata({ id, stolenObject, introText }) {
  await prisma.activeCase.update({
    where: { id },
    data: { stolenObject, introText },
  });
}

export async function updateCaseTimeLimit(id, timeLimitHours) {
  await prisma.activeCase.update({
    where: { id },
    data: { timeLimitHours: Math.max(1, Math.round(Number(timeLimitHours) || 0)) },
  });
}

export async function getRecentCasesWithXp(profileId, limit = 10) {
  const rows = await prisma.activeCase.findMany({
    where: { profileId, status: { in: ['SOLVED', 'FAILED'] } },
    include: { statsHistory: true, difficulty: true },
    orderBy: { startTime: 'desc' },
    take: limit,
  });
  return rows.map((c) => ({
    id: c.id,
    status: c.status,
    stolen_object: c.stolenObject,
    difficulty_code: c.difficulty?.code ?? null,
    start_time: c.startTime,
    xp_earned: c.statsHistory[0]?.xp ?? 0,
  }));
}
