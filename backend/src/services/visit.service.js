import { v4 as uuid } from "uuid";
import {
  getCurrentCityByCase,
  getCityPlaces,
  insertCityPlace,
  getAllPlaceTypes,
} from "../repositories/visit.repo.js";
import { getStepOptions } from "../repositories/route.repo.js";
import { countRevealedCluesInCity } from "../repositories/clue.repo.js";
import pool from "../config/database.js";
import {
  consumeActionTime,
  estimateTravelMinutes,
  getCaseTimeSummary,
} from "./time.service.js";

const VISIT_MINUTES = 30;

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export async function visitCurrentCityService(caseId) {
  if (!caseId) {
    throw new Error("CaseId não informado");
  }

  // 1️⃣ Cidade atual
  const city = await getCurrentCityByCase(caseId);
  if (!city) {
    throw new Error("Cidade atual não encontrada");
  }

  // 2️⃣ Verificar se já existem locais definidos
  let places = await getCityPlaces(caseId, city.city_id);

  if (places.length === 0) {
    // 3️⃣ Sortear locais (Standard Generation - Reverted from Planner)
    const allPlaces = await getAllPlaceTypes();
    if (allPlaces.length < 3) throw new Error("Tipos de locais insuficientes");
    const selected = allPlaces.slice(0, 3);

    // Embaralhar as pistas e os locais
    const clueMap = shuffleArray(["NEXT_LOCATION", "NEXT_LOCATION", "VILLAIN"]);
    const selectedShuffled = shuffleArray(selected);

    for (let i = 0; i < 3; i++) {
      const placeId = uuid();
      await insertCityPlace({
        id: placeId,
        caseId,
        cityId: city.city_id,
        placeTypeId: selectedShuffled[i].id,
        clueType: clueMap[i],
      });
    }

    places = await getCityPlaces(caseId, city.city_id);
  }

  // 4️⃣ Calcular Tempo de Viagem
  const lastLogSql = `SELECT * FROM case_travel_log WHERE active_case_id = ? ORDER BY created_at DESC LIMIT 1`;
  const [logs] = await pool.query(lastLogSql, [caseId]);
  const lastLog = logs[0];

  let travelTime = 0;
  if (lastLog && !lastLog.arrival_time) {
    const fromCityId = lastLog.from_city_id;
    const toCityId = lastLog.to_city_id;

    const minutes = await estimateTravelMinutes(fromCityId, toCityId );
    await consumeActionTime({ caseId, minutes, timezone: "America/Sao_Paulo" });
    await pool.query(
      `UPDATE case_travel_log SET arrival_time = NOW() WHERE id = ?`,
      [lastLog.id],
    );
    travelTime = minutes;
  }

  const timeState = await getCaseTimeSummary({ caseId });

  // Debug: Check what getCityPlaces returns
  // Note: getCityPlaces returns columns: id, place_type_id, name, interaction_style, clue_type
  // The map below was mapping p.place_name which doesn't exist in the query result (it's p.name)

  // 4️⃣ Obter opções de viagem
  // REGRA: Só mostrar opções se houver pelo menos 1 pista revelada NESTA cidade
  let travelOptions = [];
  const cluesRevealed = await countRevealedCluesInCity(caseId, city.city_id);

  // Se for o PRIMEIRO passo (step_order 1), exige pista revelada.
  // Se for passo > 1 (já viajou), permite ver o mapa para voltar/corrigir, mesmo sem pista nova?
  // O usuário disse: "Se for primeiro passo, não mostra nada ateé ter colhido uma pista. Assim que colher,mostra... Nesse caso (depois de viajar errado), agora já poderia ter as rotas visiveis"
  const isFirstStep = city.step_order === 1;
  const shouldShowMap = !isFirstStep || cluesRevealed > 0;

  if (shouldShowMap) {
    const stepOptions = await getStepOptions(caseId, city.step_order);

    if (stepOptions?.options?.length > 0) {
      const ids = stepOptions.options;
      const placeholders = ids.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT c.id, c.name, ST_Y(c.geo_coordinates) as lat, ST_X(c.geo_coordinates) as lon, co.name as country_name, c.description_prompt as description_prompt, c.image_url as image_url 
         FROM cities c 
         JOIN countries co ON co.id = c.country_id 
         WHERE c.id IN (${placeholders})`,
        ids,
      );

      

      // Calcular estimativas em paralelo
      travelOptions = await Promise.all(
        rows.map(async (r) => {
          let travelTime = 0;
          try {
            travelTime = await estimateTravelMinutes(
              city.city_id,
              r.id,
              caseId
            );
          } catch (e) {
            console.warn(
              `Erro ao calcular tempo para cidade ${r.id}:`,
              e.message,
            );
          }

          const hours = Math.floor(travelTime / 60);
          const mins = travelTime % 60;
          const formatted =
            hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins}m`;

          return {
            id: r.id,
            name: r.name,
            country_name: r.country_name,
            latitude: r.lat,
            longitude: r.lon,
            travel_time_minutes: travelTime,
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
      name: p.name, // FIXED: was p.place_name, should be p.name (from place_types.name alias in query)
      type: p.place_type_id,
      interactionStyle: p.interaction_style,
      clueType: p.clue_type,
    })),
    travelTime,
    timeState,
    cluesRevealed,
    travelOptions
  };
}
