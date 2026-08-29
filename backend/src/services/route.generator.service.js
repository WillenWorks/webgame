import { countRoutesForCase, getCaseProfileInfo, insertRouteStep } from '../repositories/route.repo.js';
import { findProfileById } from '../repositories/profile.repo.js';
import { getAllRanks } from '../repositories/ranks.repo.js';
import { getCitiesForRouteBuilding } from '../repositories/city.repo.js';
import { getCaseDifficulty } from '../repositories/case.repo.js';
import { buildRoute } from '../domain/route.rules.js';
import { ROUTE_STEPS } from '../config/game.rules.js';

/**
 * Gera a rota de perseguição do caso: uma cadeia geograficamente coerente de
 * cidades (`domain/route.rules.js`) e as opções de destino (1 correta + decoys
 * plausíveis) de cada passo. Idempotente por caso.
 */
export async function generateRouteService({
  activeCaseId,
  difficulty = null,
  steps = ROUTE_STEPS,
  optionsPerStep = null,
}) {
  if (!activeCaseId) {
    throw new Error('CaseId não informado');
  }

  const existingCount = await countRoutesForCase(activeCaseId);
  if (existingCount > 0) {
    throw new Error('Rota já foi gerada para este caso');
  }

  const diff = difficulty || (await getCaseDifficulty(activeCaseId)) || 'EASY';

  // Patente alta adiciona 1 decoy extra (mantém o "nudge" do design anterior).
  let extraDecoys = 0;
  const caseInfo = await getCaseProfileInfo(activeCaseId);
  if (caseInfo?.profile_id) {
    const profile = await findProfileById(caseInfo.profile_id);
    const ranks = await getAllRanks();
    const currentRank = ranks.find((r) => r.id === profile?.rank_id) || ranks[0];
    if (Number(currentRank?.difficulty_modifier || 1) >= 1.3) extraDecoys = 1;
  }

  const cities = await getCitiesForRouteBuilding();

  const { route, optionsByStep } = buildRoute({
    cities,
    difficulty: diff,
    steps,
    optionsPerStep,
    extraDecoys,
  });

  for (let i = 0; i < route.length; i++) {
    const optionsJson = optionsByStep[i] ? JSON.stringify(optionsByStep[i]) : null;
    await insertRouteStep({
      activeCaseId,
      cityId: route[i],
      stepOrder: i + 1,
      optionsJson,
    });
  }

  return route;
}
