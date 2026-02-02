import { v4 as uuid } from "uuid";
import { getCurrentCityByCase, getCityPlaceById } from "../repositories/visit.repo.js";
import { getNextCityByCase, getStepOptions } from "../repositories/route.repo.js";
import { getExistingClueByCityPlace, insertClue } from "../repositories/clue.repo.js";
import { getCulpritByCase } from "../repositories/suspect.repo.js";
import { getCaseById, setCapturePlace } from "../repositories/warrant.repo.js";
import { insertCapturedVillainLog } from "../repositories/captured.repo.js";
import { getCurrentView } from "../repositories/current_view.repo.js";
import { generateClue } from "./clue.generator.service.js"; 
import { consumeActionTime, getCaseTimeSummary } from "./time.service.js"; 
import { finishCaseService } from "./finish_case.service.js";

export async function investigateService(caseId, cityPlaceId) {
  if (!cityPlaceId) throw new Error("cityPlaceId não informado");

  const city = await getCurrentCityByCase(caseId);
  if (!city) throw new Error("Cidade atual não encontrada");

  const place = await getCityPlaceById(caseId, cityPlaceId);
  if (!place || place.city_id !== city.city_id) throw new Error("Local inválido para a cidade atual");

  // 1️⃣ Consumir tempo de investigação (60 min)
  const timeResult = await consumeActionTime({ 
    caseId, 
    minutes: 60, 
    timezone: "America/Sao_Paulo" 
  });
  
  // Obter timeState atualizado
  const timeState = await getCaseTimeSummary({ caseId });

  // Verificar se o tempo acabou
  if (timeResult.failed) {
    return await finishCaseService({
      caseId,
      status: "FAILED",
      finalDialogue: "O tempo esgotou! O vilão escapou enquanto você investigava.",
      timeState,
      isDecoy: false
    });
  }

  // 2️⃣ Verificar se é Local de Captura (Fase Final)
  if (place.is_capture_location) {
    const gameCase = await getCaseById(caseId);
    const culprit = await getCulpritByCase(caseId);

    if (!gameCase.warrant_suspect_id) {
      // Falha se tentar capturar sem mandado
      return await finishCaseService({
        caseId,
        status: "FAILED",
        finalDialogue: "Você encontrou o suspeito, mas sem um mandado emitido, não pode efetuar a prisão! Ele fugiu!",
        timeState,
        isDecoy: false
      });
    }

    const isCorrectWarrant = gameCase.warrant_suspect_id === culprit.id;
    const finalDialogue = isCorrectWarrant
      ? "Você cercou o vilão e efetuou a prisão sem incidentes! Bom trabalho, Detetive."
      : "Você prendeu a pessoa errada... O verdadeiro criminoso escapou!";
      
    // Registrar log de captura
    await insertCapturedVillainLog({
      id: uuid(),
      profileId: gameCase.profile_id,
      caseId,
      villainName: culprit?.name || "Desconhecido",
      attributesSnapshot: {
        sex: culprit?.sex,
        hair: culprit?.hair,
        hobby: culprit?.hobby,
        vehicle: culprit?.vehicle,
        feature: culprit?.feature,
      },
      finalDialogue,
    });

    try { await setCapturePlace(caseId, cityPlaceId); } catch {}
    
    return await finishCaseService({
      caseId,
      status: isCorrectWarrant ? "SOLVED" : "FAILED",
      finalDialogue,
      timeState,
      isDecoy: false
    });
  }

  // 3️⃣ Verificar Cache de Pista (se já visitou, retorna a mesma fala)
  const existing = await getExistingClueByCityPlace(caseId, cityPlaceId);
  if (existing) {
    return {
      text: existing.generated_text,
      timeState,
      isRepeat: true
    };
  }

  // 4️⃣ Preparar dados para Geração de Pista
  const optionsMeta = await getStepOptions(caseId, city.step_order);
  const view = await getCurrentView(caseId, city.step_order);
  
  // Lógica de Decoy
  const isDecoy = Boolean(
    view && optionsMeta && Array.isArray(optionsMeta.options) &&
    optionsMeta.options.includes(view.city_id) &&
    view.city_id !== optionsMeta.primary
  );

  let clueType = place.clue_type;
  let targetType = "NONE";
  let targetValue = null;
  var resolvedAttrValue = null;
  var targetRefId = null;
  
  // Determinar alvo da pista
  if (isDecoy) {
    clueType = "WARNING"; 
  } else {
    if (clueType === "NEXT_LOCATION") {
      const nextCity = await getNextCityByCase(caseId, city.step_order);
      if (!nextCity) {
        clueType = "WARNING"; 
      } else {
        targetType = "CITY";
        targetValue = nextCity.city_name; 
      }
    } else if (clueType === "VILLAIN") {
      const culprit = await getCulpritByCase(caseId);
      const attrs = [
        { key: "vehicle", label: culprit.vehicle, ref: culprit.vehicle_id },
        { key: "hobby", label: culprit.hobby, ref: culprit.hobby_id },
        { key: "hair", label: culprit.hair, ref: culprit.hair_id },
        { key: "feature", label: culprit.feature, ref: culprit.feature_id },
      ];
      const chosen = attrs[Math.floor(Math.random() * attrs.length)];
      clueType = "VILLAIN_ATTRIBUTE";
      targetType = "VILLAIN_ATTR";
      targetValue = chosen.key; 
      resolvedAttrValue = chosen.label;
      targetRefId = chosen.ref;
    }
  }

  // Determinar Reputação e Dificuldade
  const [[prof]] = await (await import('../config/database.js')).default.execute(
    'SELECT gd.code AS difficulty_code, p.id as profile_id FROM active_cases ac JOIN game_difficulty gd ON gd.id = ac.difficulty_id JOIN profiles p ON p.id = ac.profile_id WHERE ac.id = ?',
    [caseId]
  );
  const difficulty = prof?.difficulty_code || 'EASY';
  const profileId = prof?.profile_id;
  
  // Buscar reputação real
  const [[pRow]] = await (await import('../config/database.js')).default.execute('SELECT reputation_score FROM profiles WHERE id = ?', [profileId]);
  const score = pRow?.reputation_score || 0;
  
  let reputation = "NEUTRA";
  if (score > 1000) reputation = "ALTA";
  if (score < 0) reputation = "BAIXA"; 

  // Gerar Pista (Texto)
  const clueResult = await generateClue({
    archetype: place.interaction_style,
    reputation,
    clueData: {
      clue_type: clueType,
      target_type: targetType,
      target_value: targetValue,
      resolved_value: resolvedAttrValue || null 
    },
    context: {
      city: city.city_name,
      difficulty: difficulty === 'HARD' ? 1.2 : (difficulty === 'EXTREME' ? 1.5 : 1.0),
      mode: isDecoy ? 'decoy' : (optionsMeta ? 'primary' : 'final'),
      phase: city.step_order
    }
  });

  const generatedText = clueResult.text;
  
  // Salvar Pista
  const revealed = (!isDecoy && (place.clue_type === "NEXT_LOCATION" || place.clue_type === "VILLAIN")) ? 1 : 0;
  
  await insertClue({
    id: uuid(),
    caseId,
    cityPlaceId,
    clueType,
    targetType,
    targetValue,
    targetRefId: targetRefId || null,
    generatedText,
    revealed,
  });

  return {
    text: generatedText,
    timeState,
    clueType, 
    revealed
  };
}
