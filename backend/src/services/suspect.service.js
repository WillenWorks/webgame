import { getSuspectsByCase } from '../repositories/suspect.repo.js';

export async function listSuspectsService(caseId) {
  const suspects = await getSuspectsByCase(caseId);

  if (!suspects || suspects.length === 0) {
    throw new Error('Nenhum suspeito encontrado para este caso');
  }

  return suspects;
}
