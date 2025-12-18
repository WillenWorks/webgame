import pool from '../config/database.js';

/**
 * Dossiê de caso por perfil: notas de características para filtrar suspeitos
 * Tabela: case_dossier_notes
 * Campos: id (CHAR36), case_id (CHAR36), profile_id (CHAR36), sex_id INT NULL, hair_id INT NULL,
 *         hobby_id INT NULL, vehicle_id INT NULL, feature_id INT NULL, updated_at TIMESTAMP
 */
export async function initDossierNotesTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS case_dossier_notes (
      id CHAR(36) NOT NULL,
      case_id CHAR(36) NOT NULL,
      profile_id CHAR(36) NOT NULL,
      sex_id INT NULL,
      hair_id INT NULL,
      hobby_id INT NULL,
      vehicle_id INT NULL,
      feature_id INT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY case_profile_idx (case_id, profile_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;
  await pool.execute(sql);
}

export async function getDossierNotes(caseId, profileId) {
  const sql = `
    SELECT sex_id, hair_id, hobby_id, vehicle_id, feature_id
    FROM case_dossier_notes
    WHERE case_id = ? AND profile_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, profileId]);
  return rows[0] || null;
}

export async function upsertDossierNotes(caseId, profileId, notes) {
  // Try update; if no row, insert
  const existing = await getDossierNotes(caseId, profileId);
  if (!existing) {
    const sql = `
      INSERT INTO case_dossier_notes (id, case_id, profile_id, sex_id, hair_id, hobby_id, vehicle_id, feature_id)
      VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)
    `;
    await pool.execute(sql, [
      caseId,
      profileId,
      notes.sex_id ?? null,
      notes.hair_id ?? null,
      notes.hobby_id ?? null,
      notes.vehicle_id ?? null,
      notes.feature_id ?? null,
    ]);
    return;
  }
  const sql = `
    UPDATE case_dossier_notes
    SET sex_id = ?, hair_id = ?, hobby_id = ?, vehicle_id = ?, feature_id = ?
    WHERE case_id = ? AND profile_id = ?
  `;
  await pool.execute(sql, [
    notes.sex_id ?? null,
    notes.hair_id ?? null,
    notes.hobby_id ?? null,
    notes.vehicle_id ?? null,
    notes.feature_id ?? null,
    caseId,
    profileId,
  ]);
}

export async function clearDossierField(caseId, profileId, field) {
  const allowed = ['sex_id','hair_id','hobby_id','vehicle_id','feature_id'];
  if (!allowed.includes(field)) return;
  const sql = `
    UPDATE case_dossier_notes SET ${field} = NULL
    WHERE case_id = ? AND profile_id = ?
  `;
  await pool.execute(sql, [caseId, profileId]);
}

export async function clearDossierNotes(caseId, profileId) {
  const sql = `
    DELETE FROM case_dossier_notes WHERE case_id = ? AND profile_id = ?
  `;
  await pool.execute(sql, [caseId, profileId]);
}
