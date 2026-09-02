import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile,
  updateCaseMetadata,
  updateCaseTimeLimit,
} from '../repositories/case.repo.js';
import { GAME_TIMEZONE, localitiesFor, ROUTE_STEPS } from '../config/game.rules.js';
import { getCityWithCountry } from '../repositories/city.repo.js';
import { generateSuspectsForCase } from './suspect.generator.service.js';
import { generateRouteService } from './route.generator.service.js';
import { seedCasePhases } from './phase.seed.service.js';
import { visitCurrentCityService } from './visit.service.js';
import { startCaseClock, getCaseTimeSummary } from './time.service.js';
import { getRouteSteps } from '../repositories/route.repo.js';
import { generateCaseMetadata } from './case.generator.service.js';
import { populateVillainClues } from './clue.manager.service.js';

/**
 * Gera um caso completo: suspeitos + pistas do vilão → rota geográfica →
 * briefing cultural → relógio/deadline → localidades por fase → primeira visita.
 */
export async function createCaseService({ profileId, difficulty = 'EASY' }) {
  if (!profileId) throw new Error('Perfil não informado');
  if (await findActiveCaseByProfile(profileId)) {
    throw new Error('Já existe um caso ativo para este perfil');
  }

  const caseData = {
    id: uuid(),
    profileId,
    stolenObject: 'Artefato Desconhecido',
    startTime: new Date(),
    timeLimitHours: null,
    difficultyCode: difficulty,
  };
  await createCase(caseData);

  await generateSuspectsForCase(caseData.id);
  await populateVillainClues(caseData.id);

  await generateRouteService({ activeCaseId: caseData.id, difficulty, steps: ROUTE_STEPS });

  const routeSteps = await getRouteSteps(caseData.id);
  const cityInfo = await getCityWithCountry(routeSteps[0]?.city_id);
  const startCity = cityInfo
    ? { name: cityInfo.name, country_id: cityInfo.country_id, country_name: cityInfo.country_name }
    : { name: 'Desconhecida' };

  const { stolenObject, introText, stolenObjectImage } = await generateCaseMetadata(startCity);
  await updateCaseMetadata({ id: caseData.id, stolenObject, introText });
  caseData.stolenObject = stolenObject;
  caseData.introText = introText;
  caseData.stolenObjectImage = stolenObjectImage;

  const visitsPerCity = localitiesFor(difficulty).length;
  const expectedRoute = routeSteps.slice(0, -1).map((s, i) => ({
    from: s.city_id,
    to: routeSteps[i + 1].city_id,
    visits: visitsPerCity,
    investigateExtra: false,
  }));
  const clock = await startCaseClock({ caseId: caseData.id, difficulty, timezone: GAME_TIMEZONE, expectedRoute });
  const limitHours = Math.round(
    (new Date(clock.deadlineTimeISO).getTime() - new Date(clock.startTimeISO).getTime()) / 3_600_000,
  );
  await updateCaseTimeLimit(caseData.id, limitHours);
  caseData.timeLimitHours = limitHours;

  await seedCasePhases(caseData.id, difficulty);
  await visitCurrentCityService(caseData.id);

  const timeState = await getCaseTimeSummary({ caseId: caseData.id });
  return {
    ...caseData,
    intro_text: introText,
    stolen_object: stolenObject,
    time_limit_hours: limitHours,
    stolen_object_image: stolenObjectImage,
    startTime: timeState?.start_time ?? null,
    deadlineTime: timeState?.deadline_time ?? null,
    currentTime: timeState?.current_time ?? null,
  };
}

export async function getActiveCaseService(profileId) {
  if (!profileId) throw new Error('Perfil não informado');
  return (await findActiveCaseByProfile(profileId)) ?? null;
}
