import pool from '../config/database.js';

// Cria tabela de histórico de reputação por caso e insere registros
export async function ensurePlayerReputationHistory() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS player_reputation_history (
      id CHAR(36) PRIMARY KEY,
      player_id CHAR(36) NOT NULL,
      case_id CHAR(36) NOT NULL,
      reputation_score INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_player_case (player_id, case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

export async function insertPlayerReputationHistory({ id, playerId, caseId, reputationScore }) {
  await ensurePlayerReputationHistory();
  const sql = `
    INSERT INTO player_reputation_history (id, player_id, case_id, reputation_score)
    VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, playerId, caseId, reputationScore]);
}
