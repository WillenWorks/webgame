import {
  getCurrentCityByCase,
  getCityPlaces,
} from "../repositories/visit.repo.js";
import { getStepOptions } from "../repositories/route.repo.js";
import { countRevealedCluesInCity } from "../repositories/clue.repo.js";
import { getCitiesByIds } from "../repositories/city.repo.js";
import { estimateTravelMinutes, getCaseTimeSummary } from "./time.service.js";

/**
 * Estado da cidade atual: locais para investigar (semeados por `seedCasePhases`)
 * e opções de destino disponíveis. O tempo de viagem é cobrado em
 * `travelService` (ação de viajar) — aqui NÃO se consome tempo.
 */
export async function visitCurrentCityService(caseId) {
  if (!caseId) {
    throw new Error("CaseId não informado");
  }

  const city = await getCurrentCityByCase(caseId);
  if (!city) {
    throw new Error("Cidade atual não encontrada");
  }

  const places = await getCityPlaces(caseId, city.city_id);
  const travelTime = 0;

  const timeState = await getCaseTimeSummary({ caseId });

  // Opções de viagem: só depois de revelar ao menos 1 pista na cidade (passo 1);
  // após um erro de rota o mapa fica visível para correção.
  let travelOptions = [];
  const cluesRevealed = await countRevealedCluesInCity(caseId, city.city_id);
  const shouldShowMap = city.step_order !== 1 || cluesRevealed > 0;

  if (shouldShowMap) {
    const stepOptions = await getStepOptions(caseId, city.step_order);
    if (stepOptions?.options?.length > 0) {
      const rows = await getCitiesByIds(stepOptions.options);
      travelOptions = await Promise.all(
        rows.map(async (r) => {
          let mins = 0;
          try {
            mins = await estimateTravelMinutes(city.city_id, r.id, caseId);
          } catch {
            mins = 0;
          }
          const hours = Math.floor(mins / 60);
          const rest = mins % 60;
          const formatted = hours > 0 ? `${hours}h${rest > 0 ? ` ${rest}m` : ""}` : `${rest}m`;
          return {
            id: r.id,
            name: r.name,
            country_name: r.country_name,
            latitude: r.lat,
            longitude: r.lon,
            travel_time_minutes: mins,
            travel_time_formatted: formatted,
            description_prompt: r.description_prompt,
            image_url: r.image_url,
          };
        }),
      );
    }
  }

  return {
    city,
    places: places.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.place_type_id,
      interactionStyle: p.interaction_style,
      clueType: p.clue_type,
    })),
    travelTime,
    timeState,
    cluesRevealed,
    travelOptions,
  };
}
