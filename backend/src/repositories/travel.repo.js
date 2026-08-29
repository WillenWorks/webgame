import prisma from '../config/prisma.js';

const int = (v) => (v == null ? v : Number(v));

export async function countLocationClues(caseId, cityId) {
  return prisma.caseClue.count({
    where: {
      caseId,
      clueType: 'NEXT_LOCATION',
      cityPlace: { cityId: int(cityId) },
    },
  });
}

export async function getNextCityStep(caseId, currentStep) {
  const row = await prisma.caseRoute.findUnique({
    where: {
      activeCaseId_stepOrder: { activeCaseId: caseId, stepOrder: int(currentStep) + 1 },
    },
  });
  if (!row) return undefined;
  return { city_id: row.cityId };
}

// Mantidas como no-op: progresso é rastreado por `visited` em case_route
export async function updateCaseTime() {
  return;
}

export async function advanceCaseStep() {
  return;
}
