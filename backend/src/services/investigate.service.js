import { v4 as uuid } from "uuid";
import { getCurrentCityByCase, getCityPlaceById } from "../repositories/visit.repo.js";
import { getNextCityByCase, getStepOptions } from "../repositories/route.repo.js";
import { getExistingClueByCityPlace, insertClue } from "../repositories/clue.repo.js";
import { getCulpritByCase } from "../repositories/suspect.repo.js";
import { getCaseById, setCapturePlace } from "../repositories/warrant.repo.js";
import { getCaseDifficulty } from "../repositories/case.repo.js";
import { findProfileById } from "../repositories/profile.repo.js";
import { insertCapturedVillainLog } from "../repositories/captured.repo.js";
import { getCurrentView } from "../repositories/current_view.repo.js";
import { generateClue } from "./clue.generator.service.js";
import { consumeActionTime, getCaseTimeSummary } from "./time.service.js";
import { finishCaseService } from "./finish_case.service.js";
import { pickNextVillainClue } from "./clue.manager.service.js";
import { GAME_TIMEZONE } from "../config/game.rules.js";
import { CLUE_TOPICS } from "../domain/clue.rules.js";

const INVESTIGATE_MINUTES = 60;

function reputationLabel(score) {
  const s = Number(score) || 0;
  if (s >= 50) return "ALTA";
  if (s < 0) return "BAIXA";
  return "NEUTRA";
}

export async function investigateService(caseId, cityPlaceId) {
  if (!cityPlaceId) throw new Error("cityPlaceId não informado");

  // Caso já encerrado: idempotente, sem efeitos colaterais.
  const existingCase = await getCaseById(caseId);
  if (existingCase && existingCase.status !== "ACTIVE") {
    const timeState = await getCaseTimeSummary({ caseId });
    return {
      text: "Este caso já foi encerrado.",
      timeState,
      gameOver: true,
      solved: existingCase.status === "SOLVED",
    };
  }

  const city = await getCurrentCityByCase(caseId);
  if (!city) throw new Error("Cidade atual não encontrada");

  const place = await getCityPlaceById(caseId, cityPlaceId);
  if (!place || place.city_id !== city.city_id) {
    throw new Error("Local inválido para a cidade atual");
  }

  // 1️⃣ Consumo de tempo
  const timeResult = await consumeActionTime({
    caseId,
    minutes: INVESTIGATE_MINUTES,
    timezone: GAME_TIMEZONE,
  });
  const timeState = await getCaseTimeSummary({ caseId });

  if (timeResult.failed) {
    return finishCaseService({
      caseId,
      status: "FAILED",
      finalDialogue: "O tempo esgotou! O vilão escapou enquanto você investigava.",
      timeState,
    });
  }

  // 2️⃣ Captura
  if (place.is_capture_location) {
    const gameCase = await getCaseById(caseId);
    const culprit = await getCulpritByCase(caseId);

    if (!gameCase.warrant_suspect_id) {
      return finishCaseService({
        caseId,
        status: "FAILED",
        finalDialogue:
          "Você encontrou o suspeito, mas sem um mandado emitido não pode efetuar a prisão! Ele fugiu!",
        timeState,
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

    try {
      await setCapturePlace(caseId, cityPlaceId);
    } catch {
      /* melhor esforço */
    }

    return finishCaseService({
      caseId,
      status: isCorrectWarrant ? "SOLVED" : "FAILED",
      finalDialogue,
      timeState,
    });
  }

  // 3️⃣ Pista já revelada neste local → repete
  const existing = await getExistingClueByCityPlace(caseId, cityPlaceId);
  if (existing) {
    return { text: existing.generated_text, timeState, isRepeat: true, clueType: existing.clue_type };
  }

  // 4️⃣ Geração da pista (verdade canônica vinda do banco)
  const optionsMeta = await getStepOptions(caseId, city.step_order);
  const view = await getCurrentView(caseId, city.step_order);

  const isDecoy = Boolean(
    view &&
      optionsMeta &&
      Array.isArray(optionsMeta.options) &&
      optionsMeta.options.includes(view.city_id) &&
      view.city_id !== optionsMeta.primary,
  );

  const caseInfo = await getCaseById(caseId);
  const difficulty = (await getCaseDifficulty(caseId)) || "EASY";
  const profileRow = caseInfo?.profile_id ? await findProfileById(caseInfo.profile_id) : null;
  const reputation = reputationLabel(profileRow?.reputation_score);

  let clueType = place.clue_type;
  let targetType = "NONE";
  let targetValue = null;
  let resolvedAttrValue = null;
  let targetRefId = null;
  let truth = null;

  if (isDecoy) {
    clueType = "WARNING";
  } else if (clueType === "NEXT_LOCATION") {
    const nextCity = await getNextCityByCase(caseId, city.step_order);
    if (!nextCity) {
      clueType = "WARNING";
    } else {
      targetType = "CITY";
      targetValue = `${nextCity.city_name}, ${nextCity.country_name}`;
      truth = {
        kind: "CITY",
        cityName: nextCity.city_name,
        countryName: nextCity.country_name,
        culturalInfo: nextCity.cultural_info,
        descriptionPrompt: nextCity.description_prompt,
        topicCategory: CLUE_TOPICS[Math.floor(Math.random() * CLUE_TOPICS.length)],
      };
    }
  } else if (clueType === "VILLAIN") {
    const picked = await pickNextVillainClue(caseId);
    if (picked) {
      clueType = "VILLAIN_ATTRIBUTE";
      targetType = "VILLAIN_ATTR";
      targetValue = picked.attribute_type;
      resolvedAttrValue = picked.attribute_value;
      targetRefId = picked.target_ref_id;
      truth = {
        kind: "VILLAIN_ATTR",
        attributeType: picked.attribute_type,
        attributeValue: picked.attribute_value,
      };
    } else {
      clueType = "WARNING";
    }
  }

  const clueResult = await generateClue({
    archetype: place.interaction_style,
    reputation,
    difficulty,
    clueType,
    truth,
    context: { city: city.city_name, phase: city.step_order, mode: isDecoy ? "decoy" : "primary" },
  });

  const revealed = !isDecoy && (clueType === "NEXT_LOCATION" || clueType === "VILLAIN_ATTRIBUTE");

  await insertClue({
    id: uuid(),
    caseId,
    cityPlaceId,
    clueType,
    targetType,
    targetValue,
    targetRefId: targetRefId || null,
    generatedText: clueResult.text,
    revealed: revealed ? 1 : 0,
  });

  return { text: clueResult.text, timeState, clueType, revealed };
}
