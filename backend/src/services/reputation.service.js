// src/services/reputation.service.js (ESM)
// Atualiza reputação do jogador dentro de limites [-100, +100] e política de "redenção"

import { upsertPlayerReputation, getPlayerReputation } from '../repositories/player_reputation.repo.js';

export async function adjustReputation({ playerId, delta }) {
  const current = await getPlayerReputation(playerId); // { reputation_score } ou null
  let score = current ? current.reputation_score : 0;
  score += delta;
  // Limites
  if (score > 100) score = 100;
  if (score < -100) score = -100;
  await upsertPlayerReputation({ playerId, reputationScore: score });
  return { reputationScore: score };
}

// Política de "redenção": em reputação baixa, deltas positivos podem ter peso ligeiramente maior
export function redemptionDelta({ baseDelta, reputationScore }) {
  if (reputationScore <= -50 && baseDelta > 0) {
    return Math.round(baseDelta * 1.2); // 20% a mais quando melhorando a reputação baixa
  }
  return baseDelta;
}
