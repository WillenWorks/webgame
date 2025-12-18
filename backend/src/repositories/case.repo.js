import pool from '../config/database.js';

export async function createCase({
  id,
  profileId,
  stolenObject,
  startTime,
  timeLimitHours
}) {
  const sql = `
    INSERT INTO active_cases (
      id,
      profile_id,
      stolen_object,
      start_time,
      time_limit_hours
    )
    VALUES (?, ?, ?, ?, ?)
  `;

  await pool.execute(sql, [
    id,
    profileId,
    stolenObject,
    startTime,
    timeLimitHours
  ]);
}

export async function findActiveCaseByProfile(profileId) {
  const sql = `
    SELECT *
    FROM active_cases
    WHERE profile_id = ?
      AND status = 'ACTIVE'
    LIMIT 1
  `;

  const [rows] = await pool.execute(sql, [profileId]);
  return rows[0];
}
