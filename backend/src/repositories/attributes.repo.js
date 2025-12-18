import pool from '../config/database.js';

export async function getRandomAttribute(table) {
  const sql = `
    SELECT id
    FROM ${table}
    ORDER BY RAND()
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql);
  return rows[0]?.id;
}
