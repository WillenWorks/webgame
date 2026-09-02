import { callAI, isAiEnabled } from "./ai.client.js";

const NAME_SEEDS = [
  "Exploradores e viajantes",
  "Cartógrafos e geógrafos",
  "Figuras históricas esquecidas",
  "Referências literárias sutis",
  "Mitologia e lendas antigas",
  "Cidades e ventos famosos",
];

export async function generateSuspectName(index = 0, gender = 'Indefinido') {
  if (!isAiEnabled()) return fallbackName(index, gender);

  const theme = NAME_SEEDS[index % NAME_SEEDS.length];

  const system = `
    Você cria nomes fictícios para um jogo de detetive.
    O nome deve respeitar o gênero fornecido.
    Os nomes devem ser distintos entre si.
    `;

  const user = `
    Tema: ${theme}
    Gênero do Personagem: ${gender}

    Gere APENAS UM nome completo fictício para um personagem deste gênero.
    
    REGRAS OBRIGATÓRIAS:
    - Retorne UMA ÚNICA linha
    - SEM listas
    - SEM numeração
    - SEM vírgulas
    - SEM explicações
    - Nome + sobrenome apenas
    - Máximo 3 palavras
    
    Exemplo válido:
    "Victor Marlowe"
    
    Exemplo INVÁLIDO:
    "1. Victor Marlowe 2. John Smith"
    `;

  let rawName;
  try {
    rawName = await callAI({
      system,
      user,
      options: { temperature: 0.9, maxTokens: 24 },
    });
  } catch (err) {
    console.warn('[name.generator] fallback de nome acionado:', err.message);
    return fallbackName(index, gender);
  }
  return normalizeName(rawName);
}

// Nomes de reserva (offline) — variados o bastante para 12 suspeitos por caso.
const FALLBACK_FIRST_M = ["Victor", "Rurik", "Amaro", "Caspian", "Dario", "Ingmar", "Tobias", "Rafael", "Néstor", "Silvan", "Lorcan", "Emeric"];
const FALLBACK_FIRST_F = ["Vesna", "Ottilie", "Marlowe", "Isaura", "Freya", "Calla", "Dagny", "Lucía", "Priya", "Solveig", "Ravenna", "Elke"];
const FALLBACK_LAST = ["Marlowe", "Vansel", "Okonkwo", "Ferreira", "Nakamura", "Dubois", "Hargrove", "Petrova", "al-Rashid", "Lindqvist", "Costa", "Vane"];

function fallbackName(index = 0, gender = 'Indefinido') {
  const g = String(gender).toLowerCase();
  const firsts = g.startsWith('f') || g.includes('mulher') || g.includes('fem')
    ? FALLBACK_FIRST_F
    : FALLBACK_FIRST_M;
  const first = firsts[index % firsts.length];
  const last = FALLBACK_LAST[(index * 7 + 3) % FALLBACK_LAST.length];
  return `${first} ${last}`;
}

function normalizeName(name) {
  if (!name) return "Suspeito Desconhecido";

  return name
    .replace(/\r?\n/g, " ") // remove quebras
    .replace(/\d+\./g, "") // remove numeração "1."
    .split(/[,;]|  \s+/)[0] // corta listas
    .trim()
    .split(" ")
    .slice(0, 3) // no máx 3 palavras
    .join(" ")
    .slice(0, 140);
}
