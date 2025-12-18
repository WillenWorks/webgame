import { getCurrentRouteStep, getNextRouteCity, markRouteStepVisited, getStepOptions } from '../repositories/route.repo.js';
import { countLocationClues } from '../repositories/travel.repo.js';
import { initTravelLogTable, insertTravelLog } from '../repositories/travel_log.repo.js';
import { initCurrentViewTable, setCurrentView, getCurrentView } from '../repositories/current_view.repo.js';
import { v4 as uuid } from 'uuid';

/**
 * Viagem condicionada às opções do step atual + logging + atualização de visão atual.
 * Regras:
 * - Na fase final (último step), viagem fica indisponível.
 * - Ao viajar para uma cidade decoy válida (em options), atualiza a visão atual para essa cidade (sem marcar visited).
 * - Ao viajar para a cidade correta (primary), marca visited e atualiza a visão atual para a cidade da próxima fase.
 */
export async function travelService(caseId, destinationCityId) {
  await initTravelLogTable();
  await initCurrentViewTable();

  const currentStep = await getCurrentRouteStep(caseId);
  if (!currentStep) {
    throw new Error('Não há mais cidades para visitar neste caso');
  }

  // Fase final: viagem indisponível
  const optionsMeta = await getStepOptions(caseId, currentStep.step_order);
  if (!optionsMeta) {
    await insertTravelLog({
      id: uuid(),
      caseId,
      fromCityId: currentStep.city_id,
      toCityId: destinationCityId,
      stepOrder: currentStep.step_order,
      success: false,
      reason: 'Viagem indisponível na fase final',
    });
    return {
      success: false,
      message: 'Viagem indisponível na fase final. Procure o vilão nas localidades.',
    };
  }

  const locationClues = await countLocationClues(caseId, currentStep.city_id);
  if (locationClues < 1) {
    const reason = 'Sem pista de localidade suficiente';
    await insertTravelLog({
      id: uuid(),
      caseId,
      fromCityId: currentStep.city_id,
      toCityId: destinationCityId,
      stepOrder: currentStep.step_order,
      success: false,
      reason,
    });
    throw new Error('Você precisa de ao menos uma pista antes de viajar');
  }

  const allowedOptions = Array.isArray(optionsMeta?.options) ? optionsMeta.options : [];
  const primaryCityId = optionsMeta?.primary ?? null;

  if (!allowedOptions.includes(destinationCityId)) {
    const reason = 'Destino fora das opções do step';
    await insertTravelLog({
      id: uuid(),
      caseId,
      fromCityId: currentStep.city_id,
      toCityId: destinationCityId,
      stepOrder: currentStep.step_order,
      success: false,
      reason,
    });
    return {
      success: false,
      message: 'Destino inválido para este passo. Siga as pistas disponíveis no mapa.',
    };
  }

  const nextCity = await getNextRouteCity(caseId, currentStep.step_order);
  if (!nextCity) {
    return {
      success: false,
      message: 'Não há próximo destino configurado para este caso.',
    };
  }

  const isCorrect = primaryCityId ? (destinationCityId === primaryCityId) : (nextCity.city_id === destinationCityId);

  if (isCorrect) {
    // Marca avanço de fase
    await markRouteStepVisited(caseId, currentStep.step_order);
    // Atualiza visão atual para a cidade da próxima fase (o próprio nextCity)
    await setCurrentView(caseId, nextCity.city_id, currentStep.step_order + 1);
  } else {
    // Atualiza visão atual para a cidade decoy no step atual
    await setCurrentView(caseId, destinationCityId, currentStep.step_order);
  }

  await insertTravelLog({
    id: uuid(),
    caseId,
    fromCityId: currentStep.city_id,
    toCityId: destinationCityId,
    stepOrder: currentStep.step_order,
    success: isCorrect,
    reason: isCorrect ? 'Avanço de fase' : 'Rota incorreta',
  });

  return {
    success: isCorrect,
    message: isCorrect
      ? 'Você seguiu a pista corretamente e avançou na investigação.'
      : 'Algo não bateu com as pistas. Você perdeu tempo seguindo um caminho errado.',
  };
}
