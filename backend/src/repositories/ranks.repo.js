import pool from '../config/database.js';

export async function getAllRanks() {
  const sql = `SELECT id, title, min_xp, mission_select_unlocked, difficulty_modifier FROM ranks ORDER BY id ASC`;
  const [rows] = await pool.execute(sql);
  return rows;
}

export async function getNextRank(currentRankId) {
  const sql = `SELECT id, title, min_xp, mission_select_unlocked, difficulty_modifier FROM ranks WHERE id = ? + 1 LIMIT 1`;
  const [rows] = await pool.execute(sql, [currentRankId]);
  return rows[0] || null;
}

export async function getRankByXp(xp) {
  const sql = `SELECT id, title, min_xp, mission_select_unlocked, difficulty_modifier FROM ranks ORDER BY min_xp ASC`;
  const [rows] = await pool.execute(sql);
  let chosen = rows[0];
  for (const r of rows) {
    if (xp >= r.min_xp) chosen = r; else break;
  }
  return chosen;
}
