import pool from '../config/database.js';

export async function createUser({ id, username, email, passwordHash }) {
  const sql = `
    INSERT INTO users (id, username, email, password_hash)
    VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, username, email, passwordHash]);
}

export async function findUserByEmail(email) {
  const sql = `
    SELECT * FROM users WHERE email = ?
  `;
  const [rows] = await pool.execute(sql, [email]);
  return rows[0];
}
