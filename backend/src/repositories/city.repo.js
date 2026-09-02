import prisma from '../config/prisma.js';

export async function getCityById(cityId) {
  const c = await prisma.city.findUnique({
    where: { id: Number(cityId) },
    include: { country: true },
  });
  if (!c) return null;
  return {
    id: c.id,
    lat: c.latitude,
    lng: c.longitude,
    country_id: c.countryId,
    city: c.name,
    description_prompt: c.descriptionPrompt,
    image_url: c.imageUrl,
    county: c.country.name,
  };
}

export async function getCityWithCountry(cityId) {
  const c = await prisma.city.findUnique({
    where: { id: Number(cityId) },
    include: { country: true },
  });
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    country_id: c.countryId,
    country_name: c.country.name,
  };
}

export async function getCitiesByIds(ids) {
  const rows = await prisma.city.findMany({
    where: { id: { in: ids.map(Number) } },
    include: { country: true },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    lat: c.latitude,
    lon: c.longitude,
    country_name: c.country.name,
    description_prompt: c.descriptionPrompt,
    image_url: c.imageUrl,
  }));
}

export async function getAllCitiesForRouting() {
  const rows = await prisma.city.findMany({
    select: { id: true, name: true, countryId: true, latitude: true, longitude: true },
  });
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    country_id: c.countryId,
    lat: c.latitude,
    lng: c.longitude,
  }));
}

/**
 * Cidades com região (nome) e coordenadas — insumo do gerador de rota
 * geograficamente coerente (`domain/route.rules.js`).
 */
export async function getCitiesForRouteBuilding() {
  const rows = await prisma.city.findMany({
    select: {
      id: true,
      name: true,
      countryId: true,
      latitude: true,
      longitude: true,
      country: { select: { regionId: true, region: { select: { name: true } } } },
    },
  });
  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    country_id: c.countryId,
    region_id: c.country?.regionId ?? null,
    region_name: c.country?.region?.name ?? null,
    lat: c.latitude,
    lng: c.longitude,
  }));
}
