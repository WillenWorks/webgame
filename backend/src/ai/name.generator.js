import { callOpenAI } from "./openai.client.js";

const NAME_SEEDS = [
  "Exploradores e viajantes",
  "Cartógrafos e geógrafos",
  "Figuras históricas esquecidas",
  "Referências literárias sutis",
  "Mitologia e lendas antigas",
  "Cidades e ventos famosos",
];

export async function generateSuspectName(index = 0) {
  const theme = NAME_SEEDS[index % NAME_SEEDS.length];

  const system = `
Você cria nomes fictícios para um jogo de detetive.
Os nomes devem ser distintos entre si.
`;

  const user = `
Tema: ${theme}

Gere APENAS UM nome completo fictício para um personagem.

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

  const rawName = await callOpenAI({ system, user });
  return normalizeName(rawName);
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
