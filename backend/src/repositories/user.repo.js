import pool from '../config/database.js';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

export async function createUser({ id, username, email, password, passwordHash }) {
  const newId = id || randomUUID();
  const pwdHash = passwordHash || (password ? await bcrypt.hash(password, 10) : null);
  if (!username || !email || !pwdHash) {
    throw new Error('createUser: username, email e password são obrigatórios');
  }
  const sql = `
    INSERT INTO users (id, username, email, password_hash)
    VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [newId, username, email, pwdHash]);
  return { id: newId, username, email };
}

export async function findUserByEmail(email) {
  const sql = `
    SELECT * FROM users WHERE email = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [email]);
  return rows[0] || null;
}

export async function getUserByUsername(username) {
  const sql = `
    SELECT * FROM users WHERE username = ? LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [username]);
  return rows[0] || null;
}

export async function validatePassword(user, password) {
  if (!user || !password) return false;
  try {
    return await bcrypt.compare(password, user.password_hash);
  } catch {
    return false;
  }
}
