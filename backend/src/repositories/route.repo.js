import prisma from '../config/prisma.js';

const int = (v) => (v == null ? v : Number(v));

function parseJson(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

export async function insertRouteStep({ activeCaseId, cityId, stepOrder, optionsJson = null }) {
  await prisma.caseRoute.create({
    data: {
      activeCaseId,
      cityId: int(cityId),
      stepOrder: int(stepOrder),
      cluesGeneratedJson: parseJson(optionsJson),
    },
  });
}

export async function getRouteByCaseId(activeCaseId) {
  const rows = await prisma.caseRoute.findMany({
    where: { activeCaseId },
    include: { city: { include: { country: true } } },
    orderBy: { stepOrder: 'asc' },
  });
  return rows.map((r) => ({
    step_order: r.stepOrder,
    city_id: r.cityId,
    city_name: r.city.name,
    country_name: r.city.country.name,
    clues_generated_json: r.cluesGeneratedJson,
  }));
}

export async function deleteRouteByCaseId(activeCaseId) {
  await prisma.caseRoute.deleteMany({ where: { activeCaseId } });
}

export async function getCaseCityPlace(caseId, cityId, placeTypeId) {
  const row = await prisma.caseCityPlace.findFirst({
    where: {
      caseId,
      cityId: int(cityId),
      ...(placeTypeId ? { placeTypeId: int(placeTypeId) } : {}),
    },
    include: { placeType: true, cityPlace: true },
  });
  if (!row) return undefined;
  return {
    place_type_id: row.placeTypeId,
    city_place_id: row.cityPlaceId,
    clue_type: row.clueType,
    interaction_style:
      row.cityPlace?.interactionStyle ??
      row.placeType?.interactionStyle ??
      'Testemunha reticente, de poucas palavras.',
  };
}

export async function getNextCityByCase(caseId, currentStep) {
  const row = await prisma.caseRoute.findUnique({
    where: {
      activeCaseId_stepOrder: { activeCaseId: caseId, stepOrder: int(currentStep) + 1 },
    },
    include: { city: { include: { country: true } } },
  });
  if (!row) return undefined;
  return {
    step_order: row.stepOrder,
    city_id: row.cityId,
    city_name: row.city.name,
    country_id: row.city.countryId,
    country_name: row.city.country.name,
    cultural_info: row.city.country.culturalInfo,
    description_prompt: row.city.descriptionPrompt,
    clues_generated_json: row.cluesGeneratedJson,
  };
}

export async function getCurrentRouteStep(caseId) {
  const row = await prisma.caseRoute.findFirst({
    where: { activeCaseId: caseId, visited: false },
    orderBy: { stepOrder: 'asc' },
  });
  if (!row) return undefined;
  return { step_order: row.stepOrder, city_id: row.cityId };
}

export async function markRouteStepVisited(caseId, stepOrder) {
  await prisma.caseRoute.update({
    where: { activeCaseId_stepOrder: { activeCaseId: caseId, stepOrder: int(stepOrder) } },
    data: { visited: true },
  });
}

export async function getNextRouteCity(caseId, stepOrder) {
  const row = await prisma.caseRoute.findUnique({
    where: {
      activeCaseId_stepOrder: { activeCaseId: caseId, stepOrder: int(stepOrder) + 1 },
    },
  });
  if (!row) return undefined;
  return { city_id: row.cityId };
}

export async function getRouteSteps(caseId) {
  const rows = await prisma.caseRoute.findMany({
    where: { activeCaseId: caseId },
    orderBy: { stepOrder: 'asc' },
  });
  return rows.map((r) => ({
    step_order: r.stepOrder,
    city_id: r.cityId,
    clues_generated_json: r.cluesGeneratedJson,
  }));
}

export async function countRoutesForCase(caseId) {
  return prisma.caseRoute.count({ where: { activeCaseId: caseId } });
}

export async function getCaseProfileInfo(caseId) {
  const c = await prisma.activeCase.findUnique({
    where: { id: caseId },
    select: { profileId: true },
  });
  if (!c) return null;
  return { profile_id: c.profileId };
}

export async function getStepOptions(caseId, stepOrder) {
  const row = await prisma.caseRoute.findUnique({
    where: { activeCaseId_stepOrder: { activeCaseId: caseId, stepOrder: int(stepOrder) } },
  });
  if (!row || !row.cluesGeneratedJson) return null;
  return parseJson(row.cluesGeneratedJson);
}
