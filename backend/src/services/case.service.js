import { v4 as uuid } from 'uuid';
import {
  createCase,
  findActiveCaseByProfile
} from '../repositories/case.repo.js';
import { generateSuspectsForCase } from './suspect.generator.service.js';
import { generateRouteService } from './route.generator.service.js';
import { seedCasePhases } from './phase.seed.service.js';
import { visitCurrentCityService } from './visit.service.js';

/**
 * Cria um novo caso para um perfil.
 * Regra:
 * - Só pode existir 1 caso ativo por perfil
 */
export async function createCaseService({ profileId }) {
  if (!profileId) {
    throw new Error('Perfil não informado');
  }

  const existing = await findActiveCaseByProfile(profileId);
  if (existing) {
    throw new Error('Já existe um caso ativo para este perfil');
  }

  const caseData = {
    id: uuid(),
    profileId,
    stolenObject: 'Artefato histórico valioso',
    startTime: Date.now(),
    timeLimitHours: 48
  };

  // 1) Cria o caso
  await createCase(caseData);

  // 2) Gera suspeitos
  await generateSuspectsForCase(caseData.id);

  // 3) Gera rota com opções por fase
  await generateRouteService({ activeCaseId: caseData.id, steps: 5, optionsPerStep: 4 });

  // 4) Semear locais por fase (cidade inicial + opções de cada fase)
  await seedCasePhases(caseData.id);

  // 5) Garantir que a cidade inicial tenha 3 locais disponíveis imediatamente
  await visitCurrentCityService(caseData.id);

  return caseData;
}

export async function getActiveCaseService(profileId) {
  if (!profileId) {
    throw new Error('Perfil não informado');
  }

  const activeCase = await findActiveCaseByProfile(profileId);
  return activeCase ?? null;
}
