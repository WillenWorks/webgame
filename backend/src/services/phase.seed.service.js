import { v4 as uuid } from 'uuid';
import { getRouteSteps, getStepOptions } from '../repositories/route.repo.js';
import {
  insertCityPlace,
  getAllPlaceTypes,
  getCityPlaceCatalog,
  setCaptureFlag,
} from '../repositories/visit.repo.js';
import { getCaseDifficulty } from '../repositories/case.repo.js';
import { localitiesFor } from '../config/game.rules.js';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Escolhe, para cada slot de pista, uma localidade do catálogo da cidade
 * (`city_places`), sem repetir dentro da cidade. Preferência diegética:
 * - NEXT_LOCATION → marco de enredo (LANDMARK): onde a testemunha "viu" o alvo.
 * - VILLAIN       → local cívico (GENERIC): testemunha comum do dia a dia.
 * Catálogo esgotado → completa com o pool genérico global (`place_types`).
 */
function selectPlacesForCity(catalog, clueTypes, fallbackTypes) {
  const pools = {
    LANDMARK: shuffle(catalog.filter((p) => p.kind === 'LANDMARK')),
    GENERIC: shuffle(catalog.filter((p) => p.kind === 'GENERIC')),
  };
  const usedCatalogIds = new Set();

  const takeFromCatalog = (preferredKind) => {
    const otherKind = preferredKind === 'LANDMARK' ? 'GENERIC' : 'LANDMARK';
    for (const kind of [preferredKind, otherKind]) {
      const hit = pools[kind].find((p) => !usedCatalogIds.has(p.id));
      if (hit) {
        usedCatalogIds.add(hit.id);
        return hit.id;
      }
    }
    return null;
  };

  const fallback = shuffle(fallbackTypes);
  let fbIdx = 0;

  return clueTypes.map((clueType) => {
    const preferred = clueType === 'NEXT_LOCATION' ? 'LANDMARK' : 'GENERIC';
    const cityPlaceId = takeFromCatalog(preferred);
    if (cityPlaceId != null) return { cityPlaceId };

    const fb = fallback[fbIdx % fallback.length];
    fbIdx += 1;
    return { placeTypeId: fb?.id ?? null };
  });
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

  // Pool genérico global — só fallback quando o catálogo da cidade não cobre
  // todos os slots da dificuldade.
  const placeTypes = await getAllPlaceTypes();
  if (!placeTypes || placeTypes.length === 0) {
    throw new Error('Pool de tipos de local (fallback) vazio — rode o seed');
  }

  const steps = await getRouteSteps(caseId);
  if (!steps || steps.length === 0) return;

  // Uma mesma cidade pode aparecer como decoy em mais de um passo do mapa
  // (`buildRoute` só deduplica decoys dentro de um passo, não entre passos).
  // Sem esta trava, `insertLocales` roda 2x para essa cidade e ela passa a
  // exibir 6+ localidades em vez das 3/4/5 estipuladas pela dificuldade.
  const seededCityIds = new Set();

  const insertLocales = async (cityId, clueTypes) => {
    if (seededCityIds.has(cityId)) return [];
    seededCityIds.add(cityId);

    const catalog = await getCityPlaceCatalog(cityId);
    const picks = selectPlacesForCity(catalog, clueTypes, placeTypes);

    const ids = [];
    for (let k = 0; k < clueTypes.length; k++) {
      const id = uuid();
      await insertCityPlace({
        id,
        caseId,
        cityId,
        cityPlaceId: picks[k].cityPlaceId ?? null,
        placeTypeId: picks[k].placeTypeId ?? null,
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
