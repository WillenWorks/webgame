import { getSuspectsByCase } from '../repositories/suspect.repo.js';
import { getEntityImage } from './image.generator.service.js';

export async function listSuspectsService(caseId) {
  const suspects = await getSuspectsByCase(caseId);

  if (!suspects || suspects.length === 0) {
    throw new Error('Nenhum suspeito encontrado para este caso');
  }

  // Attach images
  const enrichedSuspects = await Promise.all(suspects.map(async (suspect) => {
    // Construct a visual description for the image generator
    // e.g. "Female with Red hair, likes Tennis, drives a Convertible, has a Tattoo"
    const description = `${suspect.sex} with ${suspect.hair} hair, likes ${suspect.hobby}, drives a ${suspect.vehicle}, has a ${suspect.feature}`;
    
    const imageUrl = await getEntityImage('suspect', suspect.id, description);
    
    return {
      ...suspect,
      imageUrl
    };
  }));

  return enrichedSuspects;
}
