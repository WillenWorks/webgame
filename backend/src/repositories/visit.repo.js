import pool from '../config/database.js';

/**
 * Retorna a cidade "atual" do caso considerando a visão persistida por fase.
 * Lógica:
 * 1) Determina o step atual: primeiro registro em case_route com visited = FALSE
 * 2) Verifica se existe uma visão salva em case_current_view para (case_id, step_order)
 *    - Se existir, retorna essa cidade (com city_name/country_name) como a "atual" para exibição
 * 3) Caso contrário, retorna a cidade do step atual a partir de case_route (com city_name/country_name)
 */
export async function getCurrentCityByCase(caseId) {
  // 1) Step atual pela rota
  const [stepRows] = await pool.execute(
    `SELECT cr.step_order, cr.city_id
     FROM case_route cr
     WHERE cr.active_case_id = ? AND cr.visited = FALSE
     ORDER BY cr.step_order ASC
     LIMIT 1`,
    [caseId]
  );
  const step = stepRows[0];
  if (!step) return null;

  // 2) Tenta visão persistida para este step
  const [viewRows] = await pool.execute(
    `SELECT cv.city_id
     FROM case_current_view cv
     WHERE cv.case_id = ? AND cv.step_order = ?
     LIMIT 1`,
    [caseId, step.step_order]
  );
  const view = viewRows[0];
  const cityId = view?.city_id || step.city_id;

  // 3) Retorna cidade com nomes
  const [cityRows] = await pool.execute(
    `SELECT ? AS step_order, c.id AS city_id, c.name AS city_name, co.name AS country_name
     FROM cities c
     JOIN countries co ON co.id = c.country_id
     WHERE c.id = ?
     LIMIT 1`,
    [step.step_order, cityId]
  );
  return cityRows[0] || null;
}

export async function getCityPlaces(caseId, cityId) {
  const sql = `
    SELECT
      cp.id,
      pt.id AS place_type_id,
      pt.name,
      pt.interaction_style,
      cp.clue_type
    FROM case_city_places cp
    JOIN place_types pt ON pt.id = cp.place_type_id
    WHERE cp.case_id = ?
      AND cp.city_id = ?
  `;
  const [rows] = await pool.execute(sql, [caseId, cityId]);
  return rows;
}

export async function getCityPlaceById(caseId, cityPlaceId) {
  const sql = `
    SELECT
      cp.id,
      cp.city_id,
      cp.place_type_id,
      cp.clue_type,
      cp.is_capture_location,
      pt.name,
      pt.interaction_style
    FROM case_city_places cp
    JOIN place_types pt ON pt.id = cp.place_type_id
    WHERE cp.case_id = ?
      AND cp.id = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, cityPlaceId]);
  return rows[0];
}

export async function insertCityPlace({ id, caseId, cityId, placeTypeId, clueType }) {
  const sql = `
    INSERT INTO case_city_places
      (id, case_id, city_id, place_type_id, clue_type)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, caseId, cityId, placeTypeId, clueType]);
}

export async function getAllPlaceTypes() {
  const sql = `
    SELECT id, name, interaction_style
    FROM place_types
    ORDER BY RAND()
  `;
  const [rows] = await pool.execute(sql);
  return rows;
}

export async function setCaptureFlag(cityPlaceId, isCapture = 1) {
  const sql = `
    UPDATE case_city_places
    SET is_capture_location = ?
    WHERE id = ?
  `;
  await pool.execute(sql, [isCapture ? 1 : 0, cityPlaceId]);
}
