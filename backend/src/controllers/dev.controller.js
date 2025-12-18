import { buildPrompt } from "../ai/prompt.builder.js";
import { guardAIResponse } from "../ai/ai.guard.js";
import { callOpenAI } from "../ai/openai.client.js";
import { AI_INTENT } from "../ai/ai.types.js";
import { generateClue } from "../services/clue.generator.service.js";

export async function testAI(req, res, next) {
  try {
    const prompt = buildPrompt({
      intent: AI_INTENT.CLUE_TEXT,
      archetype: "Informante Nervoso",
      reputation: "Desconfiado",
      context: {
        city: "Cairo",
        tag: { category: "Landmark", value: "Esfinge" },
      },
    });

    const text = await guardAIResponse({
      aiCall: () => callOpenAI(prompt),
      fallback: "Ele falou algo sobre estátuas antigas cobertas de areia.",
    });

    res.json({
      ok: true,
      text,
    });
  } catch (err) {
    next(err);
  }

  const result = await generateClue({
    archetype: "Informante Nervoso",
    reputation: "Desconfiado",
    clueData: {
      country: "Egito",
      city: "Cairo",
      tag: { category: "Landmark", value: "Esfinge" },
    },
    fallbackText: "Ele comentou algo sobre uma estátua antiga no deserto.",
  });

  res.json(result);
}
