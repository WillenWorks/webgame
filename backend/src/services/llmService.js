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
 * @param {Array}  input.locations - lista de locais do banco (ou subset)
 * @param {String} input.difficulty - easy/medium/hard
 * @param {String} [input.agentRank] - rank interno do agente (ex: trainee, field_agent, senior_agent, elite)
 * @param {Number} [input.agentReputation] - reputação atual do agente (0–100, default 50)
 */

function extractJsonFromText(text) {
  if (typeof text !== "string") {
    return text
  }

  let cleaned = text.trim()

  // Se vier em bloco de código ```json ... ```
  if (cleaned.startsWith("```")) {
    // corta a primeira linha (```json ou ```)
    const firstNewline = cleaned.indexOf("\n")
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1)
    }
    // remove o ``` final, se existir
    const lastFence = cleaned.lastIndexOf("```")
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence)
    }
  }

  // Garante que pegamos só o trecho entre o primeiro '{' e o último '}'
  const firstBrace = cleaned.indexOf("{")
  const lastBrace = cleaned.lastIndexOf("}")

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  return cleaned.trim()
}

export async function generateCarmenCaseStructure(input) {
  const {
    villain,
    locations,
    difficulty,
    agentRank = "field_agent",
    agentReputation = 50,
  } = input

  const locationNames = locations.map((l) => l.name)

  const prompt = `
Você é o motor narrativo do jogo “Operação Monaco”, inspirado em Carmen Sandiego.
Seu objetivo é gerar uma missão investigativa em JSON, SEM QUALQUER TEXTO FORA DO JSON.

O jogo é baseado em:
- viagens entre países,
- pistas de localidade (para descobrir o próximo país),
- pistas de suspeito (para afunilar quem é o culpado),
- NPCs com arquétipos, personalidade e falas que reagem à reputação do agente.

Alguns vilões são "ícones" recorrentes e podem aparecer em vários casos, outros são vilões gerados apenas para uma missão específica. Em todos os casos, as pistas devem ser coerentes com os atributos fornecidos.

### DADOS DO VILÃO CULPADO
Nome: ${villain.name}
Sexo: ${villain.sex}
Ocupação: ${villain.occupation}
Hobby: ${villain.hobby}
Cabelo: ${villain.hair_color}
Veículo: ${villain.vehicle}
Característica marcante: ${villain.feature}
Outros: ${villain.other}

### CONTEXTO DO AGENTE
Rank atual (posição na ACME): ${agentRank}
- trainee / field_agent: pistas mais diretas, didáticas, estilo jogo clássico.
- senior_agent / elite: pistas mais elaboradas, ambíguas, exigem dedução.

Reputação atual (0–100): ${agentReputation}
- ≥ 65: NPCs costumam respeitar e até temer o agente, mencionando nome/codename, fama e eficiência.
- entre 35 e 64: comportamento neutro, padrão Carmen Sandiego clássico.
- < 35: NPCs reconhecem o agente como alguém problemático ou ineficiente, podem debochar, hesitar em ajudar ou dar pistas mais frias.

### DIFICULDADE DA MISSÃO
Dificuldade atual: ${difficulty}

Use SEMPRE estas regras para a quantidade de países em "country_options" de cada step:

- Se a dificuldade for "easy":
  - Gere entre 2 e 3 países em "country_options".
  - Isso significa: 1 país correto + de 1 a 2 países falsos.

- Se a dificuldade for "medium":
  - Gere entre 2 e 5 países em "country_options".
  - 1 país correto + até 4 países falsos.

- Se a dificuldade for "hard":
  - Gere entre 2 e 6 países em "country_options".
  - 1 país correto + até 5 países falsos.

Em TODOS os casos:
- Deve existir **EXATAMENTE 1** país correto em "country_options".
- Todos os demais países em "country_options" DEVEM ser falsos (rota errada), mas ainda assim plausíveis e coerentes com as pistas.

### LOCAIS DISPONÍVEIS NO BANCO (PODEM SER CIDADES, PONTOS TURÍSTICOS, REGIÕES)
${locationNames.join(", ")}

Use esses nomes em "location" sempre que precisar vincular um step a um local específico.

---

### SOBRE O FLUXO DA INVESTIGAÇÃO

- O **step 0** SEMPRE representa o país/cidade onde o crime aconteceu (país inicial).  
- A partir desse país inicial, o agente visita **3 locais diferentes** (por step) e recebe:
  - 2 pistas de localidade (**country_clue**) que apontam para o **PRÓXIMO país** da rota;
  - 1 pista de suspeito (**suspect_clue**) ligada a um atributo do vilão.
- Em steps intermediários (não finais), as pistas de país **NUNCA** devem descrever apenas o país atual:  
  devem SEMPRE apontar, sugerir ou insinuar o **PRÓXIMO destino** (moeda, idioma, bandeira, geografia, cultura, história, etc.).
- No **último step**, as pistas de país podem reforçar que o agente já está no país correto para o confronto final.

---

### ARQUÉTIPOS DE NPCs (para usar em cada etapa)
Use e combine, mas mantenha coerência:

- "Guia local": conhece bem a cidade e seus pontos turísticos.
- "Comerciante de rua": observa muita gente, mas é interessado em dinheiro.
- "Funcionário de museu / biblioteca": sabe de história, arte e fatos culturais.
- "Agente de fronteira / imigração": cuida de entradas e saídas do país.
- "Informante underground": contato do submundo, pode proteger o vilão.
- "Dono de café/bar": ouve conversas, boatos e fofocas.
- "Funcionário de casa de câmbio / banco": lida com moedas e transações.
- "Artista de rua": presença em praças, murais e manifestações culturais.

Cada NPC deve ter:
- archetype: um dos acima (ou variação coerente),
- allegiance: "agent" (pró-agente), "neutral" ou "villain" (favorece o vilão),
- attitude: "friendly", "neutral" ou "hostile",
- falas diferentes para reputação alta / neutra / baixa.

---

### ESTRUTURA OBRIGATÓRIA DO JSON

Retorne APENAS um JSON com este formato (sem comentários e sem texto fora do JSON):

{
  "title": "Título envolvente da investigação (string)",
  "summary": "Resumo em 2–4 frases da situação e do objetivo do agente (string)",
  "steps": [
    {
      "order": 1,
      "location": "Um dos locais da lista fornecida acima (nome exato)",
      "type": "briefing | clue | transition",

      "description": "Descrição narrativa da cena e da situação da etapa (2–4 frases)",

      "villain_clue_attribute": "nome de um atributo do vilão que esta etapa sugere ou reforça (ex: 'hair_color', 'vehicle', 'hobby', 'occupation', 'feature', 'sex') OU null se esta etapa não traz pista direta do vilão",

      "country_correct": "Nome do país ou região principal associado a esta etapa (ex: 'Japan', 'France', 'Brazil')",
      "country_options": [
        "Lista de países possíveis, incluindo SEMPRE o país correto, com pelo menos 1 ou 2 países que possam confundir (bandeira parecida, idioma similar, moeda parecida, etc.). A quantidade total nesta lista DEVE obedecer às regras de dificuldade definidas acima."
      ],

      "locations_in_country": [
        {
          "name": "Nome de um local dentro desse país (ex: 'Casa de Câmbio Nakamura', 'Museu de História Nacional', 'Estação Central')",
          "role": "country_clue | suspect_clue",
          "place_type": "tipo de local (ex: 'casa de câmbio', 'museu', 'porto', 'aeroporto', 'mercado', 'praça')",
          "clue_text": "Fala ou descrição curta que o agente percebe ao visitar este local. SEMPRE deve ser uma pista útil sobre o PRÓXIMO destino (país/cidade) ou, se for o último step, reforçar que ele já está no lugar correto. Nunca descreva apenas o país atual sem apontar o próximo passo.",
          "suspect_attribute": "se role = 'suspect_clue', um atributo coerente do vilão (ex: 'hair_color', 'vehicle', 'hobby', 'occupation', 'feature', 'sex'); se role = 'country_clue', use null"
        },
        {
          "name": "Segundo local...",
          "role": "country_clue | suspect_clue",
          "place_type": "tipo",
          "clue_text": "Texto da pista (sempre relacionada ao PRÓXIMO país/localidade ou ao vilão, nunca apenas um comentário genérico sobre o lugar atual).",
          "suspect_attribute": "atributo ou null conforme o role"
        },
        {
          "name": "Terceiro local...",
          "role": "country_clue | suspect_clue",
          "place_type": "tipo",
          "clue_text": "Texto da pista (sempre útil e orientada a próxima etapa ou ao vilão).",
          "suspect_attribute": "atributo ou null conforme o role"
        }
      ],

      "npcs": [
        {
          "archetype": "Um dos arquétipos definidos (ex: 'Guia local', 'Comerciante de rua')",
          "allegiance": "agent | neutral | villain",
          "attitude": "friendly | neutral | hostile",

          "dialogue_high_reputation": "Fala que esse NPC diria ao agente se a reputação >= 65. Deve reconhecer o agente, citar fama, respeito ou temor.",
          "dialogue_neutral_reputation": "Fala padrão, estilo Carmen Sandiego clássico, se a reputação estiver entre 35 e 64.",
          "dialogue_low_reputation": "Fala se reputação < 35, podendo ter deboche, falta de paciência ou ajuda relutante."
        }
      ]
    }
  ],

  "clues_about_villain": [
    "Frases curtas (1 por item) que descrevem pistas sobre o vilão de forma geral, coerentes com os atributos. Ex: 'Ele sempre carrega uma câmera analógica pendurada no pescoço.'",
    "Outra frase curta com pista sobre o vilão, sem revelar diretamente a culpa."
  ]
}

### REGRAS IMPORTANTES

- Gere entre 3 e 6 steps, cobrindo uma rota de investigação coerente até o confronto final.
- Use apenas nomes de locais que apareçam na lista de locais fornecida em "LOCAIS DISPONÍVEIS" para o campo "location".
- Em cada step:
  - Sempre defina um "country_correct" coerente com o conteúdo (moeda, língua, bandeira, geografia, cultura).
  - Para "country_options":
    - A quantidade total de países deve obedecer às regras de dificuldade:
      - easy: 2 a 3 países (1 correto + 1–2 falsos).
      - medium: 2 a 5 países (1 correto + até 4 falsos).
      - hard: 2 a 6 países (1 correto + até 5 falsos).
    - Deve haver EXATAMENTE 1 país correto, e todos os demais devem ser países falsos (rotas erradas, mas plausíveis).
- Em cada step:
  - Sempre crie EXATAMENTE 3 itens em "locations_in_country".
  - NUNCA use "role": "empty" dentro de "locations_in_country". Todas as três localidades do país correto DEVEM trazer pistas úteis.
  - Garanta o seguinte padrão:
    - EXATAMENTE 2 locais com "role": "country_clue", trazendo pistas sobre o país/lugar da PRÓXIMA etapa (ou reforçando que o agente já está no país correto no último step).
    - EXATAMENTE 1 local com "role": "suspect_clue", trazendo pista sobre um atributo do vilão (${villain.name}) coerente com os campos passados (cabelo, veículo, hobby, ocupação, característica marcante, sexo).
  - Para pistas de país (country_clue), use curiosidades, moeda, bandeira, idioma, monumentos, geografia, cultura, economia, história, etc.  
    **Nunca escreva apenas “A galeria é famosa...” sem conectar isso ao próximo destino de forma dedutível.**
  - Para pistas de suspeito (suspect_clue), use atributos coerentes com o vilão e com o tipo de crime, sem jamais dizer explicitamente que ele é o culpado.

- Rank do agente:
  - trainee / field_agent:
    - pistas de país mais claras e didáticas,
    - conexões geográficas e culturais mais óbvias,
    - falas de NPC menos enigmáticas.
  - senior_agent / elite:
    - pistas mais sofisticadas, ambíguas e exigindo interpretação,
    - comparações culturais, referências históricas ou detalhes mais sutis,
    - NPCs podem brincar com o fato de o agente “já saber como o jogo funciona”.

- Reputação:
  - Controle apenas o tom das falas em "npcs[].dialogue_*_reputation".
  - Não mude o conteúdo factual das pistas por reputação (o agente sempre tem chance justa de deduzir).
  - NPCs aliados ao vilão ("allegiance": "villain") podem tentar desviar a atenção com frases mais enganosas, mas nunca contradiga diretamente fatos essenciais que levem à solução.

- Vilões icônicos vs vilões genéricos:
  - Trate sempre ${villain.name} como alguém com personalidade marcante.
  - Se o nome soar como um "vilão icônico", você pode sugerir continuidade em pistas sutis (ex: fama anterior, estilo de crime típico), mas SEM mencionar outros casos diretamente.
  - Para vilões mais "genéricos", foque mais na situação atual do caso do que em um passado grandioso.

- NÃO revele explicitamente no texto que ${villain.name} é o culpado.
- NÃO escreva nada fora do JSON. Retorne APENAS o JSON puro, sem comentários.
`

  try {
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Você gera narrativas investigativas estruturadas em JSON válido. Nunca escreva nada fora do JSON.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    })

    const content = response.choices[0].message.content ?? ""

    try {
      const cleaned = extractJsonFromText(content)
      const parsed = JSON.parse(cleaned)
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
