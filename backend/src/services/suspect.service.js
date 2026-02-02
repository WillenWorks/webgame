import { getSuspectsByCase, filterSuspects } from '../repositories/suspect.repo.js';

export async function listSuspectsService(caseId, filters = {}) {
  let suspects;

  // If filters are present, use the filtering logic
  if (Object.keys(filters).length > 0) {
    suspects = await filterSuspects(caseId, filters);
  } else {
    // Otherwise fetch all suspects
    suspects = await getSuspectsByCase(caseId);
  }

  if (!suspects) {
    suspects = [];
  }

  // Attach static placeholder image or null
  // Image generation has been disabled as per request
  const enrichedSuspects = suspects.map((suspect) => {
    return {
      ...suspect,
      imageUrl: '/images/suspect-placeholder.png' 
    };
  });

  return enrichedSuspects;
}
