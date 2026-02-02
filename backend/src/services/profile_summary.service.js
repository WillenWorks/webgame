// src/services/profile_summary.service.js
import pool from '../config/database.js';

export async function getProfileSummary({ profileId }) {
  // Recalcular contadores direto da tabela de casos (active_cases) para garantir consistência
  const [[counts]] = await pool.execute(
    `SELECT 
       SUM(CASE WHEN status = 'SOLVED' THEN 1 ELSE 0 END) AS solved,
       SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
       COUNT(*) AS total
     FROM active_cases 
     WHERE profile_id = ? AND status IN ('SOLVED', 'FAILED')`,
    [profileId]
  );
  
  // Atualizar tabela de profiles se estiver desincronizada (opcional, mas bom pra manter cache)
  await pool.execute(
    `UPDATE profiles SET cases_solved = ?, cases_failed = ? WHERE id = ?`,
    [counts.solved || 0, counts.failed || 0, profileId]
  );

  // Perfil corrente (agora atualizado)
  const [[profile]] = await pool.execute(
    'SELECT id, detective_name, xp, reputation_score, cases_solved, cases_failed, rank_id, created_at FROM profiles WHERE id = ? LIMIT 1',
    [profileId]
  );

  // Última performance de caso (pegar dos active_cases que tem status finalizado)
  // Nota: active_cases pode não ter XP detalhado se não usarmos tabela separada, 
  // mas vamos tentar juntar com xp_history se possível, ou apenas listar os casos
  const [perfRows] = await pool.execute(
    `SELECT ac.id, ac.status, ac.stolen_object, ac.difficulty_id, ac.start_time, ac.status AS difficulty
     FROM active_cases ac
     WHERE ac.profile_id = ? AND ac.status IN ('SOLVED', 'FAILED')
     ORDER BY ac.start_time DESC
     LIMIT 10`,
    [profileId]
  );

  // Mapear para o formato esperado pelo front
  const recentPerformance = perfRows.map(row => ({
    status: row.status,
    created_at: row.start_time, // fallback
    xp_awarded: 0, // TODO: join with xp_history if needed
    difficulty: row.difficulty_id === 1 ? 'EASY' : (row.difficulty_id === 2 ? 'HARD' : 'EXTREME'),
    summary: row.stolen_object
  }));

  return {
    profile: profile || null,
    recentPerformance: recentPerformance || [],
    aggregates: { cases_total: counts.total || 0 }
  };
}
