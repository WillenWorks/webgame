import pool from '../config/database.js';

export async function getCaseTimeState(caseId) {
  const [rows] = await pool.query(
    'SELECT case_id, start_time, deadline_time, current_time, timezone FROM case_time_state WHERE case_id = ? LIMIT 1',
    [caseId]
  );
  return rows[0] || null;
}

export async function upsertCaseTimeState({ caseId, startTime, deadlineTime, currentTime, timezone }) {
  const [result] = await pool.query(
    `INSERT INTO case_time_state (case_id, start_time, deadline_time, current_time, timezone)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       start_time = COALESCE(VALUES(start_time), start_time),
       deadline_time = COALESCE(VALUES(deadline_time), deadline_time),
       current_time = COALESCE(VALUES(current_time), current_time),
       timezone = COALESCE(VALUES(timezone), timezone)`,
    [caseId, startTime || null, deadlineTime || null, currentTime || null, timezone || null]
  );
  return result?.affectedRows > 0;
}
