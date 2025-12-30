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

export async function ensureDefaultRanks() {
  try {
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS ranks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(64) NOT NULL,
        min_xp INT NOT NULL DEFAULT 0,
        mission_select_unlocked TINYINT(1) NOT NULL DEFAULT 0,
        difficulty_modifier DECIMAL(4,2) NOT NULL DEFAULT 1.00
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    const [rows] = await pool.execute('SELECT COUNT(*) AS cnt FROM ranks');
    const cnt = rows[0]?.cnt || 0;
    if (cnt === 0) {
      await pool.execute(
        `INSERT INTO ranks (title, min_xp, mission_select_unlocked, difficulty_modifier) VALUES
         ('Detetive Júnior', 0, 0, 1.00),
         ('Detetive Pleno', 1000, 0, 1.10),
         ('Detetive Sênior', 5000, 1, 1.20),
         ('Investigador Mestre', 15000, 1, 1.35),
         ('Grão-Detetive', 40000, 1, 1.50)`
      );
    }
  } catch (e) {
    console.warn('ensureDefaultRanks falhou:', String(e));
  }
}
