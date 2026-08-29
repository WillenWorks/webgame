import prisma from '../config/prisma.js';

/** Tabela gerenciada pelas migrations do Prisma. */
export async function ensureProfileStatsHistory() {
  /* no-op */
}

export async function insertProfileStatsHistory({
  id,
  profileId,
  caseId,
  xp,
  reputationScore,
  rankId,
  casesSolved,
  casesFailed,
}) {
  await prisma.profileStatsHistory.create({
    data: {
      id,
      profileId,
      caseId,
      xp,
      reputationScore,
      rankId: rankId ?? null,
      casesSolved,
      casesFailed,
    },
  });
}
