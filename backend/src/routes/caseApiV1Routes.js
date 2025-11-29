// src/routes/caseApiV1Routes.js
import { Router } from "express"
import {
  createCaseForAgent,
  getAvailableCasesForAgent,
  startCaseForAgent,
} from "../services/caseGeneratorService.js"
import { testDbConnection } from "../database/database.js"
import { generateCarmenCaseStructure } from "../services/llmService.js"
import { getDbPool } from "../database/database.js"

const router = Router()

// ------------------------------------------------------
// HEALTHCHECK DO BANCO (DEV)
// ------------------------------------------------------
router.get("/dev/db-health", async (req, res) => {
  try {
    await testDbConnection()
    res.json({ status: "ok", db: "connected" })
  } catch (err) {
    console.error("Erro em /api/v1/dev/db-health:", err)
    res.status(500).json({
      status: "error",
      db: "failed",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// GERAR CASO (DEV) — createCaseForAgent
// ------------------------------------------------------
router.post("/dev/generate-case", async (req, res) => {
  try {
    const agentId = Number(req.body.agentId || 1)
    const difficulty = req.body?.difficulty || "easy"

    const result = await createCaseForAgent(agentId, difficulty)

    res.status(201).json({
      status: "ok",
      message: "Caso criado com sucesso",
      data: result,
    })
  } catch (err) {
    console.error("Erro em /api/v1/dev/generate-case:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao gerar caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// LISTAR CASOS DISPONÍVEIS / EM ANDAMENTO
// ------------------------------------------------------
router.get("/cases/available", async (req, res) => {
  try {
    const agentId = Number(req.query.agentId || 1)

    let cases = await getAvailableCasesForAgent(agentId)

    // Se não existir nenhum caso, gera 3 novos automaticamente
    if (!cases || cases.length === 0) {
      for (let i = 0; i < 3; i++) {
        await createCaseForAgent(agentId, "easy")
      }
      cases = await getAvailableCasesForAgent(agentId)
    }

    res.json({
      status: "ok",
      data: cases,
    })
  } catch (err) {
    console.error("Erro em GET /cases/available:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar casos disponíveis",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// INICIAR CASO (muda status para in_progress + retorna 1º step)
// ------------------------------------------------------
router.post("/cases/:id/start", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.body.agentId || req.query.agentId || 1)

    const result = await startCaseForAgent(caseId, agentId)

    res.json({
      status: "ok",
      message: "Caso iniciado ou já estava em andamento",
      data: result,
    })
  } catch (err) {
    console.error("Erro em POST /cases/:id/start:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao iniciar caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// (A SER IMPLEMENTADO NAN TASK FUTURA)
// O FRONT AINDA NÃO USA, MAS JA DEIXAMOS OS ENDPOINTS
// ------------------------------------------------------
router.post("/cases/:id/step/:stepId", (req, res) => {
  res.json({
    status: "pending-implementation",
    caseId: req.params.id,
    stepId: req.params.stepId,
  })
})

router.post("/cases/:id/warrant", (req, res) => {
  res.json({
    status: "pending-implementation",
    caseId: req.params.id,
    payload: req.body || null,
  })
})

router.post("/dev/test-llm-case", async (req, res) => {
  try {
    const villain = req.body.villain
    const locations = req.body.locations
    const difficulty = req.body.difficulty || "easy"

    const result = await generateCarmenCaseStructure({
      villain,
      locations,
      difficulty,
    })

    res.json({
      status: "ok",
      data: result,
    })
  } catch (err) {
    res.status(500).json({
      status: "error",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// DEV: testar IA de geração de caso (ainda sem salvar no BD)
// ------------------------------------------------------
router.post("/dev/test-llm-case", async (req, res) => {
  try {
    const villain = req.body.villain
    const locations = req.body.locations
    const difficulty = req.body.difficulty || "easy"

    if (!villain || !locations || !Array.isArray(locations)) {
      return res.status(400).json({
        status: "error",
        message:
          "Envie 'villain' e 'locations' no body. Ex: { villain: {...}, locations: [{ name: 'London' }] }",
      })
    }

    const result = await generateCarmenCaseStructure({
      villain,
      locations,
      difficulty,
    })

    res.json({
      status: "ok",
      data: result,
    })
  } catch (err) {
    console.error("Erro em /api/v1/dev/test-llm-case:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao gerar narrativa com IA",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// DEV: debug completo de um caso
// ------------------------------------------------------
router.get("/dev/cases/:id/debug", async (req, res) => {
  const caseId = Number(req.params.id)
  const pool = getDbPool()

  try {
    // case
    const [caseRows] = await pool.query(
      "SELECT * FROM cases WHERE id = ?",
      [caseId],
    )

    if (!caseRows || caseRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado",
      })
    }

    const caseData = caseRows[0]

    // steps
    const [stepRows] = await pool.query(
      "SELECT * FROM case_steps WHERE case_id = ? ORDER BY step_order ASC",
      [caseId],
    )

    // suspects
    const [suspectRows] = await pool.query(
      "SELECT * FROM case_suspects WHERE case_id = ?",
      [caseId],
    )

    res.json({
      status: "ok",
      data: {
        case: caseData,
        steps: stepRows,
        suspects: suspectRows,
      },
    })
  } catch (err) {
    console.error("Erro em GET /api/v1/dev/cases/:id/debug:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar dados completos do caso",
      error: err.message,
    })
  }
})


export default router
