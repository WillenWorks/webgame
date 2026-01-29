import pool from "../config/database.js";
import { getRankByXp } from "../repositories/ranks.repo.js";

function pickDecoys(allCities, excludeIds, count) {
  const pool = allCities.filter((c) => !excludeIds.has(c.id));
  const decoys = [];
  for (const c of pool) {
    if (decoys.length >= count) break;
    decoys.push(c.id);
  }
  return decoys;
}

/**
 * Gera uma rota fixa para um caso e adiciona opções de viagem por fase
 * Ajusta quantidade de decoys conforme rank/dificuldade (ranks.difficulty_modifier).
 */
export async function generateRouteService({
  activeCaseId,
  steps = 5,
  optionsPerStep = null,
}) {
  if (!activeCaseId) {
    throw new Error("CaseId não informado");
  }

  // Evitar rota duplicada
  const [existing] = await pool.execute(
    `SELECT COUNT(*) AS total FROM case_route WHERE active_case_id = ?`,
    [activeCaseId],
  );
  if (existing[0].total > 0) {
    throw new Error("Rota já foi gerada para este caso");
  }

  // Buscar perfil e dificuldade para ajustar decoys
  const [[caseRow]] = await pool.execute(
    `SELECT profile_id FROM active_cases WHERE id = ?`,
    [activeCaseId],
  );
  let decoyTarget = 3; // padrão base
  if (caseRow?.profile_id) {
    const [[pRow]] = await pool.execute(
      `SELECT xp, rank_id FROM profiles WHERE id = ?`,
      [caseRow.profile_id],
    );
    const [ranks] = await pool.execute(
      `SELECT id, min_xp, difficulty_modifier FROM ranks ORDER BY id ASC`,
    );
    // encontrar rank pelo id
    const currentRank = ranks.find((r) => r.id === pRow?.rank_id) || ranks[0];
    const mod = Number(currentRank?.difficulty_modifier || 1);
    // a partir do 3º cargo, elevar decoys
    decoyTarget = Math.max(3, Math.round(3 * mod)); // ex.: 3, 3, 4, 4, 4/5
  }
  const effectiveOptionsPerStep = optionsPerStep ?? decoyTarget + 1; // +1 inclui a correta

  // 1️⃣ Buscar cidades disponíveis
  const [cities] = await pool.execute(
    `
    SELECT
      c.id,
      c.name,
      c.country_id,
      ST_Y(c.geo_coordinates) AS lat,
      ST_X(c.geo_coordinates) AS lng
    FROM cities c
    ORDER BY RAND()`,
  );

  const route = [];
  const usedCities = new Set();
  let lastCountry = null;

  for (const city of cities) {
    if (route.length >= steps) break;
    if (usedCities.has(city.id)) continue;
    if (lastCountry && city.country_id === lastCountry) continue; // alterna países
    route.push(city);
    usedCities.add(city.id);
    lastCountry = city.country_id;
  }

  if (route.length < steps) {
    throw new Error("Falha ao gerar rota válida");
  }

  // 2️⃣ Persistir rota com opções por step
  for (let i = 0; i < route.length; i++) {
    const current = route[i];
    const stepOrder = i + 1;
    let optionsJson = null;

    if (i < route.length - 1) {
      const next = route[i + 1];
      const exclude = new Set(route.map((r) => r.id));
      exclude.add(current.id);
      exclude.add(next.id);

      const decoys = pickDecoys(
        cities,
        exclude,
        Math.max(0, effectiveOptionsPerStep - 1),
      );
      const options = [next.id, ...decoys];
      optionsJson = JSON.stringify({ options, primary: next.id });
    }

    await pool.execute(
      `INSERT INTO case_route (active_case_id, city_id, step_order, clues_generated_json) VALUES (?, ?, ?, ?)`,
      [activeCaseId, current.id, stepOrder, optionsJson],
    );
  }

  return route;
}
