import { v4 as uuid } from 'uuid';
import {
  createProfile,
  findProfilesByUser,
  findProfileById,
  findProfileByName,
  updateProfileName,
  updateProfileStats,
} from '../repositories/profile.repo.js';

export async function createProfileService({ userId, detectiveName }) {
  const profile = { id: uuid(), userId, detectiveName };
  await createProfile(profile);
  return profile;
}

export async function updateProfileService({ userId, profileId, detectiveName }) {
  const profile = await findProfileById(profileId);
  if (!profile || profile.user_id !== userId) {
    throw new Error('Perfil não encontrado');
  }
  if (detectiveName) {
    const existing = await findProfileByName(detectiveName);
    if (existing && existing.id !== profileId) {
      throw new Error('Nome de perfil já existe');
    }
    await updateProfileName(profileId, detectiveName);
    profile.detective_name = detectiveName;
  }
  return profile;
}

export async function getProfileByNameService(name, userId) {
  const profile = await findProfileByName(name);
  if (!profile || profile.user_id !== userId) {
    throw new Error('Perfil não encontrado');
  }
  return profile;
}

export async function listProfilesService(userId) {
  return findProfilesByUser(userId);
}

export async function getProfileService(profileId, userId) {
  const profile = await findProfileById(profileId);
  if (!profile || profile.user_id !== userId) {
    throw new Error('Perfil não encontrado');
  }
  return profile;
}

/**
 * Aplica resultado do caso ao perfil (XP, reputação, solved/failed) e promove por XP.
 */
export async function applyCaseResultToProfile(profileId, result) {
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Perfil não encontrado');

  let xpGain = 0;
  let reputationDelta = 0; // delta base, ajustado por política de redenção
  let casesSolvedInc = 0;
  let casesFailedInc = 0;

  if (result.solved) {
    xpGain = result.perfect ? 300 : 200;
    reputationDelta = result.perfect ? 20 : 10; // base positiva
    casesSolvedInc = 1;
  } else {
    xpGain = 0;
    reputationDelta = result.wrongWarrant ? -15 : -5; // base negativa
    casesFailedInc = 1;
  }

  const { getPlayerReputation, upsertPlayerReputation } = await import('../repositories/player_reputation.repo.js');
  const currentRepRow = await getPlayerReputation(profileId);
  const currentRepScore = currentRepRow ? currentRepRow.reputation_score : ((profile.reputation_score || 0) || 0);
  const { redemptionDelta } = await import('./reputation.service.js');
  const adjustedDelta = redemptionDelta({ baseDelta: reputationDelta, reputationScore: currentRepScore });

  const newXp = (profile.xp || 0) + xpGain;
  const newRep = currentRepScore + adjustedDelta;
  const newSolved = (profile.cases_solved || 0) + casesSolvedInc;
  const newFailed = (profile.cases_failed || 0) + casesFailedInc;

  // Atualiza estatísticas
  await updateProfileStats(profileId, {
    xp: newXp,
    reputation_score: newRep,
    cases_solved: newSolved,
    cases_failed: newFailed,
  });
  // Espelhar reputação em player_reputation
  await upsertPlayerReputation({ playerId: profileId, reputationScore: newRep });

  // Promove por XP (garantir ranks)
  const { ensureDefaultRanks, getRankByXp } = await import('../repositories/ranks.repo.js');
  await ensureDefaultRanks();
  const rank = await getRankByXp(newXp);
  if (rank && rank.id !== profile.rank_id) {
    const { default: pool } = await import('../config/database.js');
    await pool.execute('UPDATE profiles SET rank_id = ? WHERE id = ?', [rank.id, profileId]);
  }

  return { xp: newXp, reputation_score: newRep, cases_solved: newSolved, cases_failed: newFailed, rank_id: rank?.id ?? profile.rank_id };
}
