import prisma from '../config/prisma.js';

export async function getTravelOverrideMinutes(fromCityId, toCityId) {
  const row = await prisma.travelTimeOverride.findUnique({
    where: {
      fromCityId_toCityId: {
        fromCityId: Number(fromCityId),
        toCityId: Number(toCityId),
      },
    },
  });
  if (row && row.minutes != null) return row.minutes;
  return null;
}
