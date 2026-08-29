import { buildPrompt } from "../ai/prompt.builder.js";
import { guardAIResponse } from "../ai/ai.guard.js";
import { callAI } from "../ai/ai.client.js";
import { AI_INTENT } from "../ai/ai.types.js";
import { generateClue } from "../services/clue.generator.service.js";
import env from "../config/env.js";

/**
 * Endpoint de diagnóstico da camada de IA.
 * Exercita o adaptador universal (provedor ativo), o prompt builder e o
 * gerador de pistas com fallback diegético.
 */
export async function testAI(req, res, next) {
  try {
    const startedAt = Date.now();

    const prompt = buildPrompt({
      intent: AI_INTENT.CLUE_TEXT,
      archetype: "Informante Nervoso",
      reputation: "NEUTRA",
      context: {
        city: "Cairo",
        mode: "primary",
        clue_type: "NEXT_LOCATION",
        truth: { targetType: "CITY", targetValue: "Kyoto, Japão" },
        topicCategory: "Culinária",
      },
    });

    const rawText = await guardAIResponse({
      aiCall: () =>
        callAI({
          system: prompt.system,
          user: prompt.user,
          options: { temperature: 0.8, maxTokens: 160 },
        }),
      fallback: "Ele reclamou que precisava trocar dinheiro por ienes antes de pegar o próximo voo.",
    });

    const clue = await generateClue({
      archetype: "Informante Nervoso",
      reputation: "NEUTRA",
      clueData: {
        clue_type: "NEXT_LOCATION",
        target_type: "CITY",
        target_value: "Kyoto, Japão",
      },
      context: { city: "Cairo", mode: "primary", topicCategory: "Arte" },
    });

    res.json({
      ok: true,
      provider: env.AI_PROVIDER,
      elapsedMs: Date.now() - startedAt,
      rawText,
      clue,
    });
  } catch (err) {
    next(err);
  }
}
