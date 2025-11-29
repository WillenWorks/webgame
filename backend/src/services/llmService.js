// src/services/llmService.js
import OpenAI from "openai"
import dotenv from "dotenv"

dotenv.config()

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Gera narrativa completa do caso:
 * - title
 * - summary
 * - steps investigativos
 * - pistas sobre o vilão
 *
 * @param {Object} input
 * @param {Object} input.villain - dados do vilão culpado
 * @param {Array} input.locations - lista de locais do banco (ou subset)
 * @param {String} input.difficulty - easy/medium/hard
 */
export async function generateCarmenCaseStructure(input) {
  const { villain, locations, difficulty } = input

  const locationNames = locations.map((l) => l.name)

  const prompt = `
Você é o motor narrativo do jogo “Operação Monaco”, inspirado em Carmen Sandiego.
Gere uma missão investigativa em JSON, SEM EXPLICAÇÕES de texto fora do JSON.

### DADOS DO VILÃO CULPADO
Nome: ${villain.name}
Sexo: ${villain.sex}
Ocupação: ${villain.occupation}
Hobby: ${villain.hobby}
Cabelo: ${villain.hair_color}
Veículo: ${villain.vehicle}
Característica marcante: ${villain.feature}
Outros: ${villain.other}

### LOCAIS DISPONÍVEIS
${locationNames.join(", ")}

### DIFICULDADE
${difficulty}

### ESTRUTURA OBRIGATÓRIA DO JSON

{
  "title": "Título envolvente da investigação (string)",
  "summary": "Resumo em 2–4 frases da situação e do objetivo do agente (string)",
  "steps": [
    {
      "order": 1,
      "location": "Um dos locais da lista",
      "type": "briefing | clue | transition",
      "description": "Descrição da cena e da pista (string, 2–4 frases)",
      "villain_clue_attribute": "nome do atributo do vilão que essa pista sugere (ex: 'hair_color', 'vehicle', 'hobby') OU null"
    }
  ],
  "clues_about_villain": [
    "Frase curta que descreve uma pista sobre o vilão",
    "Outra frase curta com pista sobre o vilão"
  ]
}

Regras importantes:
- Gere entre 3 e 6 steps.
- Use apenas locais da lista de locais fornecida.
- Em pelo menos 3 steps, preencha "villain_clue_attribute" com um atributo coerente do vilão (ex: 'hair_color', 'vehicle', 'hobby', 'sex', 'occupation').
- NÃO revele explicitamente que ele é o culpado.
- NÃO escreva nada fora do JSON. Retorne APENAS o JSON puro.
`

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Você gera narrativas investigativas estruturadas em JSON válido.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    })

    const content = response.choices[0].message.content

    try {
      const parsed = JSON.parse(content)
      return parsed
    } catch (err) {
      console.error("Erro ao parsear JSON retornado pela IA:", err)
      console.error("Conteúdo bruto:", content)
      throw new Error("A IA retornou um JSON inválido.")
    }
  } catch (err) {
    console.error("Erro em generateCarmenCaseStructure:", err)
    throw err
  }
}
