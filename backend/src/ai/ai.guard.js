/**
 * Guarda de resposta de IA.
 *
 * Executa a chamada de IA, valida o retorno e — em qualquer falha (timeout,
 * rede, resposta vazia, JSON inválido, violação de tom) — devolve o fallback
 * diegético instantaneamente. Nunca propaga exceções para o gameplay.
 */

import { parseJsonLoose } from './ai.client.js';
import env from '../config/env.js';
import { observeAiCall } from '../utils/metrics.js';

// Termos que quebram a imersão (o NPC nunca deve "saber" que é um jogo).
const IMMERSION_BREAKERS = [
  /\bjogador(?:es)?\b/i,
  /\bNPC\b/i,
  /\bpista(?:s)?\b/i,
  /\bdecoy\b/i,
  /\binterface\b/i,
  /\bmodelo de linguagem\b/i,
  /\bcomo uma? (?:assistente|inteligência artificial)\b/i,
];

/**
 * @param {object}   params
 * @param {Function} params.aiCall   - função async que retorna string (ou completion)
 * @param {string}   params.fallback - texto diegético usado em qualquer falha
 * @param {boolean} [params.enforceImmersion=true]
 */
export async function guardAIResponse({ aiCall, fallback, enforceImmersion = true }) {
  try {
    const response = await aiCall();

    // Aceita tanto string direta quanto objeto de completion (OpenAI-like).
    const text =
      typeof response === 'string'
        ? response
        : response?.choices?.[0]?.message?.content ??
          (Array.isArray(response?.content)
            ? response.content.filter((b) => b.type === 'text').map((b) => b.text).join('')
            : undefined);

    if (!text || text.trim().length < 3) {
      throw new Error('Resposta de IA vazia ou inválida');
    }

    const cleaned = sanitize(text);

    if (enforceImmersion && IMMERSION_BREAKERS.some((re) => re.test(cleaned))) {
      throw new Error('Resposta de IA quebrou a imersão diegética');
    }

    return cleaned;
  } catch (err) {
    observeAiCall({ provider: env.AI_PROVIDER, result: 'fallback' });
    console.warn('[AI GUARD] fallback acionado:', err.message);
    return fallback;
  }
}

/**
 * Versão estruturada: garante um objeto JSON válido, opcionalmente validado
 * por um predicado. Em qualquer falha devolve `fallback` (objeto).
 *
 * @param {object}   params
 * @param {Function} params.aiCall   - async → objeto (já parseado) ou string JSON
 * @param {object}   params.fallback - objeto diegético de reserva
 * @param {Function} [params.validate] - (obj) => boolean
 */
export async function guardAIJson({ aiCall, fallback, validate }) {
  try {
    const result = await aiCall();
    const obj =
      result && typeof result === 'object' ? result : parseJsonLoose(result);

    if (validate && !validate(obj)) {
      throw new Error('JSON da IA não passou na validação de domínio');
    }
    return obj;
  } catch (err) {
    observeAiCall({ provider: env.AI_PROVIDER, result: 'fallback' });
    console.warn('[AI GUARD] fallback JSON acionado:', err.message);
    return fallback;
  }
}

function sanitize(text) {
  let cleaned = String(text).replace(/\s+/g, ' ').trim();

  // Remove aspas/prefixos comuns de "narração" que a IA às vezes adiciona.
  cleaned = cleaned.replace(/^["“”'`]+|["“”'`]+$/g, '').trim();
  cleaned = cleaned.replace(/^(?:resposta|npc|personagem)\s*:\s*/i, '').trim();

  // Garante pontuação final mínima.
  if (cleaned && !/[.!?]["”]?$/.test(cleaned)) {
    cleaned += '.';
  }

  return cleaned;
}
