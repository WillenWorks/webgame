import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

/** Tabela gerenciada pelas migrations do Prisma. */
export async function ensurePlayerReputationHistorical() {
  /* no-op */
}

function toRow(r) {
  if (!r) return null;
  return {
    profile_id: r.profileId,
    case_id: r.caseId,
    reputation_score: r.reputationScore,
    created_at: r.createdAt,
  };
}

// Última reputação conhecida do jogador
export async function getPlayerReputationLatestByPlayer(playerId) {
  return toRow(
    await prisma.playerReputation.findFirst({
      where: { profileId: playerId },
      orderBy: { createdAt: 'desc' },
    })
  );
}

// Compat: retorna a entrada mais recente
export async function getPlayerReputation(playerId) {
  return getPlayerReputationLatestByPlayer(playerId);
}

// Insere uma entrada histórica por caso
export async function insertPlayerReputationEntry({ id, playerId, caseId, reputationScore }) {
  await prisma.playerReputation.create({
    data: { id, profileId: playerId, caseId: caseId ?? null, reputationScore },
  });
}

// Compat: insere nova entrada (não sobrescreve)
export async function upsertPlayerReputation({ playerId, reputationScore, caseId = null }) {
  await prisma.playerReputation.create({
    data: { id: randomUUID(), profileId: playerId, caseId, reputationScore },
  });
  return true;
}
