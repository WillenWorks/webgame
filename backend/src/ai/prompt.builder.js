import { AI_INTENT } from "./ai.types.js";

/**
 * Prompt refinado para narrativa dos NPCs (pt-BR), com controle por dificuldade,
 * contexto de fase (decoy vs correta) e estilo de interação.
 *
 * Parâmetros esperados:
 * - intent: AI_INTENT.CLUE_TEXT
 * - archetype: string (ex.: "Formal", "Intelectual", "Desconfiado", "Cultural", etc)
 * - reputation: string (ex.: "NEUTRA", "ALTA", "BAIXA")
 * - difficulty: number (ex.: 1.0 padrão; >1.0 = mais sutil)
 * - context: {
 *     city?: string,
 *     truth?: { targetType: 'CITY'|'VILLAIN_ATTR'|'NONE', targetValue?: string },
 *     mode?: 'primary'|'decoy'|'final',
 *     phase?: number // 1..5
 *   }
 */
export function buildPrompt({ intent, archetype, reputation, difficulty = 1.0, context }) {
  if (!Object.values(AI_INTENT).includes(intent)) {
    throw new Error(
      `Invalid AI intent: ${intent}. Expected one of: ${Object.values(AI_INTENT).join(", ")}`
    );
  }

  const safeDifficulty = Math.max(0.8, Math.min(1.5, Number(difficulty) || 1.0));
  const subtlety = safeDifficulty >= 1.2 ? "ALTA" : safeDifficulty >= 1.0 ? "MEDIA" : "BAIXA";
  const mode = context?.mode || "primary"; // "decoy" ou "final" também
  const phase = context?.phase || null;
  const targetType = context?.truth?.targetType || "NONE";
  const targetValue = context?.truth?.targetValue || null;

  // Regras dinâmicas por modo
  const modeRules = {
    primary: [
      "Forneça uma pista sutil mas útil sobre o destino correto.",
      "Não entregue nomes diretamente; use referência cultural/indireta.",
    ],
    decoy: [
      "Não revele pistas úteis. Dê um aviso de que nada relevante foi visto aqui.",
      "Evite mencionar o destino correto. Foque em informação vaga/irrelevante.",
    ],
    final: [
      "Não há mais pistas. Emita mensagens de alerta ou proximidade.",
      "Se a captura for possível, mantenha tensão sem revelar localização exata.",
    ],
  }[mode] || [];

  // Regras por tipo de alvo
  const targetRules = [];
  if (targetType === "CITY") {
    targetRules.push(
      "A pista deve apontar indiretamente para a próxima cidade (marco, moeda, tradição).",
      "Evite nomes explícitos; prefira indícios culturais reconhecíveis."
    );
  } else if (targetType === "VILLAIN_ATTR") {
    targetRules.push(
      "A pista deve sugerir discretamente um atributo do vilão (ex.: veículo, hobby, cabelo, traço).",
      "Descreva como comentário ouvido/observado por terceiros."
    );
  } else {
    targetRules.push("Se não houver alvo útil, produza observação genérica ou aviso cauteloso.");
  }

  // Graduação de sutileza conforme dificuldade
  const subtleGuidance = {
    ALTA: [
      "Use metáforas leves e referências indiretas (1–2 palavras-chave no máximo).",
      "Evite qualquer indício que facilite adivinhação direta.",
    ],
    MEDIA: [
      "Use uma referência cultural evidente, porém sem dizer nomes.",
      "Permaneça em 2 frases curtas e naturais.",
    ],
    BAIXA: [
      "Use menção indireta com uma dica reconhecível (ex.: moeda, monumento famoso).",
      "Ainda sem nomes diretos; não revele a resposta completa.",
    ],
  }[subtlety];

  const system = `
Você é um NPC de um jogo de detetive (Carmen-style) falando em português brasileiro.

Regras ABSOLUTAS:
- Fale SEMPRE em pt-BR.
- NUNCA invente fatos.
- NUNCA contradiga os dados fornecidos.
- NUNCA revele respostas explícitas (nomes diretos de cidades/países).
- Máximo de 2 frases curtas por resposta.
- Tom de fala de NPC, com naturalidade e leveza.
- Não descreva ações do jogador nem cenas longas.
- Quando o contexto for decoy, a fala NÃO deve ajudar o jogador a avançar.
`.trim();

  const guidanceBlocks = [
    `Arquetipo: ${archetype || "NPC"}`,
    `Reputação do jogador: ${reputation || "NEUTRA"}`,
    `Fase: ${phase ?? ""}`,
    `Dificuldade: ${subtlety}`,
    `Modo: ${mode}`,
    `Cidade atual: ${context?.city || "(desconhecida)"}`,
  ].filter(Boolean).join("\n");

  const targetBlock = `
Alvo narrativo:
- Tipo: ${targetType}
- Valor indireto: ${targetValue ?? "(nenhum)"}
`.trim();

  const rulesBlock = [
    "Orientações do modo:",
    ...modeRules,
    "\nOrientações do alvo:",
    ...targetRules,
    "\nSutileza (graduação pela dificuldade):",
    ...subtleGuidance,
  ].join("\n- ");

  const user = `
INTENÇÃO: ${intent}

${guidanceBlocks}

${targetBlock}

${rulesBlock}

Saída desejada:
- 2 frases curtas.
- Linguagem natural de NPC.
- Evite nomes explícitos; use indícios.
- Se decoy, produza aviso sutil sem pista útil.
`.trim();

  return { system, user };
}
