import pool from '../config/database.js';

export async function insertXpHistory({ playerId, caseId, xpAwarded, breakdown }) {
  const [result] = await pool.query(
    'INSERT INTO player_xp_history (id, player_id, case_id, xp_awarded, breakdown_json) VALUES (UUID(), ?, ?, ?, ?)',
    [playerId, caseId, xpAwarded, JSON.stringify(breakdown || {})]
  );
  return result?.affectedRows > 0;
}
