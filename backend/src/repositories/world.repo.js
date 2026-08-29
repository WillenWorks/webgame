import prisma from '../config/prisma.js';

export async function getCountryRegionId(countryId) {
  if (!countryId) return null;
  const c = await prisma.country.findUnique({ where: { id: Number(countryId) } });
  return c?.regionId ?? null;
}

export async function isNeighborCountry(countryId, neighborCountryId) {
  if (!countryId || !neighborCountryId) return false;
  const row = await prisma.countryNeighbor.findUnique({
    where: {
      countryId_neighborCountryId: {
        countryId: Number(countryId),
        neighborCountryId: Number(neighborCountryId),
      },
    },
  });
  return !!row;
}
