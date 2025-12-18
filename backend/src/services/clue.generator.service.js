import { buildPrompt } from '../ai/prompt.builder.js';
import { guardAIResponse } from '../ai/ai.guard.js';
import { callOpenAI } from '../ai/openai.client.js';
import { AI_INTENT } from '../ai/ai.types.js';

/**
 * Gera uma pista textual para o jogador.
 *
 * REGRA FUNDAMENTAL:
 * - O BACKEND define a verdade da pista
 * - A IA apenas transforma dados estruturados em narrativa curta
 * - Se algo estiver inconsistente, usa fallback
 */
export async function generateClue({
  archetype,
  reputation,
  clueData,
  fallbackText
}) {
  /**
   * clueData SEMPRE vem do banco (case_clues + joins)
   *
   * Exemplos esperados:
   *
   * NEXT_LOCATION:
   * {
   *   clue_type: 'NEXT_LOCATION',
   *   target_type: 'CITY',
   *   target_value: 'Cairo'
   * }
   *
   * VILLAIN_ATTRIBUTE:
   * {
   *   clue_type: 'VILLAIN_ATTRIBUTE',
   *   target_value: 'hobby',
   *   resolved_value: 'Tênis'
   * }
   *
   * WARNING / CAPTURE:
   * {
   *   clue_type: 'WARNING'
   * }
   */

  // 🛑 Blindagem total: se não houver dados mínimos
  if (!clueData || !clueData.clue_type) {
    return {
      text: fallbackText || 'Nada de útil foi encontrado aqui.',
      meta: null
    };
  }

  // WARNING e CAPTURE não usam IA
  if (clueData.clue_type === 'WARNING') {
    return {
      text: fallbackText || 'Você sente que está muito perto de algo perigoso.',
      meta: null
    };
  }

  if (clueData.clue_type === 'CAPTURE') {
    return {
      text: fallbackText || 'Tudo indica que o criminoso está escondido aqui.',
      meta: null
    };
  }

  // 🔹 Contexto seguro para IA
  const context = {
    clue_type: clueData.clue_type
  };

  if (clueData.clue_type === 'NEXT_LOCATION') {
    context.destination = {
      type: clueData.target_type,
      value: clueData.target_value
    };
  }

  if (clueData.clue_type === 'VILLAIN_ATTRIBUTE') {
    context.attribute = {
      type: clueData.target_value,
      value: clueData.resolved_value
    };
  }

  // 1️⃣ Monta prompt de forma segura
  const prompt = buildPrompt({
    intent: AI_INTENT.CLUE_TEXT,
    archetype,
    reputation,
    context
  });

  // 2️⃣ Executa IA com proteção
  const text = await guardAIResponse({
    aiCall: () => callOpenAI(prompt),
    fallback: fallbackText || 'A pessoa parece hesitar antes de dizer qualquer coisa.'
  });

  // 3️⃣ Retorno padronizado
  return {
    text,
    meta: {
      clue_type: clueData.clue_type,
      target: clueData.target_value || null
    }
  };
}
