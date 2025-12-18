import pool from "../config/database.js";

export async function insertRouteStep({ activeCaseId, cityId, stepOrder, optionsJson = null }) {
  const sql = `
    INSERT INTO case_route (active_case_id, city_id, step_order, clues_generated_json)
    VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [activeCaseId, cityId, stepOrder, optionsJson]);
}

export async function getRouteByCaseId(activeCaseId) {
  const sql = `
    SELECT 
      cr.step_order,
      c.id AS city_id,
      c.name AS city_name,
      co.name AS country_name,
      cr.clues_generated_json
    FROM case_route cr
    JOIN cities c ON c.id = cr.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE cr.active_case_id = ?
    ORDER BY cr.step_order ASC
  `;
  const [rows] = await pool.execute(sql, [activeCaseId]);
  return rows;
}

export async function deleteRouteByCaseId(activeCaseId) {
  const sql = `
    DELETE FROM case_route
    WHERE active_case_id = ?
  `;
  await pool.execute(sql, [activeCaseId]);
}

export async function getCaseCityPlace(caseId, cityId, placeTypeId) {
  const sql = `
    SELECT
      cp.place_type_id,
      cp.clue_type,
      pt.interaction_style
    FROM case_city_places cp
    JOIN place_types pt ON pt.id = cp.place_type_id
    WHERE cp.case_id = ?
      AND cp.city_id = ?
      ${placeTypeId ? 'AND cp.place_type_id = ?' : ''}
    LIMIT 1
  `;
  const params = placeTypeId ? [caseId, cityId, placeTypeId] : [caseId, cityId];
  const [rows] = await pool.execute(sql, params);
  return rows[0];
}

export async function getNextCityByCase(caseId, currentStep) {
  const sql = `
    SELECT
      cr.step_order,
      c.id AS city_id,
      c.name AS city_name,
      co.id AS country_id,
      co.name AS country_name,
      co.cultural_info,
      cr.clues_generated_json
    FROM case_route cr
    JOIN cities c ON c.id = cr.city_id
    JOIN countries co ON co.id = c.country_id
    WHERE cr.active_case_id = ?
      AND cr.step_order = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, currentStep + 1]);
  return rows[0];
}

export async function getCurrentRouteStep(caseId) {
  const sql = `
    SELECT
      cr.step_order,
      cr.city_id
    FROM case_route cr
    WHERE cr.active_case_id = ?
      AND cr.visited = FALSE
    ORDER BY cr.step_order ASC
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows[0];
}

export async function markRouteStepVisited(caseId, stepOrder) {
  const sql = `
    UPDATE case_route
    SET visited = TRUE
    WHERE active_case_id = ?
      AND step_order = ?
  `;
  await pool.execute(sql, [caseId, stepOrder]);
}

export async function getNextRouteCity(caseId, stepOrder) {
  const sql = `
    SELECT city_id
    FROM case_route
    WHERE active_case_id = ?
      AND step_order = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, stepOrder + 1]);
  return rows[0];
}

export async function getRouteSteps(caseId) {
  const sql = `
    SELECT 
      cr.step_order,
      cr.city_id,
      cr.clues_generated_json
    FROM case_route cr
    WHERE cr.active_case_id = ?
    ORDER BY cr.step_order ASC
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows;
}

export async function getStepOptions(caseId, stepOrder) {
  const sql = `
    SELECT clues_generated_json
    FROM case_route
    WHERE active_case_id = ? AND step_order = ?
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId, stepOrder]);
  if (!rows[0] || !rows[0].clues_generated_json) return null;
  try {
    const json = typeof rows[0].clues_generated_json === 'string'
      ? JSON.parse(rows[0].clues_generated_json)
      : rows[0].clues_generated_json;
    return json;
  } catch {
    return null;
  }
}
