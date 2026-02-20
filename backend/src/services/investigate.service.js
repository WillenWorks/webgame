import { v4 as uuid } from "uuid";
import { getCurrentCityByCase, getCityPlaceById } from "../repositories/visit.repo.js";
import { getNextCityByCase, getStepOptions } from "../repositories/route.repo.js";
import { getExistingClueByCityPlace, insertClue, getCluesByCaseAndCity } from "../repositories/clue.repo.js";
import { getCulpritByCase } from "../repositories/suspect.repo.js";
import { getCaseById, setCapturePlace } from "../repositories/warrant.repo.js";
import { insertCapturedVillainLog } from "../repositories/captured.repo.js";
import { getCurrentView } from "../repositories/current_view.repo.js";
import { generateClue } from "./clue.generator.service.js"; 
import { consumeActionTime, getCaseTimeSummary } from "./time.service.js"; 
import { finishCaseService } from "./finish_case.service.js";
import { pickNextVillainClue } from "./clue.manager.service.js"; // NEW

export async function investigateService(caseId, cityPlaceId) {
  if (!cityPlaceId) throw new Error("cityPlaceId não informado");

  const city = await getCurrentCityByCase(caseId);
  if (!city) throw new Error("Cidade atual não encontrada");

  const place = await getCityPlaceById(caseId, cityPlaceId);
  if (!place || place.city_id !== city.city_id) throw new Error("Local inválido para a cidade atual");

  // 1️⃣ Tempo (60 min)
  const timeResult = await consumeActionTime({ 
    caseId, 
    minutes: 60, 
    timezone: "America/Sao_Paulo" 
  });
  
  const timeState = await getCaseTimeSummary({ caseId });

  if (timeResult.failed) {
    return await finishCaseService({
      caseId,
      status: "FAILED",
      finalDialogue: "O tempo esgotou! O vilão escapou enquanto você investigava.",
      timeState,
      isDecoy: false
    });
  }

  // 2️⃣ Captura
  if (place.is_capture_location) {
    const gameCase = await getCaseById(caseId);
    const culprit = await getCulpritByCase(caseId);

    if (!gameCase.warrant_suspect_id) {
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

  // 3️⃣ Cache de Pista
  const existing = await getExistingClueByCityPlace(caseId, cityPlaceId);
  if (existing) {
    return {
      text: existing.generated_text,
      timeState,
      isRepeat: true
    };
  }

  // 4️⃣ JIT Generation com DB Control
  const optionsMeta = await getStepOptions(caseId, city.step_order);
  const view = await getCurrentView(caseId, city.step_order);
  
  // Decoy Logic
  const isDecoy = Boolean(
    view && optionsMeta && Array.isArray(optionsMeta.options) &&
    optionsMeta.options.includes(view.city_id) &&
    view.city_id !== optionsMeta.primary
  );

  let clueType = place.clue_type;
  let targetType = "NONE";
  let targetValue = null;
  let resolvedAttrValue = null;
  let targetRefId = null;
  
  // Determinar alvo da pista
  if (isDecoy) {
    clueType = "WARNING"; 
  } else {
    if (clueType === "NEXT_LOCATION") {
      const nextCity = await getNextCityByCase(caseId, city.step_order);
      if (!nextCity) {
        clueType = "WARNING"; // Fallback if no next city (should happen only if DB is corrupted or final step logic mismatch)
      } else {
        targetType = "CITY";
        targetValue = `${nextCity.city_name}, ${nextCity.country_name}`; 
        
        // Topic Rotation Logic (Simple)
        const TOPICS = ['História', 'Geografia', 'Economia', 'Culinária', 'Arte', 'Religião', 'Costumes', 'Bandeira'];
        // Get existing clues in this city to see what topic was used?
        // Actually, we can just random pick. Collisions in *topics* are fine, just not identical text.
        // But let's try to pass a specific topicCategory to the prompt builder.
        const topicCategory = TOPICS[Math.floor(Math.random() * TOPICS.length)];
        // Pass this down via context
        // Note: investigateService doesn't pass 'context' fully custom yet, we need to adapt `generateClue` call below.
      }
    } else if (clueType === "VILLAIN") {
       // NEW: Pick from DB Pool
       const pickedClue = await pickNextVillainClue(caseId);
       
       if (pickedClue) {
           clueType = "VILLAIN_ATTRIBUTE";
           targetType = "VILLAIN_ATTR";
           targetValue = pickedClue.attribute_type; // "hair"
           resolvedAttrValue = pickedClue.attribute_value; // "Loiro"
           targetRefId = pickedClue.target_ref_id;
       } else {
           // No more clues available?
           clueType = "WARNING"; // Or generic "I don't know anything else"
           // Or fallback to repeating one?
       }
    }
  }
  
  // Get Difficulty & Reputation (Kept from v12)
  const [[prof]] = await (await import('../config/database.js')).default.execute(
    'SELECT gd.code AS difficulty_code, p.id as profile_id FROM active_cases ac JOIN game_difficulty gd ON gd.id = ac.difficulty_id JOIN profiles p ON p.id = ac.profile_id WHERE ac.id = ?',
    [caseId]
  );
  const difficulty = prof?.difficulty_code || 'EASY';
  const profileId = prof?.profile_id;
  const [[pRow]] = await (await import('../config/database.js')).default.execute('SELECT reputation_score FROM profiles WHERE id = ?', [profileId]);
  let reputation = "NEUTRA";
  if (pRow?.reputation_score > 1000) reputation = "ALTA";
  if (pRow?.reputation_score < 0) reputation = "BAIXA";
  
  // Villain Sex
  let villainSex = 'Indefinido';
  if (clueType === 'VILLAIN' || clueType === 'VILLAIN_ATTRIBUTE') {
      const c = await getCulpritByCase(caseId);
      if (c) villainSex = c.sex;
  }
  
  // Call Generator
  const context = {
      city: city.city_name,
      difficulty: difficulty === 'HARD' ? 1.2 : 1.0,
      mode: isDecoy ? 'decoy' : (optionsMeta ? 'primary' : 'final'),
      phase: city.step_order,
      villainSex
  };
  
  // If Next Location, pick topic
  if (targetType === "CITY") {
      const TOPICS = ['História', 'Geografia', 'Economia', 'Culinária', 'Arte', 'Religião', 'Costumes', 'Bandeira'];
      const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];
      context.topicCategory = topic;
  }
  
  const clueResult = await generateClue({
    archetype: place.interaction_style,
    reputation,
    clueData: {
      clue_type: clueType,
      target_type: targetType,
      target_value: targetValue,
      resolved_value: resolvedAttrValue // Passed!
    },
    context
  });

  const generatedText = clueResult.text;
  
  // Salvar Pista
  const revealed = (!isDecoy && (clueType === "NEXT_LOCATION" || clueType === "VILLAIN_ATTRIBUTE")) ? 1 : 0;
  
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
