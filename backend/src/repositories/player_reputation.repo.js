import pool from '../config/database.js';

export async function getPlayerReputation(playerId) {
  const [rows] = await pool.query(
    'SELECT player_id, reputation_score FROM player_reputation WHERE player_id = ? LIMIT 1',
    [playerId]
  );
  return rows[0] || null;
}

export async function upsertPlayerReputation({ playerId, reputationScore }) {
  const [result] = await pool.query(
    `INSERT INTO player_reputation (player_id, reputation_score)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE reputation_score = VALUES(reputation_score)`,
    [playerId, reputationScore]
  );
  return result?.affectedRows > 0;
}
