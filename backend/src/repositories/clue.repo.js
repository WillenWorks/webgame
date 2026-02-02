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

export async function countRevealedCluesInCurrentStep(caseId, stepOrder) {
  // We need to join clues -> city_places -> visit/route logic?
  // Easier: join clues -> case_city_places
  // But wait, step_order is on active_cases (current) or we filter by city_id?
  // Correct logic: Filter by current city of the case.
  // Actually, we can get current city from active_cases or visit_log.
  // Assuming stepOrder is passed or implied.
  // Let's rely on city_id.
  
  // Revised query: Count revealed clues linked to places in the CURRENT city of the case.
  const sql = `
    SELECT COUNT(*) as count
    FROM case_clues cc
    JOIN case_city_places ccp ON ccp.id = cc.city_place_id
    JOIN active_cases ac ON ac.id = cc.case_id
    JOIN case_route cr ON cr.active_case_id = ac.id AND cr.city_id = ccp.city_id
    WHERE cc.case_id = ? 
      AND cc.revealed = 1
      AND cr.step_order = (SELECT current_step_order FROM active_cases WHERE id = ?)
  `;
  // Note: active_cases has current_step_order? Let's check schema.
  // Schema check is safer. But let's assume we can pass cityId.
  // Let's verify active_cases schema first.
  
  // Safe fallback: Count ALL revealed clues for the case. 
  // If user investigated *anything* in this case, show travel.
  // "só mostra o botão de viajar após colher uma das pistas"
  // Usually means "in this city". But "in this case" is safer for MVP.
  // Wait, if I travel to city 2, do I need to investigate AGAIN to leave? Yes.
  // So it must be "revealed clues in current city".
  
  return 0; // Placeholder until schema verified
}

export async function countRevealedCluesInCity(caseId, cityId) {
  const sql = `
    SELECT COUNT(*) as count
    FROM case_clues cc
    JOIN case_city_places ccp ON ccp.id = cc.city_place_id
    WHERE cc.case_id = ?
      AND ccp.city_id = ?
      AND cc.revealed = 1
  `;
  const [rows] = await pool.execute(sql, [caseId, cityId]);
  return rows[0].count;
}

export async function updateClueRevealedStatus(clueId, revealed) {
  const sql = `
    UPDATE case_clues
    SET revealed = ?
    WHERE id = ?
  `;
  await pool.execute(sql, [revealed ? 1 : 0, clueId]);
} 
