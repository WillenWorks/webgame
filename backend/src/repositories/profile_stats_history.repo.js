import pool from '../config/database.js';

// Cria tabela de histórico de stats por caso e insere registros
export async function ensureProfileStatsHistory() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS profile_stats_history (
      id CHAR(36) PRIMARY KEY,
      profile_id CHAR(36) NOT NULL,
      case_id CHAR(36) NOT NULL,
      xp INT NOT NULL,
      reputation_score INT NOT NULL,
      rank_id INT NULL,
      cases_solved INT NOT NULL,
      cases_failed INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_profile_case (profile_id, case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function insertProfileStatsHistory({ id, profileId, caseId, xp, reputationScore, rankId, casesSolved, casesFailed }) {
  await ensureProfileStatsHistory();
  const sql = `
    INSERT INTO profile_stats_history (id, profile_id, case_id, xp, reputation_score, rank_id, cases_solved, cases_failed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, profileId, caseId, xp, reputationScore, rankId, casesSolved, casesFailed]);
}
