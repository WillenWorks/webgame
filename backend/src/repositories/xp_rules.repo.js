import pool from '../config/database.js';

export async function getXpRuleByDifficulty(difficulty) {
  const [rows] = await pool.query(
    'SELECT xp_base, bonus_time_factor, bonus_precision, debuff_failure_factor FROM xp_rules WHERE difficulty = ? LIMIT 1',
    [difficulty]
  );
  return rows[0] || null;
}
