import pool from '../config/database.js';

export async function getCaseById(caseId) {
  const [rows] = await pool.execute(
    "SELECT * FROM active_cases WHERE id = ?",
    [caseId]
  );
  return rows[0];
}

export async function getSuspectById(caseId, suspectId) {
  const [rows] = await pool.execute(
    `
    SELECT *
    FROM case_suspect_pool
    WHERE id = ? AND case_id = ?
    `,
    [suspectId, caseId]
  );
  return rows[0];
}

export async function getFinalCityByCase(caseId) {
  const [rows] = await pool.execute(
    `
    SELECT city_id
    FROM case_route
    WHERE active_case_id = ?
    ORDER BY step_order DESC
    LIMIT 1
    `,
    [caseId]
  );
  return rows[0];
}

export async function markWarrant(caseId, suspectId) {
  await pool.execute(
    `
    UPDATE active_cases
    SET warrant_suspect_id = ?
    WHERE id = ?
    `,
    [suspectId, caseId]
  );
}

export async function solveCase(caseId, status) {
  await pool.execute(
    `
    UPDATE active_cases
    SET status = ?
    WHERE id = ?
    `,
    [status, caseId]
  );
}

export async function clearSuspects(caseId) {
  await pool.execute(
    `
    DELETE FROM case_suspect_pool
    WHERE case_id = ?
    `,
    [caseId]
  );
}
