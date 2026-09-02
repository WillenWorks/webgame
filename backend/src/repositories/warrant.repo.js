import prisma from '../config/prisma.js';
import { toCaseRow } from './case.repo.js';

export async function getCaseById(caseId) {
  return toCaseRow(await prisma.activeCase.findUnique({ where: { id: caseId } }));
}

export async function getSuspectById(caseId, suspectId) {
  const s = await prisma.caseSuspect.findFirst({
    where: { id: suspectId, caseId },
  });
  if (!s) return undefined;
  return {
    id: s.id,
    case_id: s.caseId,
    name: s.name,
    sex_id: s.sexId,
    hair_id: s.hairId,
    hobby_id: s.hobbyId,
    vehicle_id: s.vehicleId,
    feature_id: s.featureId,
    is_culprit: s.isCulprit,
  };
}

export async function getFinalCityByCase(caseId) {
  const row = await prisma.caseRoute.findFirst({
    where: { activeCaseId: caseId },
    orderBy: { stepOrder: 'desc' },
  });
  if (!row) return undefined;
  return { city_id: row.cityId };
}

export async function markWarrant(caseId, suspectId) {
  await prisma.activeCase.update({
    where: { id: caseId },
    data: { warrantSuspectId: suspectId },
  });
}

export async function solveCase(caseId, status) {
  await prisma.activeCase.update({
    where: { id: caseId },
    data: { status },
  });
}

export async function clearSuspects(caseId) {
  await prisma.caseSuspect.deleteMany({ where: { caseId } });
}

export async function setCapturePlace(caseId, placeId) {
  await prisma.activeCase.update({
    where: { id: caseId },
    data: { capturePlaceId: placeId },
  });
}
