import pool from "../config/database.js";
import { getRankByXp } from "../repositories/ranks.repo.js";

// Decoys não podem ser do mesmo país que a próxima cidade (nextCityCountryId)
// e tentamos não repetir países entre os decoys se possível
function pickDecoys(allCities, excludeIds, count, nextCityCountryId) {
  // Filtra cidades já usadas OU do mesmo país do destino
  const pool = allCities.filter((c) => !excludeIds.has(c.id) && c.country_id !== nextCityCountryId);
  
  const decoys = [];
  const usedCountries = new Set();
  
  // Primeiro passo: tentar pegar cidades de países diferentes
  for (const c of pool) {
    if (decoys.length >= count) break;
    if (!usedCountries.has(c.country_id)) {
        decoys.push(c.id);
        usedCountries.add(c.country_id);
    }
  }
  
  // Segundo passo: se faltar, completa com qualquer um (respeitando exclusão de ID e target country)
  if (decoys.length < count) {
      for (const c of pool) {
        if (decoys.length >= count) break;
        if (!decoys.includes(c.id)) {
            decoys.push(c.id);
        }
      }
  }
  
  return decoys;
}

export async function generateRouteService({
  activeCaseId,
  steps = 5,
  optionsPerStep = null,
}) {
  if (!activeCaseId) {
    throw new Error("CaseId não informado");
  }

  const [existing] = await pool.execute(
    `SELECT COUNT(*) AS total FROM case_route WHERE active_case_id = ?`,
    [activeCaseId],
  );
  if (existing[0].total > 0) {
    throw new Error("Rota já foi gerada para este caso");
  }

  const [[caseRow]] = await pool.execute(
    `SELECT profile_id FROM active_cases WHERE id = ?`,
    [activeCaseId],
  );
  let decoyTarget = 3; 
  if (caseRow?.profile_id) {
    const [[pRow]] = await pool.execute(
      `SELECT xp, rank_id FROM profiles WHERE id = ?`,
      [caseRow.profile_id],
    );
    const [ranks] = await pool.execute(
      `SELECT id, min_xp, difficulty_modifier FROM ranks ORDER BY id ASC`,
    );
    const currentRank = ranks.find((r) => r.id === pRow?.rank_id) || ranks[0];
    const mod = Number(currentRank?.difficulty_modifier || 1);
    decoyTarget = Math.max(3, Math.round(3 * mod));
  }
  const effectiveOptionsPerStep = optionsPerStep ?? decoyTarget + 1;

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
    if (lastCountry && city.country_id === lastCountry) continue;
    route.push(city);
    usedCities.add(city.id);
    lastCountry = city.country_id;
  }

  if (route.length < steps) {
    throw new Error("Falha ao gerar rota válida");
  }

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
        next.country_id // Passar país do destino para excluir
      );
      const options = [next.id, ...decoys];
      // Shuffle options to not always have next at index 0?
      // Frontend/Backend logic usually expects primary to be known for generation, but order in UI should be shuffled?
      // If we shuffle here, we need to make sure we don't lose track. 
      // The `options` array order matters if the UI renders them in order.
      // Let's shuffle them here for safety so the first button isn't always the right one.
      for (let k = options.length - 1; k > 0; k--) {
        const j = Math.floor(Math.random() * (k + 1));
        [options[k], options[j]] = [options[j], options[k]];
      }

      optionsJson = JSON.stringify({ options, primary: next.id });
    }

    await pool.execute(
      `INSERT INTO case_route (active_case_id, city_id, step_order, clues_generated_json) VALUES (?, ?, ?, ?)`,
      [activeCaseId, current.id, stepOrder, optionsJson],
    );
  }

  return route;
}
