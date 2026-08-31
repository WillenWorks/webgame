import prisma from '../config/prisma.js';

const int = (v) => (v == null ? v : Number(v));

/**
 * Retorna a cidade "atual" do caso considerando a visão persistida por fase.
 * 1) step atual: primeiro registro em case_route com visited = false
 * 2) se existir visão salva em case_current_view para (case_id, step_order), usa a cidade dela
 * 3) caso contrário, usa a cidade do step atual
 */
export async function getCurrentCityByCase(caseId) {
  const step = await prisma.caseRoute.findFirst({
    where: { activeCaseId: caseId, visited: false },
    orderBy: { stepOrder: 'asc' },
  });
  if (!step) return null;

  const view = await prisma.caseCurrentView.findFirst({
    where: { caseId, stepOrder: step.stepOrder },
  });

  const cityId = view?.cityId ?? step.cityId;

  const city = await prisma.city.findUnique({
    where: { id: cityId },
    include: { country: true },
  });
  if (!city) return null;

  return {
    step_order: step.stepOrder,
    city_id: city.id,
    city_name: city.name,
    lat: city.latitude,
    lon: city.longitude,
    country_name: city.country.name,
    description_prompt: city.descriptionPrompt,
    image_url: city.imageUrl,
  };
}

// Nome e arquétipo de NPC vêm do catálogo por cidade (`city_places`) quando
// presente; senão, do pool genérico global (`place_types`) — compatível com
// casos criados antes do catálogo por cidade.
function resolvePlace(cp) {
  const src = cp.cityPlace ?? cp.placeType;
  return {
    name: src?.name ?? 'Local Desconhecido',
    interaction_style: src?.interactionStyle ?? 'Testemunha reticente, de poucas palavras.',
  };
}

export async function getCityPlaces(caseId, cityId) {
  const rows = await prisma.caseCityPlace.findMany({
    where: { caseId, cityId: int(cityId) },
    include: { placeType: true, cityPlace: true },
    orderBy: { id: 'asc' },
  });
  return rows.map((cp) => ({
    id: cp.id,
    place_type_id: cp.placeTypeId,
    city_place_id: cp.cityPlaceId,
    clue_type: cp.clueType,
    ...resolvePlace(cp),
  }));
}

export async function getCityPlaceById(caseId, cityPlaceId) {
  const cp = await prisma.caseCityPlace.findFirst({
    where: { id: cityPlaceId, caseId },
    include: { placeType: true, cityPlace: true },
  });
  if (!cp) return undefined;
  return {
    id: cp.id,
    city_id: cp.cityId,
    place_type_id: cp.placeTypeId,
    city_place_id: cp.cityPlaceId,
    clue_type: cp.clueType,
    is_capture_location: cp.isCaptureLocation,
    ...resolvePlace(cp),
  };
}

export async function insertCityPlace({ id, caseId, cityId, placeTypeId = null, cityPlaceId = null, clueType }) {
  await prisma.caseCityPlace.create({
    data: {
      id,
      caseId,
      cityId: int(cityId),
      placeTypeId: placeTypeId == null ? null : int(placeTypeId),
      cityPlaceId: cityPlaceId == null ? null : int(cityPlaceId),
      clueType,
    },
  });
}

/**
 * Catálogo de localidades de uma cidade (marcos de enredo + genéricos),
 * insumo do semeador de fases (`phase.seed.service.js`).
 */
export async function getCityPlaceCatalog(cityId) {
  const rows = await prisma.cityPlace.findMany({
    where: { cityId: int(cityId) },
    orderBy: { id: 'asc' },
  });
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    interaction_style: p.interactionStyle,
  }));
}

export async function getAllPlaceTypes() {
  const rows = await prisma.placeType.findMany();
  // Ordem aleatória (equivalente ao antigo ORDER BY RAND())
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  return rows.map((pt) => ({
    id: pt.id,
    name: pt.name,
    interaction_style: pt.interactionStyle,
  }));
}

export async function setCaptureFlag(cityPlaceId, isCapture = 1) {
  await prisma.caseCityPlace.update({
    where: { id: cityPlaceId },
    data: { isCaptureLocation: Boolean(isCapture) },
  });
}
