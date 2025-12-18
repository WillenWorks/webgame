import { v4 as uuid } from 'uuid';
import { getRouteSteps, getStepOptions } from '../repositories/route.repo.js';
import { insertCityPlace } from '../repositories/visit.repo.js';
import pool from '../config/database.js';

function pickRandomPlaceTypes(all, count = 3) {
  // Shuffle shallow copy and take first N
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, all.length)));
}

/**
 * Semeadura refinada por fase
 * - Fase 1 (cidade inicial): 3 locais com dois NEXT_LOCATION e um VILLAIN
 * - Fases 2–4: para cada cidade da fase (options do step anterior):
 *   - Cidade correta (primary): 3 locais com dois NEXT_LOCATION e um VILLAIN
 *   - Cidades decoy: 3 locais VILLAIN (investigação gera WARNING em case_clues)
 * - Fase 5 (final): cidade correta recebe 3 locais; o primeiro local é de captura (tratado na investigação)
 * - Seleção dos place_types: aleatória por cidade, evitando repetição excessiva
 */
export async function seedCasePhases(caseId) {
  // Carregar todos os place_types disponíveis (id, name, interaction_style)
  const [placeTypes] = await pool.execute(
    `SELECT id, name, interaction_style FROM place_types ORDER BY id ASC`
  );
  if (!placeTypes || placeTypes.length < 3) {
    throw new Error('Tipos de locais insuficientes para semeadura');
  }

  const steps = await getRouteSteps(caseId);
  if (!steps || steps.length === 0) return;

  for (let i = 0; i < steps.length; i++) {
    const stepOrder = i + 1;
    const currentStep = steps[i];

    // Selecionar 3 place types aleatórios para esta cidade
    const chosenTypes = pickRandomPlaceTypes(placeTypes, 3);

    if (stepOrder === 1) {
      // Cidade inicial (fase 1): 2 NEXT_LOCATION + 1 VILLAIN
      const clueTypes = ['NEXT_LOCATION', 'NEXT_LOCATION', 'VILLAIN'];
      for (let k = 0; k < 3; k++) {
        const placeTypeId = chosenTypes[k].id;
        await insertCityPlace({
          id: uuid(),
          caseId,
          cityId: currentStep.city_id,
          placeTypeId,
          clueType: clueTypes[k],
        });
      }
      continue;
    }

    // Opções do passo anterior definem as cidades da fase
    const prevOptions = await getStepOptions(caseId, stepOrder - 1);
    if (!prevOptions || !prevOptions.options || prevOptions.options.length === 0) continue;

    const primaryId = prevOptions.primary;
    const phaseCities = prevOptions.options;
    const isFinalStep = stepOrder === steps.length;

    for (const cityId of phaseCities) {
      // Selecionar 3 place types aleatórios para cada cidade desta fase
      const cityPlaceTypes = pickRandomPlaceTypes(placeTypes, 3);
      const isPrimary = cityId === primaryId;

      // Corrigir distribuição conforme cidade correta vs decoy
      const clueTypes = isPrimary
        ? ['NEXT_LOCATION', 'NEXT_LOCATION', 'VILLAIN']
        : ['VILLAIN', 'VILLAIN', 'VILLAIN'];

      const createdIds = [];
      for (let k = 0; k < 3; k++) {
        const placeTypeId = cityPlaceTypes[k].id;
        const newId = uuid();
        await insertCityPlace({
          id: newId,
          caseId,
          cityId,
          placeTypeId,
          clueType: clueTypes[k],
        });
        createdIds.push(newId);
      }

      // Fase final: marcar primeiro local da cidade correta como captura
      if (isFinalStep && isPrimary && createdIds.length > 0) {
        // Não existe coluna/enum para CAPTURE em case_city_places, então usamos flag de captura
        await pool.execute(
          `UPDATE case_city_places SET is_capture_location = 1 WHERE id = ?`,
          [createdIds[0]]
        );
      }
    }
  }
}
