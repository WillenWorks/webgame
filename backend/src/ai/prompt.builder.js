import { AI_INTENT } from "./ai.types.js";

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
  const category = context?.topicCategory; // "Food", "Flag", "Currency", etc.

  if (targetType === "CITY") {
    if (category) {
      // Regras específicas baseadas na Categoria sorteada pelo Backend
      targetRules.push(
        `A pista DEVE focar EXCLUSIVAMENTE em: ${category}.`,
        `Cite um elemento específico de ${category} sobre o local de destino (${targetValue}).`,
        `Não use termos genéricos. Seja específico (ex: se for Moeda, diga o nome da moeda; se for Comida, diga o prato).`
      );
    } else {
      // Fallback genérico
      targetRules.push(
        "A pista deve apontar indiretamente para a próxima cidade/país (marco, moeda, tradição, geografia, clima, bandeira).",
        "IMPORTANTE: Cite um PRATO TÍPICO, VESTIMENTA, ANIMAL ou MONUMENTO ESPECÍFICO do local de destino."
      );
    }
    
    targetRules.push(
      "Exemplo BOM: 'Ele queria trocar dinheiro por Yens.' / 'Ele perguntou onde ficava a Torre Eiffel.'",
      "Exemplo RUIM: 'Ele foi para Paris.' (Muito direto)",
    );
  } else if (targetType === "VILLAIN_ATTR") {
    targetRules.push(
      "A pista deve sugerir discretamente um atributo do vilão (veículo, hobby, cabelo, traço).",
      "Descreva como comentário ouvido/observado. Ex: 'Vi alguém com um anel estranho.' ou 'Ele lia um livro sobre montanhismo.'",
      "ATENÇÃO: Use APENAS o atributo fornecido na 'Informação Verdadeira'. NÃO invente outros atributos (ex: não diga que fumava se não estiver listado).",
    );
  } else if (clueType !== 'WARNING' && clueType !== 'CAPTURE') {
    targetRules.push("Se não houver alvo útil, produza observação genérica sobre o dia ou a cidade.");
  }

  const system = `
    Você é um morador/testemunha na cidade de ${context?.city || "Desconhecida"}, dentro de um thriller de detetive estilo Carmen Sandiego.
    Você fala Português Brasileiro (pt-BR) natural e coloquial.

    SUA PERSONALIDADE: ${archetype || "Cidadão Comum"}
    SUA ATITUDE COM O DETETIVE: ${reputationRules}

    TOM OBRIGATÓRIO:
    - Urgente e tenso: um crime acabou de acontecer e o tempo está correndo.
    - Levemente misterioso: você dá indícios, não relatórios.
    - Culturalmente preciso: use detalhes reais e específicos da cultura local (comida, moeda, marcos, clima, costumes) — nunca clichês genéricos nem informação inventada.

    Regras ABSOLUTAS:
    - Fale como uma pessoa real reagindo no calor do momento, nunca como um sistema.
    - NUNCA use termos como 'jogador', 'NPC', 'pista', 'decoy', 'jogo', 'mapa', 'interface', 'missão'.
    - NUNCA invente atributos físicos, veículos ou hábitos do suspeito que não foram fornecidos na "Informação Verdadeira".
    - NUNCA cite um destino/cidade pelo nome diretamente — use referência cultural indireta.
    - Mantenha a imersão total (diegético).
    - Resposta curta: no máximo 2 frases.
    - Ao dar um indício, seja sutil mas justo: a informação verdadeira precisa estar realmente presente na fala.
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

/**
 * JSON Schema (subset OpenAPI 3.0 / compatível com Gemini `responseSchema`)
 * para os metadados de um caso.
 */
export const CASE_METADATA_SCHEMA = {
  type: "object",
  properties: {
    stolenObject: {
      type: "string",
      description: "Nome do objeto/tesouro roubado, culturalmente relevante para o local.",
    },
    introText: {
      type: "string",
      description: "Briefing da missão para o detetive, tom sério e urgente, até 350 caracteres.",
    },
    stolenObjectImage: {
      type: "string",
      description: 'Sempre "/images/artifact-placeholder.png".',
    },
  },
  required: ["stolenObject", "introText", "stolenObjectImage"],
};

/**
 * Constrói o prompt do briefing inicial de um caso, ancorado na cidade de
 * partida. A IA deve ser culturalmente rica, mas o backend continua dono da
 * verdade canônica (rota, suspeitos, etc.).
 */
export function buildCaseBriefingPrompt({ cityName, country, rankLabel = "Recruta" }) {
  const system = `
    Você é o Agente-Chefe da ACME, uma agência internacional de recuperação de artefatos.
    Você fala Português Brasileiro (pt-BR).
    Gere um caso de detetive educacional estilo Carmen Sandiego sobre um tesouro roubado.

    DIRETRIZES DE ESTILO:
    - Tom urgente, sério e levemente misterioso — o roubo acabou de acontecer.
    - Culturalmente preciso: o objeto roubado deve ser plausível e específico para ${cityName}, ${country} (artefato histórico real, obra de arte, joia, tecnologia, manuscrito).
    - Nada de clichês genéricos ("um diamante", "uma estátua") — seja concreto e evocativo.
    - Sem meta-linguagem de jogo (nada de "jogador", "fase", "nível", "pista").

    Responda EXCLUSIVAMENTE com um JSON válido seguindo o schema fornecido.
  `.trim();

  const user = `
    Cidade de partida: ${cityName}, ${country}
    Patente do detetive: ${rankLabel}

    Gere:
    1. "stolenObject": objeto roubado, culturalmente relevante para ${cityName}/${country}.
    2. "introText": briefing para o detetive (máx. 350 caracteres), tom urgente, citando o objeto e por que ele importa.
    3. "stolenObjectImage": exatamente "/images/artifact-placeholder.png".
  `.trim();

  return { system, user };
}
