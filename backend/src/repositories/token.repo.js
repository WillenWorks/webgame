import pool from '../config/database.js';

/**
 * Tabela de refresh tokens persistentes
 * Campos: id (CHAR36), user_id (CHAR36), token (VARCHAR), expires_at (TIMESTAMP), revoked (TINYINT), created_at (TIMESTAMP)
 */
export async function initRefreshTokenTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS auth_refresh_tokens (
      id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      token VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NULL,
      revoked TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY user_idx (user_id),
      KEY token_idx (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.execute(sql);
}

export async function storeRefreshToken({ id, userId, token, expiresAt }) {
  await initRefreshTokenTable();
  const sql = `
    INSERT INTO auth_refresh_tokens (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, userId, token, expiresAt || null]);
}

export async function getRefreshToken(token) {
  await initRefreshTokenTable();
  const sql = `
    SELECT id, user_id, token, expires_at, revoked, created_at
    FROM auth_refresh_tokens
    WHERE token = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [token]);
  return rows[0] || null;
}

export async function revokeRefreshToken(token) {
  await initRefreshTokenTable();
  const sql = `
    UPDATE auth_refresh_tokens SET revoked = 1 WHERE token = ?
  `;
  await pool.execute(sql, [token]);
}
