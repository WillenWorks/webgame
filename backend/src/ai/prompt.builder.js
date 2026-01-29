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
 *     clue_type?: 'WARNING'|'CAPTURE'|'NEXT_LOCATION'|'VILLAIN_ATTRIBUTE'
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
  const mode = context?.mode || "primary"; 
  const targetType = context?.truth?.targetType || "NONE";
  const targetValue = context?.truth?.targetValue || null;
  const clueType = context?.clue_type || "NEXT_LOCATION";

  // Regras dinâmicas por modo
  const modeRules = {
    primary: [
      "Forneça uma pista sutil mas útil sobre o destino correto.",
      "Não entregue nomes diretamente; use referência cultural/indireta.",
      "Insira a pista organicamente na fala, como quem comenta algo casualmente.",
    ],
    decoy: [
      "Não revele pistas úteis. Dê um aviso de que nada relevante foi visto aqui.",
      "Evite mencionar o destino correto. Foque em reclamar do clima, falar de política local ou dar uma desculpa.",
      "Seja evasivo ou confuso, mas mantenha a personalidade do arquétipo.",
    ],
    final: [
      "Não há mais pistas geográficas.",
      "Se a captura for possível, demonstre medo ou urgência ('Vi alguém suspeito correndo ali!').",
    ],
  }[mode] || [];

  // Regras Especiais para Warning e Capture
  if (clueType === 'WARNING') {
    modeRules.push(
      "O detetive está procurando no lugar errado. O NPC deve ser hostil ou avisar que ele está perdendo tempo.",
      "Não dê nenhuma informação útil. Apenas desencoraje.",
      "Exemplo: 'Você não devia estar aqui.', 'Sinto que você está seguindo sombras.'"
    );
  } else if (clueType === 'CAPTURE') {
    modeRules.push(
      "O criminoso está AQUI e AGORA.",
      "O NPC deve gritar ou avisar com urgência.",
      "Exemplo: 'Ele correu para lá!', 'Peguem-no agora!'"
    );
  }

  // Regras de Reputação
  let reputationRules = "";
  if (reputation === "ALTA") {
    reputationRules = "O NPC reconhece o detetive e é prestativo, admirado ou respeitoso. ('É uma honra ajudar a ACME!').";
  } else if (reputation === "BAIXA") {
    reputationRules = "O NPC é desconfiado, ríspido ou relutante. Só fala o necessário e com má vontade.";
  } else {
    reputationRules = "O NPC é neutro, trata o detetive como um estranho qualquer.";
  }

  // Regras por tipo de alvo
  const targetRules = [];
  if (targetType === "CITY") {
    targetRules.push(
      "A pista deve apontar indiretamente para a próxima cidade (marco, moeda, tradição, geografia, clima, bandeira).",
      "EVITE REPETIR 'MOEDA'. Varie entre comida típica, roupas, monumentos, animais locais ou fatos históricos.",
      "Exemplo BOM: 'Ele queria trocar dinheiro por Yens.' / 'Ele perguntou onde ficava a Torre Eiffel.'",
      "Exemplo RUIM: 'Ele foi para Paris.' (Muito direto)",
    );
  } else if (targetType === "VILLAIN_ATTR") {
    targetRules.push(
      "A pista deve sugerir discretamente um atributo do vilão (veículo, hobby, cabelo, traço).",
      "Descreva como comentário ouvido/observado. Ex: 'Vi alguém com um anel estranho.' ou 'Ele lia um livro sobre montanhismo.'",
    );
  } else if (clueType !== 'WARNING' && clueType !== 'CAPTURE') {
    targetRules.push("Se não houver alvo útil, produza observação genérica sobre o dia ou a cidade.");
  }

  const system = `
Você é um NPC de um jogo de detetive estilo Carmen Sandiego, localizado na cidade de ${context?.city || "Desconhecida"}.
Você fala Português Brasileiro (pt-BR).

SUA PERSONALIDADE: ${archetype || "Cidadão Comum"}
SUA ATITUDE: ${reputationRules}

Regras ABSOLUTAS:
- Fale como uma pessoa real, não como um sistema.
- NUNCA use termos como 'jogador', 'NPC', 'pista', 'decoy', 'jogo', 'mapa', 'interface'.
- Mantenha a imersão total (Diegético).
- Resposta curta (máximo 2 frases).
- Se for dar uma pista, não seja óbvio demais, mas seja justo.
`.trim();

  const user = `
CONTEXTO DO ENCONTRO:
- O detetive perguntou se você viu alguém suspeito recentemente.
- Tipo de Interação: ${clueType}
- Dificuldade/Sutileza: ${subtlety}

INFORMAÇÃO VERDADEIRA (A PISTA):
- Tipo: ${targetType}
- Conteúdo: ${targetValue ?? "(Nenhuma informação relevante)"}

ORIENTAÇÕES ESPECÍFICAS:
${modeRules.join("\n")}
${targetRules.join("\n")}

Gere a resposta do personagem:
`.trim();

  return { system, user };
}
