import pool from '../config/database.js';

export async function getXpRuleByDifficulty(difficulty) {
  const [rows] = await pool.query(
    'SELECT xr.xp_base, xr.bonus_time_factor, xr.bonus_precision, xr.debuff_failure_factor\n       FROM xp_rules xr\n       JOIN game_difficulty gd ON gd.id = xr.difficulty_id\n       WHERE gd.code = ?\n       LIMIT 1',
    [difficulty]
  );
  return rows[0] || null;
}
