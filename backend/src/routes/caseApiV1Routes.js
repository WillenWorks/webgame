// src/routes/caseApiV1Routes.js
import { Router } from "express";
import {
  createCaseForAgent,
  getAvailableCasesForAgent,
  startCaseForAgent,
  getCaseInvestigationStatus,
  advanceCaseStep,
} from "../services/caseGeneratorService.js";
import { getDbPool, testDbConnection } from "../database/database.js";
import { generateCarmenCaseStructure } from "../services/llmService.js";
import {
  applyCaseResult,
  getMaxTurnsForDifficulty,
  determineAgentPositionByXp,
} from "../services/gameMechanicsService.js";

const router = Router();
const pool = getDbPool();

// ------------------------------------------------------
// HEALTHCHECK DO BANCO (DEV)
// ------------------------------------------------------
router.get("/dev/db-health", async (req, res) => {
  try {
    await testDbConnection();
    res.json({ status: "ok", db: "connected" });
  } catch (err) {
    console.error("Erro em /api/v1/dev/db-health:", err);
    res.status(500).json({
      status: "error",
      db: "failed",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// PERFIL DO AGENTE
// ------------------------------------------------------
router.get("/agents/:id/profile", async (req, res) => {
  try {
    const agentId = Number(req.params.id || 1);

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    // agents não tem 'name'; ele vem de users
    const [[agentRow]] = await pool.query(
      `
      SELECT
        a.id,
        u.name AS user_name,
        a.codename,
        a.xp,
        a.reputation,
        a.position,
        a.solved_cases,
        a.failed_cases,
        a.created_at
      FROM agents a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
      `,
      [agentId]
    );

    if (!agentRow) {
      return res.status(404).json({
        status: "error",
        message: "Agente não encontrado.",
      });
    }

    const xp = agentRow.xp ?? 0;
    let position = agentRow.position;

    if (!position || !String(position).trim().length) {
      position = determineAgentPositionByXp(xp);
    }

    const solved = agentRow.solved_cases ?? 0;
    const failed = agentRow.failed_cases ?? 0;
    const totalCases = solved + failed;
    const failureRatio = totalCases > 0 ? failed / totalCases : 0;

    res.json({
      status: "ok",
      data: {
        id: agentRow.id,
        name: agentRow.user_name || null,
        codename: agentRow.codename || null,
        xp,
        reputation: agentRow.reputation ?? 50,
        position,
        solved_cases: solved,
        failed_cases: failed,
        total_cases: totalCases,
        failure_ratio: failureRatio,
        created_at: agentRow.created_at,
        // agents não tem updated_at no script atual – mantemos null
        updated_at: null,
      },
    });
  } catch (err) {
    console.error("Erro em GET /agents/:id/profile:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao carregar perfil do agente.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// DEV: GERAR CASO MANUALMENTE
// ------------------------------------------------------
router.post("/dev/generate-case", async (req, res) => {
  try {
    const agentId = Number(req.body.agentId || 1);
    const difficulty = req.body.difficulty || "easy";

    const caseId = await createCaseForAgent(agentId, difficulty);

    res.json({
      status: "ok",
      message: "Caso gerado com sucesso.",
      data: { caseId },
    });
  } catch (err) {
    console.error("Erro em /dev/generate-case:", err);
    res.status(500).json({
      status: "error",
      message: "Erro ao gerar caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// LISTAR CASOS DISPONÍVEIS PARA UM AGENTE
// ------------------------------------------------------
router.get("/cases/available", async (req, res) => {
  try {
    const agentId = Number(req.query.agentId || 1);

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    const cases = await getAvailableCasesForAgent(agentId);

    res.json({
      status: "ok",
      data: cases,
    });
  } catch (err) {
    console.error("Erro em GET /cases/available:", err);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar casos disponíveis.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// INICIAR (OU RETOMAR) UM CASO
// ------------------------------------------------------
router.post("/cases/:id/start", async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const agentId = Number(req.body.agentId || req.query.agentId || 1);

    if (!Number.isFinite(caseId) || caseId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "caseId inválido.",
      });
    }

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    await startCaseForAgent(caseId, agentId);

    res.json({
      status: "ok",
      message: "Caso iniciado/retomado com sucesso.",
      data: { caseId, agentId },
    });
  } catch (err) {
    console.error("Erro em POST /cases/:id/start:", err);
    res.status(500).json({
      status: "error",
      message: "Erro ao iniciar caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// STATUS DETALHADO DA INVESTIGAÇÃO
// ------------------------------------------------------
router.get("/cases/:id/status", async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const agentId = Number(req.query.agentId || 1);

    if (!Number.isFinite(caseId) || caseId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "caseId inválido.",
      });
    }

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    const status = await getCaseInvestigationStatus(caseId, agentId);

    res.json({
      status: "ok",
      data: status,
    });
  } catch (err) {
    console.error("Erro em GET /cases/:id/status:", err);
    res.status(500).json({
      status: "error",
      message: "Erro ao buscar status do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// AVANÇAR ETAPA DA INVESTIGAÇÃO
// ------------------------------------------------------
router.post("/cases/:id/step/next", async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const agentId = Number(req.body?.agentId || req.query.agentId || 1);

    if (!Number.isFinite(caseId) || caseId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "caseId inválido.",
      });
    }

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    const status = await advanceCaseStep(caseId, agentId);

    res.json({
      status: "ok",
      message: status.reachedEnd
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
      },
    });
  } catch (err) {
    console.error("Erro em POST /cases/:id/step/next:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Erro ao avançar step",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// EMITIR MANDADO DE PRISÃO
// ------------------------------------------------------
router.post("/cases/:caseId/warrant", async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const agentId = Number(req.body.agentId || req.query.agentId || 1);
    const suspectId = Number(req.body.suspectId);

    if (!Number.isFinite(caseId) || caseId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "caseId inválido.",
      });
    }

    if (!Number.isFinite(agentId) || agentId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "agentId inválido.",
      });
    }

    if (!Number.isFinite(suspectId) || suspectId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "suspectId inválido.",
      });
    }

    const [[suspectRow]] = await pool.query(
      `
  SELECT
    id,
    case_id,
    villain_template_id,
    is_guilty,
    name_snapshot
  FROM case_suspects
  WHERE id = ?
    AND case_id = ?
  `,
      [suspectId, caseId]
    );

    if (!suspectRow) {
      return res.status(404).json({
        status: "error",
        message: "Suspeito não encontrado para este caso.",
      });
    }

    const isGuilty = suspectRow.is_guilty === 1;

    if (!isGuilty) {
      await pool.query(
        `
        UPDATE case_progress
        SET wrong_warrants = wrong_warrants + 1
        WHERE case_id = ? AND agent_id = ?
        `,
        [caseId, agentId]
      );

      const scoring = await applyCaseResult({
        caseId,
        agentId,
        result: "failed_wrong_suspect",
      });

      return res.json({
        status: "ok",
        data: {
          correct: false,
          scoring,
        },
        message:
          "Mandado emitido para o suspeito errado. O verdadeiro culpado escapou.",
      });
    }

    const scoring = await applyCaseResult({
      caseId,
      agentId,
      result: "solved",
    });

    return res.json({
      status: "ok",
      data: {
        correct: true,
        scoring,
      },
      message:
        "Mandado de prisão bem-sucedido. Você prendeu o verdadeiro culpado.",
    });
  } catch (err) {
    console.error("Erro em POST /cases/:caseId/warrant:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao emitir mandado de prisão.",
      error: err.message,
    });
  }
});

export default router;
