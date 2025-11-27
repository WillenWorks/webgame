// backend/server.js
import express from "express"
import cors from "cors"

const app = express()
const PORT = 3333

app.use(cors())
app.use(express.json())

// ------------------------------------------------------
// 1. DADOS DO MVP – CASO, CIDADES, PISTAS, SUSPEITO
// ------------------------------------------------------

// Caso piloto
const caseData = {
  caseId: "case_001",
  title: "O Roubo do Meridiano Zero",
  description:
    "O artefato histórico Relógio do Meridiano Zero foi roubado no Observatório de Greenwich. O suspeito deixou pistas culturais durante a fuga.",
  route: ["london", "paris", "rome", "cairo", "tokyo"],
}

// Cidades da rota
const cities = [
  {
    cityId: "london",
    name: "Londres",
    country: "Reino Unido",
    landmarks: ["Big Ben", "London Eye", "Rio Tâmisa"],
  },
  {
    cityId: "paris",
    name: "Paris",
    country: "França",
    landmarks: ["Torre Eiffel", "Louvre", "Rio Sena"],
  },
  {
    cityId: "rome",
    name: "Roma",
    country: "Itália",
    landmarks: ["Coliseu", "Fórum Romano", "Fontana di Trevi"],
  },
  {
    cityId: "cairo",
    name: "Cairo",
    country: "Egito",
    landmarks: ["Pirâmides de Gizé", "Rio Nilo", "Esfinge"],
  },
  {
    cityId: "tokyo",
    name: "Tóquio",
    country: "Japão",
    landmarks: ["Shibuya", "Tokyo Tower", "Palácio Imperial"],
  },
]

// Suspeito
const suspect = {
  suspectId: "suspect_carlos_monaco",
  name: 'Carlos "Monaco" Navarro',
  description:
    "Ladrão internacional de arte e relíquias. Sofisticado, provocador e sempre deixa pistas culturais.",
  traits: {
    height: "alto",
    hair: "castanho escuro",
    style: "terno elegante e relógio de bolso",
    languages: ["Inglês", "Francês", "Italiano"],
    signature: "Sempre deixa pistas relacionadas a tempo e fronteiras.",
  },
}

// Pistas por etapa da rota (cidade atual -> próxima cidade)
const legs = [
  {
    from: "london",
    to: "paris",
    clues: [
      "O suspeito comentou sobre uma torre de ferro próxima a um rio famoso.",
      "Ele foi visto com um guia de museu que abriga uma certa Mona Lisa.",
      "A próxima parada é conhecida como a 'Cidade Luz'.",
    ],
  },
  {
    from: "paris",
    to: "rome",
    clues: [
      "Testemunhas ouviram o suspeito falar sobre ruínas antigas e um anfiteatro colossal.",
      "Ele mencionou uma cidade ligada a um antigo império do sul da Europa.",
      "A próxima parada tem um famoso coliseu onde gladiadores lutavam.",
    ],
  },
  {
    from: "rome",
    to: "cairo",
    clues: [
      "O suspeito comprou óculos escuros e falou em 'deserto escaldante'.",
      "Foi visto folheando um livro sobre antigas civilizações às margens de um grande rio.",
      "Parece obcecado com pirâmides e esfinges.",
    ],
  },
  {
    from: "cairo",
    to: "tokyo",
    clues: [
      "Ele comentou sobre viajar para o outro lado do mundo, em uma ilha no Pacífico.",
      "Falou de uma cidade iluminada por néons e cruzamentos lotados.",
      "A próxima parada é um centro tecnológico e cultural do Japão.",
    ],
  },
]

// ------------------------------------------------------
// 2. ENDPOINTS BÁSICOS (JÁ EXISTENTES)
// ------------------------------------------------------

// Teste simples do backend
app.get("/ping", (req, res) => {
  res.json({ message: "pong - backend Operação Monaco ativo" })
})

// Dados brutos do caso
app.get("/api/case", (req, res) => {
  res.json(caseData)
})

app.get("/api/cities", (req, res) => {
  res.json(cities)
})

app.get("/api/suspect", (req, res) => {
  res.json(suspect)
})

// ------------------------------------------------------
// 3. FUNÇÕES DE APOIO
// ------------------------------------------------------

function getCityById(id) {
  return cities.find((c) => c.cityId === id)
}

function getLegByStep(step) {
  return legs[step] || null
}

function getLegByFromCity(cityId) {
  return legs.find((l) => l.from === cityId) || null
}

function getRandomOtherCities(excludeIds, count) {
  const pool = cities.filter((c) => !excludeIds.includes(c.cityId))
  const result = []
  const copy = [...pool]

  while (copy.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * copy.length)
    result.push(copy.splice(index, 1)[0])
  }

  return result
}

// ------------------------------------------------------
// 4. ENDPOINTS DE GAMEPLAY (MVP 0.2)
// ------------------------------------------------------

/**
 * GET /api/game/start
 * Inicia o caso: retorna cidade inicial, primeira pista e meta de etapas.
 */
app.get("/api/game/start", (req, res) => {
  const firstCityId = caseData.route[0]
  const currentCity = getCityById(firstCityId)

  const firstLeg = getLegByStep(0)

  res.json({
    case: caseData,
    step: 0,
    totalSteps: caseData.route.length - 1,
    currentCity,
    firstClue: firstLeg ? firstLeg.clues[0] : null,
    clueIndex: 0,
  })
})

/**
 * GET /api/game/investigate
 * query: step, clueIndex
 * Retorna a próxima pista da etapa atual.
 */
app.get("/api/game/investigate", (req, res) => {
  const step = parseInt(req.query.step ?? "0", 10)
  const clueIndex = parseInt(req.query.clueIndex ?? "0", 10)

  const leg = getLegByStep(step)
  if (!leg) {
    return res.status(400).json({ error: "Etapa inválida" })
  }

  const nextIndex = clueIndex + 1
  if (nextIndex >= leg.clues.length) {
    return res.json({
      hasMore: false,
      clueIndex,
      clue: leg.clues[leg.clues.length - 1],
    })
  }

  res.json({
    hasMore: nextIndex < leg.clues.length - 1,
    clueIndex: nextIndex,
    clue: leg.clues[nextIndex],
  })
})

/**
 * GET /api/game/connections
 * query: step
 * Retorna cidades candidatas para a próxima viagem (1 correta + 2 erradas).
 */
app.get("/api/game/connections", (req, res) => {
  const step = parseInt(req.query.step ?? "0", 10)
  const leg = getLegByStep(step)

  if (!leg) {
    return res.status(400).json({ error: "Etapa inválida" })
  }

  const currentCityId = leg.from
  const correctCity = getCityById(leg.to)

  if (!correctCity) {
    return res.status(500).json({ error: "Cidade de destino não encontrada" })
  }

  const others = getRandomOtherCities(
    [currentCityId, correctCity.cityId],
    2
  )

  const options = [correctCity, ...others].map((city) => ({
    cityId: city.cityId,
    name: city.name,
    country: city.country,
  }))

  // Embaralhar as opções
  options.sort(() => Math.random() - 0.5)

  res.json({
    step,
    options,
  })
})

/**
 * POST /api/game/travel
 * body: { step, chosenCityId }
 * Verifica se a escolha foi correta e, se sim, avança etapa.
 */
app.post("/api/game/travel", (req, res) => {
  const { step, chosenCityId } = req.body

  const numericStep = parseInt(step ?? "0", 10)
  const leg = getLegByStep(numericStep)

  if (!leg) {
    return res.status(400).json({ error: "Etapa inválida" })
  }

  const expectedCityId = leg.to

  if (chosenCityId !== expectedCityId) {
    return res.json({
      correct: false,
      message:
        "Você seguiu uma pista errada. O suspeito não foi visto nessa cidade.",
    })
  }

  const nextStep = numericStep + 1
  const isLast = nextStep >= caseData.route.length - 1
  const nextCityId = leg.to
  const nextCity = getCityById(nextCityId)

  res.json({
    correct: true,
    message: isLast
      ? "Você chegou à cidade final. Prepare-se para o confronto."
      : "Boa dedução. O suspeito passou por aqui e já seguiu viagem.",
    nextStep,
    isLast,
    nextCity,
  })
})

// ------------------------------------------------------
// 5. START SERVER
// ------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Backend Operação Monaco rodando em http://localhost:${PORT}`)
})
