import pool from '../config/database.js';

export async function getProfileSummary({ profileId }) {
  // Perfil corrente
  const [[profile]] = await pool.execute(
    'SELECT id, detective_name, xp, reputation_score, cases_solved, cases_failed, rank_id, created_at FROM profiles WHERE id = ? LIMIT 1',
    [profileId]
  );

  // Última performance de caso
  const [perfRows] = await pool.execute(
    `SELECT cp.*, gd.code AS difficulty
     FROM case_performance cp
     LEFT JOIN game_difficulty gd ON gd.code = cp.difficulty_code
     WHERE cp.player_id = ?
     ORDER BY cp.created_at DESC
     LIMIT 5`,
    [profileId]
  );

  // Agregados simples
  const [[agg]] = await pool.execute(
    `SELECT COUNT(*) AS cases_total,
            SUM(CASE WHEN perfect_precision = 1 THEN 1 ELSE 0 END) AS perfect_cases,
            SUM(route_errors) AS total_route_errors,
            SUM(xp_awarded) AS total_xp_awarded
     FROM case_performance
     WHERE player_id = ?`,
    [profileId]
  );

  return {
    profile: profile || null,
    recentPerformance: perfRows || [],
    aggregates: agg || { cases_total: 0, perfect_cases: 0, total_route_errors: 0, total_xp_awarded: 0 },
  };
}
