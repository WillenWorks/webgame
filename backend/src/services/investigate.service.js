import { v4 as uuid } from "uuid";
import { getCurrentCityByCase, getCityPlaceById } from "../repositories/visit.repo.js";
import { getNextCityByCase, getStepOptions } from "../repositories/route.repo.js";
import { getExistingClueByCityPlace, insertClue } from "../repositories/clue.repo.js";
import { getCulpritByCase } from "../repositories/suspect.repo.js";
import { getCaseById, solveCase } from "../repositories/warrant.repo.js";
import { insertCapturedVillainLog } from "../repositories/captured.repo.js";
import { getCurrentView } from "../repositories/current_view.repo.js";
import { AI_INTENT } from "../ai/ai.types.js";
import { buildPrompt } from "../ai/prompt.builder.js";
import { callOpenAI } from "../ai/openai.client.js";
import { guardAIResponse } from "../ai/ai.guard.js";

export async function investigateService(caseId, cityPlaceId) {
  if (!cityPlaceId) {
    throw new Error("cityPlaceId não informado");
  }

  const city = await getCurrentCityByCase(caseId);
  if (!city) throw new Error("Cidade atual não encontrada");

  const place = await getCityPlaceById(caseId, cityPlaceId);
  if (!place || place.city_id !== city.city_id) {
    throw new Error("Local inválido para a cidade atual");
  }

  // CAPTURE: se local marcado para captura na fase final
  if (place.is_capture_location) {
    const gameCase = await getCaseById(caseId);
    const culprit = await getCulpritByCase(caseId);

    if (!gameCase.warrant_suspect_id) {
      await solveCase(caseId, "FAILED");
      return "Você está no local da captura, mas precisa emitir o mandado antes.";
    }

    const isCorrectWarrant = gameCase.warrant_suspect_id === culprit.id;
    const finalDialogue = isCorrectWarrant
      ? "Você cercou o vilão e efetuou a prisão sem incidentes."
      : "Você prendeu a pessoa errada; o verdadeiro vilão escapou pela multidão.";

    await insertCapturedVillainLog({
      id: uuid(),
      profileId: gameCase.profile_id,
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

    await solveCase(caseId, isCorrectWarrant ? "SOLVED" : "FAILED");

    // Registrar XP e atualizar reputação/perfil com bônus por rota perfeita e término antecipado
    try {
      const { default: db } = await import('../config/database.js');
      const [[ac]] = await db.execute('SELECT profile_id FROM active_cases WHERE id = ?', [caseId]);
      const playerId = ac?.profile_id;
      const [[profRow]] = await db.execute('SELECT reputation_score, rank_id FROM profiles WHERE id = ?', [playerId]);
      const reputationScore = profRow?.reputation_score || 0;

      // Dificuldade: usar modifier do rank
      const [[rankRow]] = await db.execute('SELECT r.difficulty_modifier FROM ranks r WHERE r.id = ?', [profRow?.rank_id || 1]);
      const difficulty = rankRow?.difficulty_modifier ? Number(rankRow.difficulty_modifier) || 1.0 : 1.0;

      // Minutos de antecedência: deadline_time - NOW()
      const [[ts]] = await db.execute('SELECT TIMESTAMPDIFF(MINUTE, NOW(), deadline_time) AS remaining FROM case_time_state WHERE case_id = ? LIMIT 1', [caseId]);
      const finishedEarlierMinutes = ts?.remaining && ts.remaining > 0 ? ts.remaining : 0;

      const performance = {
        finished: true,
        routeErrors: 0,
        finishedEarlierMinutes,
        perfectPrecision: isCorrectWarrant,
      };

      const { computeXP } = await import('./xp.service.js');
      await computeXP({ playerId, caseId, difficulty, reputationScore, performance });

      const { applyCaseResultToProfile } = await import('./profile.service.js');
      const stats = await applyCaseResultToProfile(playerId, {
        solved: isCorrectWarrant,
        perfect: isCorrectWarrant,
        wrongWarrant: !isCorrectWarrant,
      });

      // Redundância: garantir persistência direta no perfil (xp/rep/solved/failed)
      await db.execute(
        'UPDATE profiles SET xp = ?, reputation_score = ?, cases_solved = ?, cases_failed = ? WHERE id = ?',
        [stats.xp, stats.reputation_score, stats.cases_solved, stats.cases_failed, playerId]
      );

      // Persistir também em player_reputation
      const { upsertPlayerReputation } = await import('../repositories/player_reputation.repo.js');
      await upsertPlayerReputation({ playerId, reputationScore: stats.reputation_score });
    } catch (e) {
      // Não bloquear captura por falha de XP/Rep
      console.warn('XP/Rep pós-captura falhou:', String(e));
    }

    await insertClue({
      id: uuid(),
      caseId,
      cityPlaceId,
      clueType: "CAPTURE",
      targetType: "NONE",
      targetValue: null,
      targetRefId: null,
      generatedText: finalDialogue,
    });

    return finalDialogue;
  }

  // Cache por city_place_id
  const existing = await getExistingClueByCityPlace(caseId, cityPlaceId);
  if (existing) return existing.generated_text;

  // Detectar se a cidade atual exibida é decoy (não-avança)
  // Usa a visão persistida (case_current_view) e as opções do step
  const optionsMeta = await getStepOptions(caseId, city.step_order);
  const view = await getCurrentView(caseId, city.step_order);
  const isDecoy = Boolean(view && optionsMeta && Array.isArray(optionsMeta.options)
    && optionsMeta.options.includes(view.city_id)
    && view.city_id !== optionsMeta.primary);

  // Determinar verdade
  let clueType = place.clue_type;
  let targetType = "NONE";
  let targetValue = null;
  let targetRefId = null;

  if (isDecoy) {
    // Em cidade decoy NUNCA gerar pista útil; gravar WARNING
    clueType = "WARNING";
  } else {
    if (clueType === "NEXT_LOCATION") {
      const nextCity = await getNextCityByCase(caseId, city.step_order);
      if (!nextCity) {
        // Fase final: não há próxima cidade – não lançar erro; gerar aviso narrativo.
        clueType = "WARNING";
        targetType = "NONE";
        targetValue = null;
        targetRefId = null;
      } else {
        targetType = "CITY";
        targetValue = nextCity.city_name;
        targetRefId = nextCity.city_id;
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
      clueType = "VILLAIN_ATTRIBUTE"; // normalizar para case_clues
      targetType = "VILLAIN_ATTR";
      targetValue = `${chosen.key}: ${chosen.label}`;
      targetRefId = chosen.ref;
    }
  }

  // IA narrativa (modo decoy vs correta)
  let mode = isDecoy ? "decoy" : "primary";
  // Fase final não cai aqui (captura trata antes), mas mantemos segurança
  const currentOptions = await getStepOptions(caseId, city.step_order);
  if (!currentOptions) mode = "final";

  // Obter difficulty_modifier do rank
  const [[prof]] = await (await import('../config/database.js')).default.execute(
    'SELECT p.rank_id, r.difficulty_modifier FROM profiles p JOIN ranks r ON r.id = p.rank_id WHERE p.id = (SELECT profile_id FROM active_cases WHERE id = ?)',
    [caseId]
  );
  const difficulty = prof?.difficulty_modifier ? Number(prof.difficulty_modifier) || 1.0 : 1.0;

  const prompt = buildPrompt({
    intent: AI_INTENT.CLUE_TEXT,
    archetype: place.interaction_style,
    reputation: "NEUTRA",
    difficulty,
    context: { city: city.city_name, truth: { targetType, targetValue }, mode, phase: city.step_order },
  });

  const generatedText = await guardAIResponse({
    aiCall: () => callOpenAI(prompt),
    fallback: isDecoy
      ? "Disseram que nada relevante foi visto por aqui."
      : "Ele falou algo estranho, mas parecia importante.",
  });

  await insertClue({
    id: uuid(),
    caseId,
    cityPlaceId,
    clueType,
    targetType,
    targetValue,
    targetRefId,
    generatedText,
  });

  return generatedText;
}