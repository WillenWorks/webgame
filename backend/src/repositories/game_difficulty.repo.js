import pool from '../config/database.js';

export async function getGameDifficultyByCode(code) {
  const [rows] = await pool.query(
    'SELECT code, max_fails_allowed, visits_buffer FROM game_difficulty WHERE code = ? LIMIT 1',
    [code]
  );
  return rows[0] || null;
}
