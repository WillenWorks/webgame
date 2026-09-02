// src/services/profile_summary.service.js
import {
  findProfileById,
  getProfileCaseCounters,
  updateProfileCaseCounters,
} from '../repositories/profile.repo.js';
import { getRecentCasesWithXp } from '../repositories/case.repo.js';

export async function getProfileSummary({ profileId }) {
  // Recalcular contadores direto da tabela de casos (active_cases) para garantir consistência
  const counts = await getProfileCaseCounters(profileId);

  // Atualizar tabela de profiles se estiver desincronizada (opcional, mas bom pra manter cache)
  await updateProfileCaseCounters(profileId, counts.solved, counts.failed);

  // Perfil corrente (agora atualizado)
  const profileFull = await findProfileById(profileId);
  const profile = profileFull
    ? {
        id: profileFull.id,
        detective_name: profileFull.detective_name,
        xp: profileFull.xp,
        reputation_score: profileFull.reputation_score,
        cases_solved: profileFull.cases_solved,
        cases_failed: profileFull.cases_failed,
        rank_id: profileFull.rank_id,
        created_at: profileFull.created_at,
      }
    : null;

  // Última performance de caso (casos finalizados, com XP ganho quando disponível)
  const perfRows = await getRecentCasesWithXp(profileId, 10);

  // Mapear para o formato esperado pelo front
  const recentPerformance = perfRows.map((row) => ({
    status: row.status,
    created_at: row.start_time,
    xp_awarded: row.xp_earned || 0,
    difficulty: row.difficulty_code,
    summary: row.stolen_object,
  }));

  return {
    profile,
    recentPerformance,
    aggregates: { cases_total: counts.total || 0 },
  };
}
