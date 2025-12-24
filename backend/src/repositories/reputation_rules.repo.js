import pool from '../config/database.js';

export async function getReputationMultipliers(reputationScore) {
  const [rows] = await pool.query(
    'SELECT debuff_base_factor, bonus_multiplier FROM reputation_rules WHERE ? BETWEEN min_rep AND max_rep LIMIT 1',
    [reputationScore]
  );
  return rows[0] || { debuff_base_factor: 1.0, bonus_multiplier: 1.0 };
}
