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
  revealed = 0,
}) {
  const sql = `
    INSERT INTO case_clues
      (id, case_id, city_place_id, clue_type, target_type, target_value, target_ref_id, generated_text, revealed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    revealed,
  ]);
}

export async function getRevealedCluesByCityId(caseId) {
  const sql = `
    SELECT cc.*
    FROM case_clues cc
    JOIN case_city_places ccp ON ccp.id = cc.city_place_id
    WHERE cc.case_id = ?
      AND cc.revealed = 1
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows;
}

export async function updateClueRevealedStatus(clueId, revealed) {
  const sql = `
    UPDATE case_clues
    SET revealed = ?
    WHERE id = ?
  `;
  await pool.execute(sql, [revealed ? 1 : 0, clueId]);
} 
