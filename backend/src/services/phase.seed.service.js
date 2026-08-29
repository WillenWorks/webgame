import { v4 as uuid } from 'uuid';
import { getRouteSteps, getStepOptions } from '../repositories/route.repo.js';
import { insertCityPlace, getAllPlaceTypes, setCaptureFlag } from '../repositories/visit.repo.js';
import { getCaseDifficulty } from '../repositories/case.repo.js';
import { localitiesFor } from '../config/game.rules.js';

function pickRandomPlaceTypes(all, count) {
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(1, Math.min(count, all.length)));
}

/**
 * Semeadura de localidades por fase, com quantidade e mix variáveis por
 * dificuldade (`config/game.rules.js`):
 * - Cidade correta de cada fase: mix `LOCALITIES_BY_DIFFICULTY` (2 NEXT_LOCATION
 *   + N VILLAIN).
 * - Cidades decoy: mesma quantidade de locais, todos VILLAIN (investigar num
 *   decoy sempre gera WARNING).
 * - Fase final: o primeiro local da cidade correta é o ponto de captura.
 */
export async function seedCasePhases(caseId, difficulty = null) {
  const diff = difficulty || (await getCaseDifficulty(caseId)) || 'EASY';
  const clueMix = localitiesFor(diff);
  const localesPerCity = clueMix.length;

  const placeTypes = await getAllPlaceTypes();
  if (!placeTypes || placeTypes.length < localesPerCity) {
    throw new Error('Tipos de locais insuficientes para semeadura');
  }

  const steps = await getRouteSteps(caseId);
  if (!steps || steps.length === 0) return;

  const insertLocales = async (cityId, clueTypes) => {
    const chosen = pickRandomPlaceTypes(placeTypes, clueTypes.length);
    const ids = [];
    for (let k = 0; k < clueTypes.length; k++) {
      const id = uuid();
      await insertCityPlace({
        id,
        caseId,
        cityId,
        placeTypeId: chosen[k % chosen.length].id,
        clueType: clueTypes[k],
      });
      ids.push(id);
    }
    return ids;
  };

  for (let i = 0; i < steps.length; i++) {
    const stepOrder = i + 1;
    const currentStep = steps[i];
    const isFinalStep = stepOrder === steps.length;

    if (stepOrder === 1) {
      await insertLocales(currentStep.city_id, clueMix);
      continue;
    }

    const prevOptions = await getStepOptions(caseId, stepOrder - 1);
    if (!prevOptions || !prevOptions.options || prevOptions.options.length === 0) continue;

    const primaryId = prevOptions.primary;
    for (const cityId of prevOptions.options) {
      const isPrimary = cityId === primaryId;
      const clueTypes = isPrimary ? clueMix : Array(localesPerCity).fill('VILLAIN');
      const createdIds = await insertLocales(cityId, clueTypes);

      if (isFinalStep && isPrimary && createdIds.length > 0) {
        await setCaptureFlag(createdIds[0], true);
      }
    }
  }
}
