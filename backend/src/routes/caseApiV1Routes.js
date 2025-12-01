// src/routes/caseApiV1Routes.js
import { Router } from "express"
import {
  createCaseForAgent,
  getAvailableCasesForAgent,
  startCaseForAgent,
} from "../services/caseGeneratorService.js"
import { getDbPool, testDbConnection } from "../database/database.js"
import { generateCarmenCaseStructure } from "../services/llmService.js"

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
// DEV: GERAR CASO MANUALMENTE
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
// DEV: DEBUG COMPLETO DE UM CASO
// ------------------------------------------------------
router.get("/dev/cases/:id/debug", async (req, res) => {
  const caseId = Number(req.params.id)
  const pool = getDbPool()

  try {
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

    const [stepRows] = await pool.query(
      "SELECT * FROM case_steps WHERE case_id = ? ORDER BY step_order ASC",
      [caseId],
    )

    const [suspectRows] = await pool.query(
      "SELECT * FROM case_suspects WHERE case_id = ?",
      [caseId],
    )

    const [clueRows] = await pool.query(
      `SELECT cvc.*, cs.step_order
       FROM case_villain_clues cvc
       LEFT JOIN case_steps cs ON cs.id = cvc.step_id
       WHERE cvc.case_id = ?
       ORDER BY cs.step_order ASC, cvc.id ASC`,
      [caseId],
    )

    res.json({
      status: "ok",
      data: {
        case: caseData,
        steps: stepRows,
        suspects: suspectRows,
        clues: clueRows,
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

// ------------------------------------------------------
// DEV: TESTE DIRETO DA IA (SEM SALVAR)
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
// INICIAR CASO
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
      message: err.message || "Erro ao iniciar caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// LISTAR PISTAS DO CASO (DOSSIÊ)
// ------------------------------------------------------
router.get("/cases/:id/clues", async (req, res) => {
  const caseId = Number(req.params.id)
  const pool = getDbPool()

  try {
    const [caseRows] = await pool.query(
      "SELECT id, status FROM cases WHERE id = ?",
      [caseId],
    )

    if (!caseRows || caseRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado",
      })
    }

    const [clueRows] = await pool.query(
      `SELECT cvc.id,
              cvc.step_id,
              cs.step_order,
              cvc.attribute_name,
              cvc.attribute_value,
              cvc.created_at
       FROM case_villain_clues cvc
       LEFT JOIN case_steps cs ON cs.id = cvc.step_id
       WHERE cvc.case_id = ?
       ORDER BY cs.step_order ASC, cvc.id ASC`,
      [caseId],
    )

    res.json({
      status: "ok",
      data: {
        caseId,
        clues: clueRows,
      },
    })
  } catch (err) {
    console.error("Erro em GET /cases/:id/clues:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar pistas do caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// LISTAR SUSPEITOS DO CASO
// ------------------------------------------------------
router.get("/cases/:id/suspects", async (req, res) => {
  const caseId = Number(req.params.id)
  const pool = getDbPool()

  try {
    const [caseRows] = await pool.query(
      "SELECT id FROM cases WHERE id = ?",
      [caseId],
    )

    if (!caseRows || caseRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado",
      })
    }

    const [suspects] = await pool.query(
      `SELECT 
         id,
         villain_template_id,
         is_guilty,
         name_snapshot,
         sex_snapshot,
         occupation_snapshot,
         hobby_snapshot,
         hair_color_snapshot,
         vehicle_snapshot,
         feature_snapshot
       FROM case_suspects
       WHERE case_id = ?`,
      [caseId],
    )

    // não retornamos explicitamente quem é culpado, mas o front consegue comparar pistas
    res.json({
      status: "ok",
      data: {
        caseId,
        suspects,
      },
    })
  } catch (err) {
    console.error("Erro em GET /cases/:id/suspects:", err)
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar suspeitos do caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// MANDADO DE PRISÃO – CONCLUIR CASO
// ------------------------------------------------------
router.post("/cases/:id/warrant", async (req, res) => {
  const caseId = Number(req.params.id)
  const agentId = Number(req.body.agentId || req.query.agentId || 1)
  const suspectId = Number(req.body.suspectId)

  if (!suspectId) {
    return res.status(400).json({
      status: "error",
      message: "É necessário informar suspectId no body.",
    })
  }

  const pool = getDbPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    const [caseRows] = await conn.query(
      "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
      [caseId, agentId],
    )

    if (!caseRows || caseRows.length === 0) {
      throw new Error("Caso não encontrado para este agente.")
    }

    const caseData = caseRows[0]

    if (caseData.status === "solved" || caseData.status === "failed") {
      throw new Error("Caso já está encerrado.")
    }

    const [suspectRows] = await conn.query(
      "SELECT * FROM case_suspects WHERE id = ? AND case_id = ?",
      [suspectId, caseId],
    )

    if (!suspectRows || suspectRows.length === 0) {
      throw new Error("Suspeito não pertence a este caso.")
    }

    const suspect = suspectRows[0]
    const isGuilty = suspect.is_guilty === 1

    const newStatus = isGuilty ? "solved" : "failed"

    await conn.query(
      "UPDATE cases SET status = ?, closed_at = NOW() WHERE id = ?",
      [newStatus, caseId],
    )

    await conn.commit()

    res.json({
      status: "ok",
      result: isGuilty ? "correct_arrest" : "wrong_arrest",
      caseStatus: newStatus,
      selectedSuspect: {
        id: suspect.id,
        name: suspect.name_snapshot,
        villain_template_id: suspect.villain_template_id,
      },
      message: isGuilty
        ? "Mandado de prisão bem-sucedido. Você prendeu o verdadeiro culpado."
        : "Mandado de prisão incorreto. O verdadeiro culpado escapou.",
    })
  } catch (err) {
    await conn.rollback()
    console.error("Erro em POST /cases/:id/warrant:", err)
    res.status(500).json({
      status: "error",
      message: err.message || "Erro ao registrar mandado de prisão",
      error: err.message,
    })
  } finally {
    conn.release()
  }
})

export default router
