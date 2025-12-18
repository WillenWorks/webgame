import { z } from 'zod';
import { initDossierNotesTable, getDossierNotes, upsertDossierNotes, clearDossierField, clearDossierNotes } from '../repositories/dossier.repo.js';

const notesSchema = z.object({
  sex_id: z.string().optional(),
  hair_id: z.string().optional(),
  hobby_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  feature_id: z.string().optional(),
});

export async function setDossierNotesService(caseId, profileId, body) {
  await initDossierNotesTable();
  const parsed = notesSchema.safeParse(body || {});
  if (!parsed.success) throw new Error('Payload inválido');
  const notes = parsed.data;
  await upsertDossierNotes(caseId, profileId, notes);
  const saved = await getDossierNotes(caseId, profileId);
  return saved;
}

export async function getDossierNotesService(caseId, profileId) {
  await initDossierNotesTable();
  const saved = await getDossierNotes(caseId, profileId);
  return saved || {};
}

export async function clearDossierFieldService(caseId, profileId, field) {
  await initDossierNotesTable();
  await clearDossierField(caseId, profileId, field);
  const saved = await getDossierNotes(caseId, profileId);
  return saved || {};
}

export async function clearDossierNotesService(caseId, profileId) {
  await initDossierNotesTable();
  await clearDossierNotes(caseId, profileId);
  return {};
}
