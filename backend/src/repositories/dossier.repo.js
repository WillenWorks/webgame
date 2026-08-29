import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';
import { DOSSIER_FIELD_MAP as FIELD_MAP } from '../domain/dossier.rules.js';

/** Tabela gerenciada pelas migrations do Prisma. */
export async function initDossierNotesTable() {
  /* no-op */
}

export async function getDossierNotes(caseId, profileId) {
  const row = await prisma.caseDossierNote.findUnique({
    where: { caseId_profileId: { caseId, profileId } },
  });
  if (!row) return null;
  return {
    sex_id: row.sexId,
    hair_id: row.hairId,
    hobby_id: row.hobbyId,
    vehicle_id: row.vehicleId,
    feature_id: row.featureId,
  };
}

export async function upsertDossierNotes(caseId, profileId, notes) {
  const data = {
    sexId: notes.sex_id ?? null,
    hairId: notes.hair_id ?? null,
    hobbyId: notes.hobby_id ?? null,
    vehicleId: notes.vehicle_id ?? null,
    featureId: notes.feature_id ?? null,
  };
  await prisma.caseDossierNote.upsert({
    where: { caseId_profileId: { caseId, profileId } },
    create: { id: randomUUID(), caseId, profileId, ...data },
    update: data,
  });
}

export async function clearDossierField(caseId, profileId, field) {
  const mapped = FIELD_MAP[field];
  if (!mapped) return;
  await prisma.caseDossierNote.updateMany({
    where: { caseId, profileId },
    data: { [mapped]: null },
  });
}

export async function clearDossierNotes(caseId, profileId) {
  await prisma.caseDossierNote.deleteMany({ where: { caseId, profileId } });
}
