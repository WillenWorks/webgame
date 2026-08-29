import prisma from '../config/prisma.js';

/** Tabela gerenciada pelas migrations do Prisma. */
export async function ensurePlayerReputationHistory() {
  /* no-op */
}

export async function insertPlayerReputationHistory({ id, playerId, caseId, reputationScore }) {
  await prisma.playerReputationHistory.create({
    data: { id, profileId: playerId, caseId, reputationScore },
  });
}
