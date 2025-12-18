import pool from '../config/database.js';

export async function getExistingClueByCityPlace(caseId, cityPlaceId) {
  const sql = `
    SELECT *
    FROM case_clues
    WHERE case_id = ?
      AND city_place_id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, cityPlaceId]);
  return rows[0];
}

export async function insertClue({
  id,
  caseId,
  cityPlaceId,
  clueType,
  targetType,
  targetValue,
  targetRefId,
  generatedText,
}) {
  const sql = `
    INSERT INTO case_clues
      (id, case_id, city_place_id, clue_type, target_type, target_value, target_ref_id, generated_text)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [
    id,
    caseId,
    cityPlaceId,
    clueType,
    targetType,
    targetValue,
    targetRefId ?? null,
    generatedText,
  ]);
}
