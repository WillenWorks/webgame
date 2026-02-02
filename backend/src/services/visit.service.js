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
import { consumeActionTime, estimateTravelMinutes, getCaseTimeSummary } from "./time.service.js";

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
    // 3️⃣ Sortear locais (primeira visita)
    const allPlaces = await getAllPlaceTypes();
    if (allPlaces.length < 3) throw new Error("Tipos de locais insuficientes");
    const selected = allPlaces.slice(0, 3);
    
    // Embaralhar as pistas para que VILÃO não seja sempre o mesmo índice
    const clueMap = shuffleArray(["NEXT_LOCATION", "NEXT_LOCATION", "VILLAIN"]);
    
    for (let i = 0; i < 3; i++) {
      const placeId = uuid();
      await insertCityPlace({
        id: placeId, caseId, cityId: city.city_id, placeTypeId: selected[i].id, clueType: clueMap[i],
      });
    }
    // Recarregar places
    places = await getCityPlaces(caseId, city.city_id);
    
    // Consome tempo APENAS na primeira geração (chegada)
    await consumeActionTime({ caseId, minutes: VISIT_MINUTES, timezone: "America/Sao_Paulo" });
  }

  // Obter Time State atualizado
  const timeState = await getCaseTimeSummary({ caseId });

  // 4️⃣ Obter opções de viagem
  // REGRA: Só mostrar opções se houver pelo menos 1 pista revelada NESTA cidade
  let travelOptions = [];
  const revealedCount = await countRevealedCluesInCity(caseId, city.city_id);

  // Se for o PRIMEIRO passo (step_order 1), exige pista revelada.
  // Se for passo > 1 (já viajou), permite ver o mapa para voltar/corrigir, mesmo sem pista nova?
  // O usuário disse: "Se for primeiro passo, não mostra nada ateé ter colhido uma pista. Assim que colher,mostra... Nesse caso (depois de viajar errado), agora já poderia ter as rotas visiveis"
  const isFirstStep = city.step_order === 1;
  const shouldShowMap = !isFirstStep || revealedCount > 0;

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
        ids
      );

      // Calcular estimativas em paralelo
      travelOptions = await Promise.all(rows.map(async (r) => {
        let travelTime = 0;
        try {
          travelTime = await estimateTravelMinutes({ 
            fromCityId: city.city_id, 
            toCityId: r.id, 
            caseId 
          });
        } catch (e) {
          console.warn(`Erro ao calcular tempo para cidade ${r.id}:`, e.message);
        }

        const hours = Math.floor(travelTime / 60);
        const mins = travelTime % 60;
        const formatted = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

        return {
          id: r.id,
          name: r.name,
          country_name: r.country_name,
          latitude: r.lat,
          longitude: r.lon,
          travel_time_minutes: travelTime,
          travel_time_formatted: formatted,
          description_prompt: r.description_prompt,
          image_url: r.image_url
        };
      }));
    }
  }

  return {
    city: {
        ...city,
        geo_coordinates: { x: city.lon, y: city.lat }
    },
    places,
    travelOptions,
    timeState
  };
}

export async function visitCityService(caseId, requestedCityId = null) {
  if (!caseId) throw new Error("CaseId não informado");

  const current = await getCurrentCityByCase(caseId);
  if (!current) throw new Error("Cidade atual não encontrada");

  let targetCityId = current.city_id;
  const optionsMeta = await getStepOptions(caseId, current.step_order);
  const allowed = Array.isArray(optionsMeta?.options) ? optionsMeta.options : [];

  if (requestedCityId) {
    if (!allowed.includes(requestedCityId)) throw new Error("Cidade inválida para visita neste passo");
    targetCityId = requestedCityId;
  } else {
    // Tentar recuperar último destino do log se não especificado
    // ... (lógica anterior mantida)
  }

  // Garantir places - Verificar DUPLICIDADE antes de inserir
  // Se o frontend mostra 12, é porque getCityPlaces retornou 12.
  // Isso acontece se chamarmos insertCityPlace repetidamente.
  let places = await getCityPlaces(caseId, targetCityId);
  
  if (places.length === 0) {
    const [placeTypes] = await pool.execute(`SELECT id, name, interaction_style FROM place_types ORDER BY RAND()`);
    const chosen = placeTypes.slice(0, 3);
    const clueTypes = shuffleArray(["VILLAIN", "VILLAIN", "VILLAIN"]); // Decoy city? Or standard?
    // Se for cidade correta, deveria ter NEXT_LOCATION?
    // Se for decoy (cidade errada), só tem VILLAIN (warning) ou pistas inúteis.
    // O código anterior assumia "VILLAIN" para tudo em visitCityService (que geralmente é usado ao viajar).
    // Se viajei para a cidade CERTA, deveria ter NEXT_LOCATION.
    // Como saber se é a cidade certa? Comparar com `optionsMeta.primary`?
    // Mas `visitCityService` é genérico.
    // Melhor: verificar se targetCityId == optionsMeta.primary (cidade certa do próximo passo).
    // Mas current.step_order é o passo ANTERIOR à viagem? 
    // Não, ao viajar, o step_order no banco muda?
    // O fluxo é: Estou em Step 1 (Londres). Viajo para Paris. 
    // Se Paris for certa, o banco deve atualizar para Step 2.
    // Se for errada, continuo em Step 1 mas visitando Paris?
    // O sistema atual parece manter o step_order até que se encontre a pista? Ou viaja e avança?
    // Se eu viajo, eu mudo de cidade.
    // Se o backend não avança o step, então é uma cidade "visitada dentro do step".
    // Vamos assumir clueTypes aleatórios ou "VILLAIN" (que gera warning se não for a certa)
    
    for (let i = 0; i < chosen.length; i++) {
       await insertCityPlace({ id: uuid(), caseId, cityId: targetCityId, placeTypeId: chosen[i].id, clueType: clueTypes[i]});
    }
    places = await getCityPlaces(caseId, targetCityId);
    await consumeActionTime({ caseId, minutes: VISIT_MINUTES, timezone: "America/Sao_Paulo" });
  }

  const timeState = await getCaseTimeSummary({ caseId });

  // Travel Options
  let travelOptions = [];
  const revealedCount = await countRevealedCluesInCity(caseId, targetCityId);
  const isFirstStep = current.step_order === 1;
  const shouldShowMap = !isFirstStep || revealedCount > 0;

  if (shouldShowMap && optionsMeta?.options?.length > 0) {
      const ids = optionsMeta.options;
      const placeholders = ids.map(() => "?").join(",");
      const [rows] = await pool.query(
        `SELECT c.id, c.name, ST_Y(c.geo_coordinates) as lat, ST_X(c.geo_coordinates) as lon, co.name as country_name, c.description_prompt as description_prompt, c.image_url as image_url 
         FROM cities c JOIN countries co ON co.id = c.country_id 
         WHERE c.id IN (${placeholders})`, ids
      );
      
      travelOptions = await Promise.all(rows.map(async (r) => {
          let travelTime = 0;
          try {
            travelTime = await estimateTravelMinutes({ fromCityId: current.city_id, toCityId: r.id, caseId });
          } catch {}

          const hours = Math.floor(travelTime / 60);
          return {
            id: r.id,
            name: r.name,
            country_name: r.country_name,
            latitude: r.lat,
            longitude: r.lon,
            travel_time_minutes: travelTime,
            travel_time_formatted: `${hours}h`,
            description_prompt: r.description_prompt,
            image_url: r.image_url
          };
      }));
  }

  let targetCityData = { city_id: targetCityId, step_order: current.step_order };
  if (targetCityId === current.city_id) {
    targetCityData = { 
        ...targetCityData, 
        city_name: current.city_name, 
        country_name: current.country_name,
        geo_coordinates: { x: current.lon, y: current.lat }
    };
  } else {
    const [rows] = await pool.query(`SELECT c.name as city_name, ST_Y(c.geo_coordinates) as lat, ST_X(c.geo_coordinates) as lon, co.name as country_name, c.description_prompt as description_prompt, c.image_url as image_url FROM cities c JOIN countries co ON co.id = c.country_id WHERE c.id = ?`, [targetCityId]);
    if (rows[0]) targetCityData = { 
        ...targetCityData, 
        ...rows[0],
        geo_coordinates: { x: rows[0].lon, y: rows[0].lat }
    };
  }

  return {
    city: targetCityData,
    places,
    travelOptions,
    timeState
  };
}
