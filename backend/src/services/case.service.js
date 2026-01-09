import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile
} from '../repositories/case.repo.js';
import { generateSuspectsForCase } from './suspect.generator.service.js';
import { generateRouteService } from './route.generator.service.js';
import { seedCasePhases } from './phase.seed.service.js';
import { visitCurrentCityService } from './visit.service.js';
import { startCaseClock } from './time.service.js';
import { getRouteSteps } from '../repositories/route.repo.js';
import { getCaseTimeState } from '../repositories/case_time_state.repo.js';

/**
 * Cria um novo caso para um perfil.
 * Regra:
 * - Só pode existir 1 caso ativo por perfil
 */
// export async function createCaseService({ profileId, difficulty = 'EASY' }) {
//   if (!profileId) {
//     throw new Error('Perfil não informado');
//   }

//   const existing = await findActiveCaseByProfile(profileId);
//   if (existing) {
//     throw new Error('Já existe um caso ativo para este perfil');
//   }

//   const caseData = {
//     id: uuid(),
//     profileId,
//     stolenObject: 'Artefato histórico valioso',
//     startTime: new Date(),
//     timeLimitHours: null,
//     difficultyCode: difficulty,
//   };

//   // 1) Cria o caso
//   await createCase(caseData); // caseData inclui difficultyCode para persistir difficulty_id

//   // 2) Gera suspeitos
//   await generateSuspectsForCase(caseData.id);

//   // 3) Gera rota com opções por fase
//   await generateRouteService({ activeCaseId: caseData.id, steps: 5, optionsPerStep: 4 });

//   // 4) Construir rota esperada e iniciar relógio ANTES de qualquer visita (evita erro de estado temporal)
//   const steps = await getRouteSteps(caseData.id);
//   const expectedRoute = [];
//   for (let i = 0; i < steps.length - 1; i++) {
//     expectedRoute.push({ from: steps[i].city_id, to: steps[i + 1].city_id, visits: 3, investigateExtra: false });
//   }
//   await startCaseClock({ caseId: caseData.id, difficulty, timezone: 'America/Sao_Paulo', expectedRoute });

//   // 5) Semear locais por fase
//   await seedCasePhases(caseData.id);

//   // 6) Visitar cidade inicial (consome tempo de visita)
//   await visitCurrentCityService(caseData.id);

//   // 7) Ler tempos reais do estado
//   const timeState = await getCaseTimeState(caseData.id);

//   return {
//     ...caseData,
//     startTime: timeState?.start_time ?? null,
//     deadlineTime: timeState?.deadline_time ?? null,
//     currentTime: timeState?.current_time ?? null,
//   };
// }

export async function createCaseService({ profileId, difficulty = 'EASY' }) {
  if (!profileId) throw new Error('Perfil não informado');

  const existing = await findActiveCaseByProfile(profileId);
  if (existing) throw new Error('Já existe um caso ativo para este perfil');

  const caseData = {
    id: uuid(),
    profileId,
    stolenObject: 'Artefato histórico valioso',
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
    throw e; // stop here to return clear error
  }

  try {
    console.log('[case] generateRouteService…');
    await generateRouteService({ activeCaseId: caseData.id, steps: 5, optionsPerStep: 4 });
    console.log('[case] generateRouteService OK');
  } catch (e) {
    console.error('[case] generateRouteService FAIL:', String(e));
    throw e;
  }

  try {
    const steps = await getRouteSteps(caseData.id);
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
