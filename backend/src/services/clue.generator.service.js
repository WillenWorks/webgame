import { buildPrompt } from '../ai/prompt.builder.js';
import { guardAIResponse } from '../ai/ai.guard.js';
import { callOpenAI } from '../ai/openai.client.js';
import { AI_INTENT } from '../ai/ai.types.js';

export async function generateClue({
  archetype,
  reputation,
  clueData,
  fallbackText,
  context // city, etc.
}) {
  if (!clueData || !clueData.clue_type) {
    return {
      text: fallbackText || 'Não vi ninguém estranho por aqui hoje. O dia está tranquilo.',
      meta: null
    };
  }

  // Preparar contexto para o prompt
  const promptContext = {
    ...context,
    clue_type: clueData.clue_type,
    truth: {
      targetType: 'NONE',
      targetValue: null
    }
  };

  if (clueData.clue_type === 'NEXT_LOCATION') {
    promptContext.truth.targetType = clueData.target_type; // 'CITY'
    promptContext.truth.targetValue = clueData.target_value; // Nome da cidade ou dica cultural
  }

  if (clueData.clue_type === 'VILLAIN_ATTRIBUTE') {
    promptContext.truth.targetType = 'VILLAIN_ATTR';
    promptContext.truth.targetValue = `${clueData.target_value}: ${clueData.resolved_value}`;
  }
  
  // Agora WARNING e CAPTURE também passam pelo Prompt Builder para serem diegéticos
  if (clueData.clue_type === 'WARNING' || clueData.clue_type === 'CAPTURE') {
      promptContext.mode = 'decoy'; // Usa regras restritivas/urgentes
  }

  // Construir prompt usando o novo builder com suporte a reputação
  const prompt = buildPrompt({
    intent: AI_INTENT.CLUE_TEXT,
    archetype,
    reputation, // "ALTA", "BAIXA", "NEUTRA"
    difficulty: context?.difficulty || 1.0,
    context: promptContext
  });

  // Fallbacks temáticos por reputação (caso a IA falhe)
  let fallback = 'Desculpe, estou com pressa.';
  if (reputation === 'ALTA') fallback = 'Gostaria de ajudar, mas realmente não vi nada. Boa sorte, Agente!';
  if (reputation === 'BAIXA') fallback = 'Não tenho nada para dizer a você. Circulando.';

  // Fallbacks específicos para Warning/Capture se IA falhar
  if (clueData.clue_type === 'WARNING') fallback = 'Você não deveria estar aqui. Vá embora.';
  if (clueData.clue_type === 'CAPTURE') fallback = 'Lá está ele! Peguem o ladrão!';

  const text = await guardAIResponse({
    aiCall: () => callOpenAI(prompt),
    fallback: fallbackText || fallback
  });

  return {
    text,
    meta: {
      clue_type: clueData.clue_type,
      target: clueData.target_value || null
    }
  };
}
