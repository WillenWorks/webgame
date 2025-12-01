// src/routes/caseApiV1Routes.js
import { Router } from "express"
import {
  createCaseForAgent,
  getAvailableCasesForAgent,
  startCaseForAgent,
  getCaseInvestigationStatus,
  advanceCaseStep,
} from "../services/caseGeneratorService.js"
import { getDbPool, testDbConnection } from "../database/database.js"
import { generateCarmenCaseStructure } from "../services/llmService.js"
import {
  applyCaseResult,
  getMaxTurnsForDifficulty,
} from "../services/gameMechanicsService.js"

const router = Router()
const pool = getDbPool()

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
    const agentId = Number(req.body?.agentId || 1)
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
// INICIAR CASO (OU RETOMAR EM ANDAMENTO)
// ------------------------------------------------------
router.post("/cases/:id/start", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.body?.agentId || req.query.agentId || 1)

    const result = await startCaseForAgent(caseId, agentId)

    res.json({
      status: "ok",
      message: "Caso iniciado ou retomado em andamento",
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
// STEP ATUAL DO CASO
// ------------------------------------------------------
router.get("/cases/:id/step/current", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.query.agentId || 1)

    const status = await getCaseInvestigationStatus(caseId, agentId)

    res.json({
      status: "ok",
      data: {
        case: status.case,
        currentStep: status.currentStep,
        progress: status.progress,
        clues: status.clues,
        canIssueWarrant: status.canIssueWarrant,
      },
    })
  } catch (err) {
    console.error("Erro em GET /cases/:id/step/current:", err)
    res.status(500).json({
      status: "error",
      message: err.message || "Erro ao buscar step atual",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// AVANÇAR PARA O PRÓXIMO STEP
// ------------------------------------------------------
router.post("/cases/:id/step/next", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.body?.agentId || req.query.agentId || 1)

    const status = await advanceCaseStep(caseId, agentId)

    const difficulty = status.case?.difficulty || "easy"
    const maxTurns =
      status.case?.max_turns || getMaxTurnsForDifficulty(difficulty)
    const turnsUsed = status.progress?.turns_used ?? 0

    let caseEndedByTime = false
    let scoring = null

    if (
      Number.isFinite(maxTurns) &&
      turnsUsed >= maxTurns &&
      status.case?.status === "in_progress"
    ) {
      caseEndedByTime = true
      scoring = await applyCaseResult({
        caseId,
        agentId,
        result: "failed_time",
      })
    }

    res.json({
      status: "ok",
      message: caseEndedByTime
        ? "Você excedeu o número máximo de turnos permitidos. O caso foi encerrado por tempo."
        : status.reachedEnd
          ? "Você alcançou o último passo deste caso."
          : "Step avançado com sucesso.",
      data: {
        case: status.case,
        currentStep: status.currentStep,
        progress: status.progress,
        clues: status.clues,
        suspects: status.suspects,
        canIssueWarrant: status.canIssueWarrant,
        reachedEnd: status.reachedEnd,
        maxTurns,
        timeExceeded: caseEndedByTime,
        scoring,
      },
    })
  } catch (err) {
    console.error("Erro em POST /cases/:id/step/next:", err)
    res.status(500).json({
      status: "error",
      message: err.message || "Erro ao avançar step",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// STATUS COMPLETO DO CASO (DASHBOARD)
// ------------------------------------------------------
router.get("/cases/:id/status", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.query.agentId || 1)

    const status = await getCaseInvestigationStatus(caseId, agentId)

    res.json({
      status: "ok",
      data: status,
    })
  } catch (err) {
    console.error("Erro em GET /cases/:id/status:", err)
    res.status(500).json({
      status: "error",
      message: err.message || "Erro ao buscar status do caso",
      error: err.message,
    })
  }
})

// ------------------------------------------------------
// LISTAR PISTAS DO CASO (DOSSIÊ) - RESPEITANDO PROGRESSO
// ------------------------------------------------------
router.get("/cases/:id/clues", async (req, res) => {
  try {
    const caseId = Number(req.params.id)
    const agentId = Number(req.query.agentId || 1)

    const status = await getCaseInvestigationStatus(caseId, agentId)

    res.json({
      status: "ok",
      data: {
        caseId,
        progress: status.progress,
        clues: status.clues,
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
// POST /api/v1/cases/:caseId/warrant
router.post("/cases/:caseId/warrant", async (req, res) => {
  const caseId = Number(req.params.caseId)
  const { agentId, suspectId, selectedAttributes } = req.body || {}

  if (!caseId || !agentId || !suspectId) {
    return res.status(400).json({
      status: "error",
      message:
        "É necessário informar caseId (params), agentId e suspectId (body).",
    })
  }

  try {
    // 1) Garantir que o case existe e está em progresso
    const [[caseRow]] = await pool.query(
      `
      SELECT id, agent_id, status, difficulty, max_turns
      FROM cases
      WHERE id = ?
      `,
      [caseId],
    )

    if (!caseRow) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado.",
      })
    }

    if (caseRow.status !== "in_progress") {
      return res.status(400).json({
        status: "error",
        message: "Caso não está em andamento.",
      })
    }

    if (caseRow.agent_id !== agentId) {
      // se você quiser permitir que outro agente veja, adapte isso
      return res.status(403).json({
        status: "error",
        message: "Este caso não pertence a este agente.",
      })
    }

    // 2) Verificar se o suspeito faz parte deste caso
    const [[suspectRow]] = await pool.query(
      `
      SELECT id, case_id, villain_template_id, is_guilty,
             name_snapshot
      FROM case_suspects
      WHERE id = ? AND case_id = ?
      `,
      [suspectId, caseId],
    )

    if (!suspectRow) {
      return res.status(400).json({
        status: "error",
        message: "Suspeito não pertence a este caso.",
        error: "Suspeito não pertence a este caso.",
      })
    }

    const isCorrect = suspectRow.is_guilty === 1

    // 3) Registrar o mandado em `warrants`
    await pool.query(
      `
      INSERT INTO warrants
        (case_id, agent_id, suspect_id, selected_attributes, is_correct)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        caseId,
        agentId,
        suspectId,
        selectedAttributes ? JSON.stringify(selectedAttributes) : null,
        isCorrect ? 1 : 0,
      ],
    )

    if (!isCorrect) {
      // 4a) Mandado errado: incrementa wrong_warrants no case_progress
      await pool.query(
        `
        UPDATE case_progress
        SET wrong_warrants = wrong_warrants + 1
        WHERE case_id = ? AND agent_id = ?
        `,
        [caseId, agentId],
      )

      // Aqui a gente pode, futuramente, decidir encerrar o caso
      // por "failed_wrong_suspect" se exceder X tentativas.
      // Por enquanto, só retorna erro.
      return res.status(200).json({
        status: "error",
        result: "wrong_suspect",
        message:
          "Mandado emitido para o suspeito errado. O caso ainda permanece em aberto, mas sua reputação foi afetada.",
      })
    }

    // 4b) Mandado correto: aplicar resultado "solved" com score/XP/promoção
    const scoring = await applyCaseResult({
      caseId,
      agentId,
      result: "solved",
    })

    // Registra também o vilão capturado (para galeria)
    await pool.query(
      `
      INSERT INTO captured_villains
        (agent_id, case_id, villain_template_id)
      VALUES (?, ?, ?)
      `,
      [agentId, caseId, suspectRow.villain_template_id],
    )

    return res.json({
      status: "ok",
      result: "correct_arrest",
      caseStatus: "solved",
      selectedSuspect: {
        id: suspectRow.id,
        name: suspectRow.name_snapshot,
        villain_template_id: suspectRow.villain_template_id,
      },
      scoring, // { score, reputationDelta, newXp, newReputation, newPosition, result }
      message:
        "Mandado de prisão bem-sucedido. Você prendeu o verdadeiro culpado.",
    })
  } catch (err) {
    console.error("Erro em POST /cases/:caseId/warrant:", err)
    return res.status(500).json({
      status: "error",
      message: "Erro ao emitir mandado de prisão.",
      error: err.message,
    })
  }
})

export default router
