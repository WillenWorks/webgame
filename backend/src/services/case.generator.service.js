import { callAIStructured } from '../ai/ai.client.js';
import { guardAIJson } from '../ai/ai.guard.js';
import { buildCaseBriefingPrompt, CASE_METADATA_SCHEMA } from '../ai/prompt.builder.js';
import { caseFallback } from '../ai/fallbacks.js';

/**
 * Gera o objeto roubado + briefing inicial ancorado na cidade de partida.
 * Usa o adaptador universal de IA com saída estruturada (JSON Schema) e,
 * em qualquer falha, cai num briefing diegético coerente com a região.
 */
export async function generateCaseMetadata(city, rankLabel = 'Recruta') {
  const country = city?.country_name || 'Desconhecido';
  const cityName = city?.name || 'Cidade Desconhecida';

  const { system, user } = buildCaseBriefingPrompt({ cityName, country, rankLabel });
  const fallback = caseFallback({ cityName, country });

  return guardAIJson({
    aiCall: () =>
      callAIStructured({
        system,
        user,
        schema: CASE_METADATA_SCHEMA,
        options: { temperature: 0.85, maxTokens: 400 },
      }),
    fallback,
    validate: (obj) =>
      obj &&
      typeof obj.stolenObject === 'string' &&
      obj.stolenObject.trim().length > 2 &&
      typeof obj.introText === 'string' &&
      obj.introText.trim().length > 20,
  }).then((meta) => ({
    stolenObject: meta.stolenObject,
    introText: meta.introText.slice(0, 400),
    stolenObjectImage: '/images/artifact-placeholder.png',
  }));
}
