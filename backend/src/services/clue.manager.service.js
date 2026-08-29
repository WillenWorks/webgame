import { getCulpritByCase } from '../repositories/suspect.repo.js';
import {
  insertVillainClues,
  pickUnrevealedVillainClue,
  pickAnyVillainClue,
  markVillainClueRevealed,
} from '../repositories/clue.repo.js';

export async function populateVillainClues(caseId) {
  const culprit = await getCulpritByCase(caseId);
  if (!culprit) throw new Error('Culprit not found for case ' + caseId);

  const attributes = [
    { type: 'vehicle', value: culprit.vehicle, refId: culprit.vehicle_id },
    { type: 'hobby', value: culprit.hobby, refId: culprit.hobby_id },
    { type: 'hair', value: culprit.hair, refId: culprit.hair_id },
    { type: 'feature', value: culprit.feature, refId: culprit.feature_id },
    { type: 'sex', value: culprit.sex, refId: null }
  ];

  const inserted = await insertVillainClues(caseId, attributes);

  console.log(`[ClueManager] Populated ${inserted} clues for case ${caseId}`);
}

export async function pickNextVillainClue(caseId) {
  // Sorteia uma pista não revelada
  const clue = await pickUnrevealedVillainClue(caseId);

  if (!clue) {
    // Fallback: pega qualquer uma existente (repete se necessário) ou retorna null
    return await pickAnyVillainClue(caseId);
  }

  // Marca como revelada IMEDIATAMENTE (consumo atômico)
  await markVillainClueRevealed(clue.id);

  return clue;
}
