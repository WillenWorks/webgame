import { buildPrompt } from '../ai/prompt.builder.js';
import { guardAIResponse } from '../ai/ai.guard.js';
import { callAI, isAiEnabled } from '../ai/ai.client.js';
import { AI_INTENT } from '../ai/ai.types.js';
import { clueFallback } from '../ai/fallbacks.js';
import { buildNextLocationClue, buildVillainAttributeClue } from '../domain/clue.rules.js';

/**
 * Gera a fala da testemunha.
 *
 * O texto determinístico (a partir dos dados culturais validados do seed) é
 * SEMPRE a base — o jogo é 100% jogável e correto sem IA. Quando a IA está
 * ativa, ela apenas reescreve esse indício no estilo do NPC; se a reescrita
 * falhar, mudar de cidade ou entregar o nome direto, cai no determinístico.
 *
 * @param {object} params
 * @param {string} params.archetype
 * @param {'ALTA'|'NEUTRA'|'BAIXA'} params.reputation
 * @param {'EASY'|'HARD'|'EXTREME'} [params.difficulty]
 * @param {'NEXT_LOCATION'|'VILLAIN_ATTRIBUTE'|'WARNING'|'CAPTURE'} params.clueType
 * @param {object|null} params.truth   { kind:'CITY'|'VILLAIN_ATTR', ... }
 * @param {{ city?:string, phase?:number, mode?:string }} [params.context]
 * @returns {Promise<{ text:string, meta:object }>}
 */
export async function generateClue({ archetype, reputation, difficulty = 'EASY', clueType, truth, context = {} }) {
  // ── 1. Texto determinístico (base garantida) ───────────────────────────
  let deterministic;
  if (truth?.kind === 'CITY') {
    deterministic = buildNextLocationClue({
      cityName: truth.cityName,
      countryName: truth.countryName,
      culturalInfo: truth.culturalInfo,
      descriptionPrompt: truth.descriptionPrompt,
      topicCategory: truth.topicCategory,
      reputation,
    });
  } else if (truth?.kind === 'VILLAIN_ATTR') {
    deterministic = buildVillainAttributeClue({
      attributeType: truth.attributeType,
      attributeValue: truth.attributeValue,
      reputation,
    });
  } else {
    deterministic = clueFallback({ reputation, clueType });
  }

  // ── 2. Enriquecimento opcional via IA ─────────────────────────────────
  if (!isAiEnabled() || (clueType !== 'NEXT_LOCATION' && clueType !== 'VILLAIN_ATTRIBUTE')) {
    return { text: deterministic, meta: { clueType, source: 'deterministic' } };
  }

  const diffFactor = difficulty === 'EXTREME' ? 1.4 : difficulty === 'HARD' ? 1.2 : 1.0;
  const promptContext = {
    city: context.city || 'Desconhecida',
    mode: context.mode || 'primary',
    phase: context.phase,
    difficulty: diffFactor,
    clue_type: clueType,
    truth: {
      targetType: truth?.kind === 'CITY' ? 'CITY' : 'VILLAIN_ATTR',
      targetValue:
        truth?.kind === 'CITY'
          ? `${truth.cityName}, ${truth.countryName}`
          : `${truth.attributeType}: ${truth.attributeValue}`,
    },
    topicCategory: truth?.kind === 'CITY' ? truth.topicCategory : undefined,
  };

  const prompt = buildPrompt({
    intent: AI_INTENT.CLUE_TEXT,
    archetype,
    reputation,
    difficulty: diffFactor,
    context: promptContext,
  });

  const text = await guardAIResponse({
    aiCall: () =>
      callAI({ system: prompt.system, user: prompt.user, options: { temperature: 0.8, maxTokens: 160 } }),
    fallback: deterministic,
  });

  // Rejeita reescritas que entregam o destino direto (quebra a dedução).
  if (truth?.kind === 'CITY') {
    const t = String(text).toLowerCase();
    if (t.includes(String(truth.cityName).toLowerCase())) {
      return { text: deterministic, meta: { clueType, source: 'deterministic-guard' } };
    }
  }

  return { text, meta: { clueType, source: 'ai' } };
}
