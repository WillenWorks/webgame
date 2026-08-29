import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile,
  updateCaseMetadata,
  updateCaseTimeLimit
} from '../repositories/case.repo.js';
import { GAME_TIMEZONE, localitiesFor, ROUTE_STEPS } from '../config/game.rules.js';
import { getCityWithCountry } from '../repositories/city.repo.js';
import { generateSuspectsForCase } from './suspect.generator.service.js';
import { generateRouteService } from './route.generator.service.js';
import { seedCasePhases } from './phase.seed.service.js';
import { visitCurrentCityService } from './visit.service.js';
import { startCaseClock } from './time.service.js';
import { getRouteSteps } from '../repositories/route.repo.js';
import { getCaseTimeState } from '../repositories/case_time_state.repo.js';
import { generateCaseMetadata } from './case.generator.service.js'; 
import { getCaseTimeSummary } from './time.service.js';
import { populateVillainClues } from './clue.manager.service.js'; // NEW

export async function createCaseService({ profileId, difficulty = 'EASY' }) {
  if (!profileId) throw new Error('Perfil não informado');

  const existing = await findActiveCaseByProfile(profileId);
  if (existing) throw new Error('Já existe um caso ativo para este perfil');

  const caseData = {
    id: uuid(),
    profileId,
    stolenObject: 'Artefato Desconhecido',
    startTime: new Date(),
    timeLimitHours: null,
    difficultyCode: difficulty,
  };

  console.log('[case] createCase: caseId=', caseData.id, 'difficulty=', difficulty);
  await createCase(caseData);

  try {
    console.log('[case] generateSuspectsForCase…');
    await generateSuspectsForCase(caseData.id);
    // NEW: Populate clues immediately after suspects are generated
    await populateVillainClues(caseData.id); 
    console.log('[case] generateSuspectsAndClues OK');
  } catch (e) {
    console.error('[case] generateSuspectsForCase FAIL:', String(e));
    throw e;
  }

  try {
    console.log('[case] generateRouteService…');
    await generateRouteService({ activeCaseId: caseData.id, difficulty, steps: ROUTE_STEPS });
    console.log('[case] generateRouteService OK');
  } catch (e) {
    console.error('[case] generateRouteService FAIL:', String(e));
    throw e;
  }

  const routeSteps = await getRouteSteps(caseData.id);
  const startCityId = routeSteps[0]?.city_id;

  const cityInfo = await getCityWithCountry(startCityId);
  const startCity = cityInfo
    ? { name: cityInfo.name, country_id: cityInfo.country_id, country_name: cityInfo.country_name }
    : { name: 'Desconhecida' };

  const { stolenObject, introText, stolenObjectImage } = await generateCaseMetadata(startCity);

  await updateCaseMetadata({ id: caseData.id, stolenObject, introText });

  caseData.stolenObject = stolenObject;
  caseData.introText = introText;
  caseData.stolenObjectImage = stolenObjectImage; 

  try {
    const steps = routeSteps;
    const visitsPerCity = localitiesFor(difficulty).length;
    const expectedRoute = [];
    for (let i = 0; i < steps.length - 1; i++) {
      expectedRoute.push({ from: steps[i].city_id, to: steps[i + 1].city_id, visits: visitsPerCity, investigateExtra: false });
    }
    console.log('[case] startCaseClock…');
    const clock = await startCaseClock({ caseId: caseData.id, difficulty, timezone: GAME_TIMEZONE, expectedRoute });
    const limitHours = Math.round(
      (new Date(clock.deadlineTimeISO).getTime() - new Date(clock.startTimeISO).getTime()) / 3_600_000
    );
    await updateCaseTimeLimit(caseData.id, limitHours);
    caseData.timeLimitHours = limitHours;
    console.log('[case] startCaseClock OK');
  } catch (e) {
    console.error('[case] startCaseClock FAIL:', String(e));
    throw e;
  }

  try {
    console.log('[case] seedCasePhases…');
    await seedCasePhases(caseData.id, difficulty);
    console.log('[case] seedCasePhases OK');
  } catch (e) {
    console.error('[case] seedCasePhases FAIL:', String(e));
    throw e;
  }
  
  // NOTE: REMOVED planAndGenerateCase (Reverted to JIT)

  try {
    console.log('[case] visitCurrentCityService…');
    await visitCurrentCityService(caseData.id);
    console.log('[case] visitCurrentCityService OK');
  } catch (e) {
    console.error('[case] visitCurrentCityService FAIL:', String(e));
    throw e;
  }

  const timeState = await getCaseTimeSummary({ caseId: caseData.id });
  return {
    ...caseData,
    intro_text: introText,
    stolen_object: stolenObject,
    time_limit_hours: caseData.timeLimitHours ?? null,
    stolen_object_image: stolenObjectImage,
    startTime: timeState?.start_time ?? null,
    deadlineTime: timeState?.deadline_time ?? null,
    currentTime: timeState?.current_time ?? null,
  };
}

export async function getActiveCaseService(profileId) {
  if (!profileId) {
    throw new Error('Perfil não informado');
  }

  const activeCase = await findActiveCaseByProfile(profileId);
  return activeCase ?? null;
}
