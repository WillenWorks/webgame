import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

const int = (v) => (v == null ? v : Number(v));

function toClue(c) {
  if (!c) return undefined;
  return {
    id: c.id,
    case_id: c.caseId,
    city_place_id: c.cityPlaceId,
    clue_type: c.clueType,
    target_type: c.targetType,
    target_value: c.targetValue,
    target_ref_id: c.targetRefId,
    generated_text: c.generatedText,
    revealed: c.revealed,
    created_at: c.createdAt,
  };
}

export async function getExistingClueByCityPlace(caseId, cityPlaceId) {
  return toClue(
    await prisma.caseClue.findFirst({ where: { caseId, cityPlaceId } })
  );
}

export async function insertClue({
  id,
  caseId,
  cityPlaceId,
  clueType,
  targetType,
  targetValue,
  targetRefId,
  generatedText,
  revealed = 0,
}) {
  await prisma.caseClue.create({
    data: {
      id,
      caseId,
      cityPlaceId,
      clueType,
      targetType,
      targetValue: targetValue ?? null,
      targetRefId: targetRefId ?? null,
      generatedText,
      revealed: Boolean(revealed),
    },
  });
}

export async function getRevealedCluesByCityId(caseId) {
  const rows = await prisma.caseClue.findMany({
    where: { caseId, revealed: true },
  });
  return rows.map(toClue);
}

export async function countRevealedCluesInCity(caseId, cityId) {
  return prisma.caseClue.count({
    where: { caseId, revealed: true, cityPlace: { cityId: int(cityId) } },
  });
}

export async function countCluesForCase(caseId) {
  return prisma.caseClue.count({ where: { caseId } });
}

export async function getCluesByCaseAndCity(caseId, cityId) {
  const rows = await prisma.caseClue.findMany({
    where: { caseId, cityPlace: { cityId: int(cityId) } },
  });
  return rows.map(toClue);
}

export async function updateClueRevealedStatus(clueId, revealed) {
  await prisma.caseClue.update({
    where: { id: clueId },
    data: { revealed: Boolean(revealed) },
  });
}

function toVillainClue(v) {
  if (!v) return null;
  return {
    id: v.id,
    active_case_id: v.activeCaseId,
    attribute_type: v.attributeType,
    attribute_value: v.attributeValue,
    target_ref_id: v.targetRefId,
    is_revealed: v.isRevealed,
  };
}

export async function insertVillainClues(caseId, attributes) {
  const data = attributes
    .filter((a) => a.value)
    .map((a) => ({
      id: randomUUID(),
      activeCaseId: caseId,
      attributeType: a.type,
      attributeValue: a.value,
      targetRefId: a.refId ?? null,
    }));
  if (data.length === 0) return 0;
  const result = await prisma.caseVillainClue.createMany({ data });
  return result.count;
}

export async function pickUnrevealedVillainClue(caseId) {
  const count = await prisma.caseVillainClue.count({
    where: { activeCaseId: caseId, isRevealed: false },
  });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const row = await prisma.caseVillainClue.findFirst({
    where: { activeCaseId: caseId, isRevealed: false },
    skip,
  });
  return toVillainClue(row);
}

export async function pickAnyVillainClue(caseId) {
  const count = await prisma.caseVillainClue.count({ where: { activeCaseId: caseId } });
  if (count === 0) return null;
  const skip = Math.floor(Math.random() * count);
  const row = await prisma.caseVillainClue.findFirst({
    where: { activeCaseId: caseId },
    skip,
  });
  return toVillainClue(row);
}

export async function markVillainClueRevealed(id) {
  await prisma.caseVillainClue.update({
    where: { id },
    data: { isRevealed: true },
  });
}
