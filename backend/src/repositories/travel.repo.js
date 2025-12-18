import pool from '../config/database.js';

export async function countLocationClues(caseId, cityId) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM case_clues cc
    JOIN case_city_places cp ON cp.id = cc.city_place_id
    WHERE cc.case_id = ?
      AND cp.city_id = ?
      AND cc.clue_type = 'NEXT_LOCATION'
  `;
  const [[row]] = await pool.execute(sql, [caseId, cityId]);
  return row.total;
}

export async function getNextCityStep(caseId, currentStep) {
  const sql = `
    SELECT city_id
    FROM case_route
    WHERE active_case_id = ?
      AND step_order = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, currentStep + 1]);
  return rows[0];
}

// Remover funções incompatíveis com o schema atual
export async function updateCaseTime() {
  return; // noop: active_cases não possui current_time_spent no dump atual
}

export async function advanceCaseStep() {
  return; // noop: usar visited em case_route para progresso
}
