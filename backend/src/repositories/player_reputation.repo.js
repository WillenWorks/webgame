import pool from '../config/database.js';

export async function getPlayerReputation(playerId) {
  const [rows] = await pool.query(
    'SELECT player_id, reputation_score FROM player_reputation WHERE player_id = ? LIMIT 1',
    [playerId]
  );
  return rows[0] || null;
}

export async function upsertPlayerReputation({ playerId, reputationScore }) {
  // Garantir que a tabela exista e tenha chave primária em player_id
  await pool.query(
    `CREATE TABLE IF NOT EXISTS player_reputation (
       player_id CHAR(36) NOT NULL,
       reputation_score INT NOT NULL DEFAULT 0,
       updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       PRIMARY KEY (player_id)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`
  );

  const [result] = await pool.query(
    `INSERT INTO player_reputation (player_id, reputation_score)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE reputation_score = VALUES(reputation_score)`,
    [playerId, reputationScore]
  );
  return result?.affectedRows > 0;
}
