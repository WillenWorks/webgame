import { getCurrentCityByCase } from '../repositories/visit.repo.js';
import { getRevealedCluesByCityId } from '../repositories/clue.repo.js';

export async function getRevealedCluesService(caseId) {
  if (!caseId) {
    throw new Error('CaseId não informado');
  }

  // 1. Identificar cidade atual da etapa
  const city = await getCurrentCityByCase(caseId);
  if (!city) {
    throw new Error('Cidade atual não encontrada');
  }

  // 2. Buscar pistas reveladas nesta cidade/etapa
  const revealedClues = await getRevealedCluesByCityId(caseId, city.city_id);

  // 3. Retornar se existe ao menos uma (ou a lista)
  // O requisito diz: "saber se existe ao menos uma clue da step atual com este status"
  // Vamos retornar a lista e um flag booleano para facilitar.
  return {
    hasRevealed: revealedClues.length > 0,
    clues: revealedClues,
  };
}
