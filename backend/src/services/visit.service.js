import {
  getCurrentCityByCase,
  getCityPlaces,
} from "../repositories/visit.repo.js";
import { getStepOptions } from "../repositories/route.repo.js";
import { countRevealedCluesInCity } from "../repositories/clue.repo.js";
import { getCitiesByIds } from "../repositories/city.repo.js";
import { getCaseDifficulty } from "../repositories/case.repo.js";
import { localitiesFor } from "../config/game.rules.js";
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

  // Trava de segurança: a dificuldade estipula quantas localidades cada cidade
  // tem (EASY 3 · HARD 4 · EXTREME 5). Casos gerados antes da correção de
  // double-seed de decoys podem ter linhas duplicadas — limita a exibição ao
  // teto da dificuldade para não vazar 6+ locais na tela.
  const difficulty = (await getCaseDifficulty(caseId)) || "EASY";
  const maxPlaces = localitiesFor(difficulty).length;
  const allPlaces = await getCityPlaces(caseId, city.city_id);
  const places = allPlaces.slice(0, maxPlaces);
  const travelTime = 0;

  const timeState = await getCaseTimeSummary({ caseId });

  // Opções de viagem:
  // - Se o jogador está num DECOY: o mapa permanece visível para permitir
  //   escolher entre os outros destinos já colocados no mapa (excluindo o decoy atual).
  // - Se o jogador está na cidade canônica do passo: exige ao menos 1 pista
  //   revelada nesta cidade para liberar os destinos (em todos os passos).
  let travelOptions = [];
  const stepOptions = await getStepOptions(caseId, city.step_order);
  const primaryCityId = stepOptions?.primary ?? null;
  const isDecoy = Boolean(
    stepOptions?.options?.includes(city.city_id) &&
    city.city_id !== primaryCityId
  );

  const cluesRevealed = await countRevealedCluesInCity(caseId, city.city_id);
  const shouldShowMap = isDecoy || cluesRevealed > 0;

  if (shouldShowMap && stepOptions?.options?.length > 0) {
    // Se estiver em um decoy, exclui a cidade atual das opções (não faz sentido voar para onde já está)
    const candidateIds = isDecoy
      ? stepOptions.options.filter((id) => id !== city.city_id)
      : stepOptions.options;

    if (candidateIds.length > 0) {
      const rows = await getCitiesByIds(candidateIds);
      travelOptions = await Promise.all(
        rows.map(async (r) => {
          let mins;
          try {
            mins = await estimateTravelMinutes(city.city_id, r.id, caseId);
          } catch (e) {
            console.warn(`[visit] estimateTravelMinutes falhou (${city.city_id} -> ${r.id}), assumindo 0:`, String(e?.message || e));
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
      type: p.city_place_id ?? p.place_type_id,
      cityPlaceId: p.city_place_id,
      interactionStyle: p.interaction_style,
      clueType: p.clue_type,
    })),
    travelTime,
    timeState,
    cluesRevealed,
    travelOptions,
    isDecoy: Boolean(isDecoy),
  };
}
