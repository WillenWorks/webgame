import pool from '../config/database.js';

/**
 * Tabela de visão atual por fase (step): case_current_view
 * Campos: id (CHAR36), case_id (CHAR36), city_id (INT), step_order (INT), updated_at (TIMESTAMP)
 */
export async function initCurrentViewTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS case_current_view (
      id CHAR(36) NOT NULL,
      case_id CHAR(36) NOT NULL,
      city_id INT NOT NULL,
      step_order INT NOT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY case_step_idx (case_id, step_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.execute(sql);
}

export async function setCurrentView(caseId, cityId, stepOrder) {
  // Upsert by (case_id, step_order)
  const [rows] = await pool.execute(
    `SELECT id FROM case_current_view WHERE case_id = ? AND step_order = ? LIMIT 1`,
    [caseId, stepOrder]
  );
  if (rows[0]?.id) {
    await pool.execute(
      `UPDATE case_current_view SET city_id = ? WHERE id = ?`,
      [cityId, rows[0].id]
    );
    return rows[0].id;
  }
  const { default: crypto } = await import('crypto');
  const id = crypto.randomUUID();
  await pool.execute(
    `INSERT INTO case_current_view (id, case_id, city_id, step_order) VALUES (?, ?, ?, ?)`,
    [id, caseId, cityId, stepOrder]
  );
  return id;
}

export async function getCurrentView(caseId, stepOrder) {
  const [rows] = await pool.execute(
    `SELECT city_id, step_order FROM case_current_view WHERE case_id = ? AND step_order = ? LIMIT 1`,
    [caseId, stepOrder]
  );
  return rows[0] || null;
}

export async function clearCurrentViewForCase(caseId) {
  await pool.execute(`DELETE FROM case_current_view WHERE case_id = ?`, [caseId]);
}
