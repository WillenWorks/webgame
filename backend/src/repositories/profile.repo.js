import pool from '../config/database.js';

export async function createProfile({ id, userId, detectiveName }) {
  const sql = `
    INSERT INTO profiles (id, user_id, detective_name)
    VALUES (?, ?, ?)
  `;
  await pool.execute(sql, [id, userId, detectiveName]);
}

export async function findProfilesByUser(userId) {
  const sql = `
    SELECT 
      p.id,
      p.detective_name,
      p.rank_id,
      p.xp,
      p.reputation_score,
      p.cases_solved,
      p.cases_failed,
      r.title AS rank_title
    FROM profiles p
    JOIN ranks r ON r.id = p.rank_id
    WHERE p.user_id = ?
    ORDER BY p.created_at ASC
  `;
  const [rows] = await pool.execute(sql, [userId]);
  return rows;
}

export async function findProfileById(profileId) {
  const sql = `
    SELECT * FROM profiles WHERE id = ?
  `;
  const [rows] = await pool.execute(sql, [profileId]);
  return rows[0];
}

export async function updateProfileStats(profileId, data) {
  const {
    xp,
    reputation_score,
    cases_solved,
    cases_failed,
  } = data;

  await pool.execute(
    `
    UPDATE profiles
    SET
      xp = ?,
      reputation_score = ?,
      cases_solved = ?,
      cases_failed = ?
    WHERE id = ?
    `,
    [xp, reputation_score, cases_solved, cases_failed, profileId]
  );
}

export async function getProfileByUserId(userId) {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM profiles
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId]
  );
  return rows[0];
}

export async function updateProfileName(profileId, detectiveName) {
  await pool.execute(
    `
    UPDATE profiles
    SET detective_name = ?
    WHERE id = ?
    `,
    [detectiveName, profileId]
  );
}

export async function findProfileByName(detectiveName) {
  const [rows] = await pool.execute(
    `SELECT * FROM profiles WHERE detective_name = ? LIMIT 1`,
    [detectiveName]
  );
  return rows[0] || null;
}
