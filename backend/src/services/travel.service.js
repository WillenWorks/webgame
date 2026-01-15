import { getCurrentRouteStep, getNextRouteCity, markRouteStepVisited, getStepOptions } from '../repositories/route.repo.js';
import { countLocationClues } from '../repositories/travel.repo.js';
import { initTravelLogTable, insertTravelLog } from '../repositories/travel_log.repo.js';
import { initCurrentViewTable, setCurrentView } from '../repositories/current_view.repo.js';
import { estimateTravelMinutes, consumeActionTime } from './time.service.js';
import { v4 as uuid } from 'uuid';

// Introduzir chance controlada de falha de viagem em HARD/EXTREME
async function getCaseDifficultyLabel(caseId) {
  try {
    const { default: db } = await import('../config/database.js');
    const [[row]] = await db.execute('SELECT gd.code AS difficulty_code FROM active_cases ac JOIN game_difficulty gd ON gd.id = ac.difficulty_id WHERE ac.id = ? LIMIT 1', [caseId]);
    return row?.difficulty_code || 'EASY';
  } catch { return 'EASY'; }
}

function shouldFailTravelRandom(diffLabel) {
  const rnd = Math.random();
  if (diffLabel === 'EXTREME') return rnd < 0.10; // 10%
  if (diffLabel === 'HARD') return rnd < 0.05;   // 5%
  return false;
}

export async function travelService(caseId, destinationCityId) {
  await initTravelLogTable();
  await initCurrentViewTable();

  const currentStep = await getCurrentRouteStep(caseId);
  if (!currentStep) {
    throw new Error('Não há mais cidades para visitar neste caso');
  }

  const optionsMeta = await getStepOptions(caseId, currentStep.step_order);
  if (!optionsMeta) {
    await insertTravelLog({ id: uuid(), caseId, fromCityId: currentStep.city_id, toCityId: destinationCityId, stepOrder: currentStep.step_order, success: false, reason: 'Viagem indisponível na fase final' });
    return { success: false, message: 'Viagem indisponível na fase final. Procure o vilão nas localidades.' };
  }

  const locationClues = await countLocationClues(caseId, currentStep.city_id);
  if (locationClues < 1) {
    const reason = 'Sem pista de localidade suficiente';
    await insertTravelLog({ id: uuid(), caseId, fromCityId: currentStep.city_id, toCityId: destinationCityId, stepOrder: currentStep.step_order, success: false, reason });
    throw new Error('Você precisa de ao menos uma pista antes de viajar');
  }

  const allowedOptions = Array.isArray(optionsMeta?.options) ? optionsMeta.options : [];
  const primaryCityId = optionsMeta?.primary ?? null;
  if (!allowedOptions.includes(destinationCityId)) {
    const reason = 'Destino fora das opções do step';
    await insertTravelLog({ id: uuid(), caseId, fromCityId: currentStep.city_id, toCityId: destinationCityId, stepOrder: currentStep.step_order, success: false, reason });
    return { success: false, message: 'Destino inválido para este passo. Siga as pistas disponíveis no mapa.' };
  }

  const nextCity = await getNextRouteCity(caseId, currentStep.step_order);
  if (!nextCity) {
    return { success: false, message: 'Não há próximo destino configurado para este caso.' };
  }

  const isCorrect = primaryCityId ? (destinationCityId === primaryCityId) : (nextCity.city_id === destinationCityId);

  // Falha aleatória controlada em HARD/EXTREME (consome tempo, registra erro, não avança fase)
  const diffLabel = await getCaseDifficultyLabel(caseId);
  let randomFail = false;
  if (shouldFailTravelRandom(diffLabel)) {
    randomFail = true;
    await insertTravelLog({ id: uuid(), caseId, fromCityId: currentStep.city_id, toCityId: destinationCityId, stepOrder: currentStep.step_order, success: false, reason: 'Falha aleatória de viagem' });
  }

  if (!randomFail) {
    if (isCorrect) {
      await markRouteStepVisited(caseId, currentStep.step_order);
      await setCurrentView(caseId, nextCity.city_id, currentStep.step_order + 1);
    } else {
      await setCurrentView(caseId, destinationCityId, currentStep.step_order);
    }
    await insertTravelLog({ id: uuid(), caseId, fromCityId: currentStep.city_id, toCityId: destinationCityId, stepOrder: currentStep.step_order, success: isCorrect, reason: isCorrect ? 'Avanço de fase' : 'Rota incorreta' });
  }

  // Consome tempo da viagem (inclui decoy e falha aleatória)
  try {
    const minutes = await estimateTravelMinutes({ fromCityId: currentStep.city_id, toCityId: destinationCityId, caseId });
    const extraPenalty = randomFail ? Math.ceil(minutes * 0.20) : 0; // penalidade adicional de 20%
    await consumeActionTime({ caseId, minutes: minutes + extraPenalty, timezone: 'America/Sao_Paulo' });
  } catch (e) {
    console.warn('Falha ao consumir tempo de viagem:', e?.message || e);
  }

  if (randomFail) {
    return { success: false, message: 'A viagem falhou por imprevistos. Você perdeu tempo e precisa tentar novamente.' };
  }

  return {
    success: isCorrect,
    message: isCorrect ? 'Você seguiu a pista corretamente e avançou na investigação.' : 'Algo não bateu com as pistas. Você perdeu tempo seguindo um caminho errado.',
  };
}

