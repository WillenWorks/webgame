import { v4 as uuid } from "uuid";
import {
  getCurrentCityByCase,
  getCityPlaces,
  insertCityPlace,
  getAllPlaceTypes,
} from "../repositories/visit.repo.js";
import { getStepOptions } from "../repositories/route.repo.js";
import { getLastTravelLogForStep } from "../repositories/travel_log.repo.js";
import pool from "../config/database.js";
import { consumeActionTime } from "./time.service.js";

const VISIT_MINUTES = 30;

export async function visitCurrentCityService(caseId) {
  if (!caseId) {
    throw new Error("CaseId não informado");
  }

  // 1️⃣ Cidade atual (primeiro passo não visitado)
  const city = await getCurrentCityByCase(caseId);
  if (!city) {
    throw new Error("Cidade atual não encontrada");
  }

  // 2️⃣ Verificar se já existem locais definidos
  const existingPlaces = await getCityPlaces(caseId, city.city_id);
  if (existingPlaces.length === 3) {
    // Consome tempo da visita
    await consumeActionTime({ caseId, minutes: VISIT_MINUTES, timezone: 'America/Sao_Paulo' });
  try {
    const { v4: uuidv4 } = await import('uuid');
    await pool.execute(
      'INSERT INTO case_visit_log (id, case_id, city_id, step_order) VALUES (?, ?, ?, ?)',
      [uuidv4(), caseId, city.city_id ?? targetCityId ?? 0, (city?.step_order ?? current?.step_order ?? 0)]
    );
  } catch (e) {
    console.warn('[visit] falha ao registrar case_visit_log:', String(e));
  }
    return {
      city,
      places: existingPlaces,
    };
  }

  // 3️⃣ Sortear locais (primeira visita)
  const allPlaces = await getAllPlaceTypes();
  if (allPlaces.length < 3) {
    throw new Error("Tipos de locais insuficientes");
  }
  const selected = allPlaces.slice(0, 3);

  // 4️⃣ Definir tipos de pista (compatível com enum da tabela case_city_places)
  // case_city_places.clue_type enum('NEXT_LOCATION','VILLAIN')
  const clueMap = ["NEXT_LOCATION", "NEXT_LOCATION", "VILLAIN"];

  const finalPlaces = [];
  for (let i = 0; i < 3; i++) {
    const placeId = uuid();
    await insertCityPlace({
      id: placeId,
      caseId,
      cityId: city.city_id,
      placeTypeId: selected[i].id,
      clueType: clueMap[i],
    });

    finalPlaces.push({
      id: placeId,
      place_type_id: selected[i].id,
      name: selected[i].name,
      interaction_style: selected[i].interaction_style,
      clue_type: clueMap[i],
    });
  }

  // Consome tempo da visita
  await consumeActionTime({ caseId, minutes: VISIT_MINUTES, timezone: 'America/Sao_Paulo' });

  return {
    city,
    places: finalPlaces,
  };
}

export async function visitCityService(caseId, requestedCityId = null) {
  if (!caseId) {
    throw new Error('CaseId não informado');
  }

  // Cidade atual (primeiro passo não visitado)
  const current = await getCurrentCityByCase(caseId);
  if (!current) {
    throw new Error('Cidade atual não encontrada');
  }

  let targetCityId = current.city_id;

  // Recuperar opções válidas do step atual
  const optionsMeta = await getStepOptions(caseId, current.step_order);
  const allowed = Array.isArray(optionsMeta?.options) ? optionsMeta.options : [];

  // Caso o usuário especifique uma cidade (via query), usar se for válida
  if (requestedCityId) {
    if (!allowed.includes(requestedCityId)) {
      throw new Error('Cidade inválida para visita neste passo');
    }
    targetCityId = requestedCityId;
  } else {
    // Caso recente de viagem incorreta: mostrar a cidade escolhida (decoy) sem avançar
    const lastLog = await getLastTravelLogForStep(caseId, current.step_order);
    if (lastLog && lastLog.success === 0 && allowed.includes(lastLog.to_city_id)) {
      targetCityId = lastLog.to_city_id;
    }
  }

  // Garantir que existem locais para a cidade alvo
  const existingPlaces = await getCityPlaces(caseId, targetCityId);
  if (existingPlaces.length === 0) {
    // Se não foram semeados previamente (edge cases), criar 3 locais com place_types aleatórios
    const [placeTypes] = await pool.execute(
      `SELECT id, name, interaction_style FROM place_types ORDER BY RAND()`
    );
    const chosen = placeTypes.slice(0, 3);
    // Para cidades decoy, semear como VILLAIN (investigação gera WARNING)
    const clueTypes = ['VILLAIN', 'VILLAIN', 'VILLAIN'];
    for (let i = 0; i < chosen.length; i++) {
      await insertCityPlace({
        id: uuid(),
        caseId,
        cityId: targetCityId,
        placeTypeId: chosen[i].id,
        clueType: clueTypes[i] || 'VILLAIN',
      });
    }
  }

  const places = await getCityPlaces(caseId, targetCityId);

  // Consome tempo da visita
  await consumeActionTime({ caseId, minutes: VISIT_MINUTES, timezone: 'America/Sao_Paulo' });

  // Montar retorno
  return {
    city: {
      step_order: current.step_order,
      city_id: targetCityId,
    },
    places,
  };
}
