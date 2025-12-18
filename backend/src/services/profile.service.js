import { v4 as uuid } from 'uuid';
import {
  createProfile,
  findProfilesByUser,
  findProfileById,
} from '../repositories/profile.repo.js';


export async function createProfileService({
  userId,
  detectiveName,
  avatarId
}) {
  const profile = {
    id: uuid(),
    userId,
    detectiveName
  };

  await createProfile(profile);
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
  let reputationDelta = 0;
  let casesSolvedInc = 0;
  let casesFailedInc = 0;

  if (result.solved) {
    xpGain = result.perfect ? 300 : 200;
    reputationDelta = result.perfect ? 20 : 10;
    casesSolvedInc = 1;
  } else {
    xpGain = 0;
    reputationDelta = result.wrongWarrant ? -15 : -5;
    casesFailedInc = 1;
  }

  const newXp = (profile.xp || 0) + xpGain;
  const newRep = (profile.reputation_score || 0) + reputationDelta;
  const newSolved = (profile.cases_solved || 0) + casesSolvedInc;
  const newFailed = (profile.cases_failed || 0) + casesFailedInc;

  // Atualiza estatísticas
  await updateProfileStats(profileId, {
    xp: newXp,
    reputation_score: newRep,
    cases_solved: newSolved,
    cases_failed: newFailed,
  });

  // Promove por XP
  const rank = await getRankByXp(newXp);
  if (rank && rank.id !== profile.rank_id) {
    // Atualiza rank
    // (reutiliza updateProfileStats para manter atomicidade simples)
    await updateProfileStats(profileId, {
      xp: newXp,
      reputation_score: newRep,
      cases_solved: newSolved,
      cases_failed: newFailed,
    });
    // Aplicar promoção via UPDATE direto
    // Pequeno helper local para não criar novo repo
    const { default: pool } = await import('../config/database.js');
    await pool.execute('UPDATE profiles SET rank_id = ? WHERE id = ?', [rank.id, profileId]);
  }

  return { xp: newXp, reputation_score: newRep, cases_solved: newSolved, cases_failed: newFailed, rank_id: rank?.id ?? profile.rank_id };
}
