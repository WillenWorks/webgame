import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile
} from '../repositories/case.repo.js';
import pool from '../config/database.js';
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
    await generateRouteService({ activeCaseId: caseData.id, steps: 5, optionsPerStep: 4 });
    console.log('[case] generateRouteService OK');
  } catch (e) {
    console.error('[case] generateRouteService FAIL:', String(e));
    throw e;
  }

  const routeSteps = await getRouteSteps(caseData.id);
  const startCityId = routeSteps[0]?.city_id;
  
  const [[cityRow]] = await pool.query('SELECT name, country_id FROM cities WHERE id = ?', [startCityId]);
  let startCity = cityRow ? { ...cityRow } : { name: 'Desconhecida' };
  
  if (startCity.country_id) {
    const [[cRow]] = await pool.query('SELECT name FROM countries WHERE id = ?', [startCity.country_id]);
    startCity.country_name = cRow?.name;
  }

  const { stolenObject, introText, stolenObjectImage } = await generateCaseMetadata(startCity);

  await pool.query(
    'UPDATE active_cases SET stolen_object = ?, intro_text = ? WHERE id = ?',
    [stolenObject, introText, caseData.id]
  );
  
  caseData.stolenObject = stolenObject;
  caseData.introText = introText;
  caseData.stolenObjectImage = stolenObjectImage; 

  try {
    const steps = routeSteps;
    const expectedRoute = [];
    for (let i = 0; i < steps.length - 1; i++) {
      expectedRoute.push({ from: steps[i].city_id, to: steps[i + 1].city_id, visits: 3, investigateExtra: false });
    }
    console.log('[case] startCaseClock…');
    await startCaseClock({ caseId: caseData.id, difficulty, timezone: 'America/Sao_Paulo', expectedRoute });
    console.log('[case] startCaseClock OK');
  } catch (e) {
    console.error('[case] startCaseClock FAIL:', String(e));
    throw e;
  }

  try {
    console.log('[case] seedCasePhases…');
    await seedCasePhases(caseData.id);
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
