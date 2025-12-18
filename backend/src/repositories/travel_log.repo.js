import pool from '../config/database.js';

/**
 * Inicializa a tabela de logs de viagem caso não exista.
 */
export async function initTravelLogTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS case_travel_log (
      id CHAR(36) NOT NULL,
      case_id CHAR(36) NOT NULL,
      from_city_id INT NOT NULL,
      to_city_id INT NOT NULL,
      step_order INT NOT NULL,
      success TINYINT(1) NOT NULL DEFAULT 0,
      reason VARCHAR(255) NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY case_id_idx (case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.execute(sql);
}

export async function insertTravelLog({ id, caseId, fromCityId, toCityId, stepOrder, success, reason }) {
  const sql = `
    INSERT INTO case_travel_log
      (id, case_id, from_city_id, to_city_id, step_order, success, reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, caseId, fromCityId, toCityId, stepOrder, success ? 1 : 0, reason || null]);
}

export async function getTravelLogs(caseId) {
  const sql = `
    SELECT id, case_id, from_city_id, to_city_id, step_order, success, reason, created_at
    FROM case_travel_log
    WHERE case_id = ?
    ORDER BY created_at DESC
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows;
}

export async function getLastTravelLogForStep(caseId, stepOrder) {
  const sql = `
    SELECT id, case_id, from_city_id, to_city_id, step_order, success, reason, created_at
    FROM case_travel_log
    WHERE case_id = ? AND step_order = ?
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, stepOrder]);
  return rows[0] || null;
}
