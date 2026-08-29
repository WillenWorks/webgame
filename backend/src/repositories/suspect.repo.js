import prisma from '../config/prisma.js';
import { notesToPrismaWhere } from '../domain/dossier.rules.js';

const ATTR_INCLUDE = {
  sex: true,
  hair: true,
  hobby: true,
  vehicle: true,
  feature: true,
};

// { id, name, sex, hair, hobby, vehicle, feature, is_culprit }
function toSuspectNamed(s) {
  return {
    id: s.id,
    name: s.name,
    sex: s.sex.name,
    hair: s.hair.name,
    hobby: s.hobby.name,
    vehicle: s.vehicle.name,
    feature: s.feature.name,
    is_culprit: s.isCulprit,
  };
}

export async function insertSuspect(suspect) {
  await prisma.caseSuspect.create({
    data: {
      id: suspect.id,
      caseId: suspect.case_id,
      name: suspect.name,
      sexId: Number(suspect.sex_id),
      hairId: Number(suspect.hair_id),
      hobbyId: Number(suspect.hobby_id),
      vehicleId: Number(suspect.vehicle_id),
      featureId: Number(suspect.feature_id),
      isCulprit: Boolean(suspect.is_culprit),
    },
  });
}

export async function getSuspectsByCase(caseId) {
  const rows = await prisma.caseSuspect.findMany({
    where: { caseId },
    include: ATTR_INCLUDE,
  });
  return rows.map(toSuspectNamed);
}

export async function getCulpritByCase(caseId) {
  const s = await prisma.caseSuspect.findFirst({
    where: { caseId, isCulprit: true },
    include: ATTR_INCLUDE,
  });
  if (!s) return undefined;
  return {
    id: s.id,
    name: s.name,
    sex_id: s.sexId,
    sex: s.sex.name,
    hair_id: s.hairId,
    hair: s.hair.name,
    hobby_id: s.hobbyId,
    hobby: s.hobby.name,
    vehicle_id: s.vehicleId,
    vehicle: s.vehicle.name,
    feature_id: s.featureId,
    feature: s.feature.name,
  };
}

export async function filterSuspects(caseId, filters) {
  const where = { caseId, ...notesToPrismaWhere(filters) };
  const rows = await prisma.caseSuspect.findMany({ where, include: ATTR_INCLUDE });
  return rows.map(toSuspectNamed);
}

/**
 * Valores distintos de cada atributo presentes na pool de suspeitos do caso.
 * É a fonte da verdade para os selects do dossiê no frontend (nunca hardcoded).
 */
export async function getCaseAttributeOptions(caseId) {
  const rows = await prisma.caseSuspect.findMany({ where: { caseId }, include: ATTR_INCLUDE });
  const groups = {
    sex_id: new Map(),
    hair_id: new Map(),
    hobby_id: new Map(),
    vehicle_id: new Map(),
    feature_id: new Map(),
  };
  for (const s of rows) {
    groups.sex_id.set(s.sexId, s.sex.name);
    groups.hair_id.set(s.hairId, s.hair.name);
    groups.hobby_id.set(s.hobbyId, s.hobby.name);
    groups.vehicle_id.set(s.vehicleId, s.vehicle.name);
    groups.feature_id.set(s.featureId, s.feature.name);
  }
  const toList = (m) =>
    [...m.entries()]
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  return {
    sex_id: toList(groups.sex_id),
    hair_id: toList(groups.hair_id),
    hobby_id: toList(groups.hobby_id),
    vehicle_id: toList(groups.vehicle_id),
    feature_id: toList(groups.feature_id),
  };
}
