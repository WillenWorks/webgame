import { filterSuspects } from '../repositories/suspect.repo.js';
import { z } from 'zod';

const querySchema = z.object({
  sex_id: z.string().optional(),
  hair_id: z.string().optional(),
  hobby_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  feature_id: z.string().optional(),
});

export async function filterSuspectsService(caseId, query) {
  const parsed = querySchema.safeParse(query);
  if (!parsed.success) {
    throw new Error('Parâmetros inválidos');
  }
  const filters = Object.fromEntries(
    Object.entries(parsed.data).filter(([_, v]) => v !== undefined)
  );

  const rows = await filterSuspects(caseId, filters);
  return rows;
}
