import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile
} from '../repositories/case.repo.js';
import pool from '../config/database.js'; // Direct pool access for updates
import { generateSuspectsForCase } from './suspect.generator.service.js';
import { generateRouteService } from './route.generator.service.js';
import { seedCasePhases } from './phase.seed.service.js';
import { visitCurrentCityService } from './visit.service.js';
import { startCaseClock } from './time.service.js';
import { getRouteSteps } from '../repositories/route.repo.js';
import { getCaseTimeState } from '../repositories/case_time_state.repo.js';
import { generateCaseMetadata } from './case.generator.service.js'; // New service
import { getCurrentCityByCase } from '../repositories/visit.repo.js';

export async function createCaseService({ profileId, difficulty = 'EASY' }) {
  if (!profileId) throw new Error('Perfil não informado');

  const existing = await findActiveCaseByProfile(profileId);
  if (existing) throw new Error('Já existe um caso ativo para este perfil');

  const caseData = {
    id: uuid(),
    profileId,
    stolenObject: 'Artefato Desconhecido', // Será atualizado depois
    startTime: new Date(),
    timeLimitHours: null,
    difficultyCode: difficulty,
  };

  console.log('[case] createCase: caseId=', caseData.id, 'difficulty=', difficulty);
  await createCase(caseData);

  try {
    console.log('[case] generateSuspectsForCase…');
    await generateSuspectsForCase(caseData.id);
    console.log('[case] generateSuspectsForCase OK');
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

  // Agora temos a rota. Pegar a cidade inicial.
  const routeSteps = await getRouteSteps(caseData.id);
  const startCityId = routeSteps[0]?.city_id;
  
  // Buscar detalhes da cidade inicial para gerar narrativa
  const [[cityRow]] = await pool.query('SELECT name, country_id FROM cities WHERE id = ?', [startCityId]);
  let startCity = cityRow ? { ...cityRow } : { name: 'Desconhecida' };
  
  // Buscar nome do país
  if (startCity.country_id) {
    const [[cRow]] = await pool.query('SELECT name FROM countries WHERE id = ?', [startCity.country_id]);
    startCity.country_name = cRow?.name;
  }

  // Gerar metadata (Objeto + Narrativa + Imagem)
  // Agora é ASYNC porque gera imagem
  const { stolenObject, introText, stolenObjectImage } = await generateCaseMetadata(startCity);

  // Atualizar o caso no banco
  await pool.query(
    'UPDATE active_cases SET stolen_object = ?, intro_text = ? WHERE id = ?',
    [stolenObject, introText, caseData.id]
  );
  
  // Atualizar objeto local para retorno
  caseData.stolenObject = stolenObject;
  caseData.introText = introText;
  caseData.stolenObjectImage = stolenObjectImage; // Attach image URL for frontend

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

  try {
    console.log('[case] visitCurrentCityService…');
    await visitCurrentCityService(caseData.id);
    console.log('[case] visitCurrentCityService OK');
  } catch (e) {
    console.error('[case] visitCurrentCityService FAIL:', String(e));
    throw e;
  }

  const timeState = await getCaseTimeState(caseData.id);
  return {
    ...caseData,
    intro_text: introText, // Garantir snake_case se front esperar isso
    stolen_object_image: stolenObjectImage, // snake_case convention
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
  // Note: findActiveCaseByProfile might not include the image URL if we didn't persist it.
  // Ideally, we should regenerate/retrieve it here if missing.
  // But for now, we leave it as is. If the user refreshes, they might lose the artifact image
  // until we add a column or re-fetch logic. 
  // Given the scope, I will assume the frontend caches it or the user accepts this limitation 
  // until schema migration is allowed.
  
  return activeCase ?? null;
}
