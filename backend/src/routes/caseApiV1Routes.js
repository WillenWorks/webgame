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

/**
 * Garante que o caso tenha max_turns definido.
 * Usa:
 *  - dificuldade do caso
 *  - quantidade de steps
 *  - rank do agente (via XP)
 *
 * Pode receber tanto pool quanto connection, pois ambos têm .query.
 */
async function ensureCaseMaxTurns(db, caseRow, agentId) {
  let maxTurns = Number(caseRow.max_turns || 0);
  if (maxTurns > 0) {
    return maxTurns;
  }

  // busca XP do agente para calcular rank
  const [[agentRow]] = await db.query(
    `
    SELECT xp
    FROM agents
    WHERE id = ?
    `,
    [agentId]
  );

  const xp = agentRow?.xp ?? 0;
  const rank = determineAgentPositionByXp(xp);

  // conta steps do caso
  const [[stepsRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM case_steps
    WHERE case_id = ?
    `,
    [caseRow.id]
  );

  const stepsCount = stepsRow?.total || 0;

  let computedMax = 0;

  if (typeof getMaxTurnsForDifficulty === "function") {
    // assinatura esperada: (difficulty, stepsCount, rank)
    computedMax = getMaxTurnsForDifficulty(
      caseRow.difficulty || "easy",
      stepsCount,
      rank
    );
  } else {
    // fallback simples se por algum motivo a função não existir
    computedMax = stepsCount > 0 ? stepsCount * 3 : 10;
  }

  if (!computedMax || computedMax <= 0) {
    // fallback de segurança
    computedMax = stepsCount > 0 ? stepsCount * 3 : 10;
  }

  await db.query(
    `
    UPDATE cases
    SET max_turns = ?
    WHERE id = ?
    `,
    [computedMax, caseRow.id]
  );

  caseRow.max_turns = computedMax;
  return computedMax;
}

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

    // Checa timeout antes de avançar step
    const [[caseRow]] = await pool.query(
      `
      SELECT id, agent_id, difficulty, max_turns, status
      FROM cases
      WHERE id = ?
      `,
      [caseId]
    );

    if (!caseRow) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado.",
      });
    }

    if (caseRow.agent_id !== agentId) {
      return res.status(403).json({
        status: "error",
        message: "Este caso não pertence a este agente.",
      });
    }

    const [[progressRow]] = await pool.query(
      `
      SELECT id, turns_used
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      `,
      [caseId, agentId]
    );

    if (!progressRow) {
      return res.status(400).json({
        status: "error",
        message:
          "Progresso do caso não encontrado. Inicie o caso antes de avançar o step.",
      });
    }

    const maxTurns = await ensureCaseMaxTurns(pool, caseRow, agentId);
    const turnsUsed = progressRow.turns_used || 0;

    if (maxTurns && turnsUsed >= maxTurns) {
      const scoring = await applyCaseResult({
        caseId,
        agentId,
        result: "failed_timeout",
      });

      return res.status(400).json({
        status: "error",
        message:
          "Tempo esgotado para resolver este caso. O culpado escapou antes de você avançar na investigação.",
        data: {
          reason: "timeout",
          scoring,
        },
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

    // Checa timeout antes de emitir mandado
    const [[caseRow]] = await pool.query(
      `
      SELECT id, agent_id, difficulty, max_turns
      FROM cases
      WHERE id = ?
      `,
      [caseId]
    );

    if (!caseRow) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado.",
      });
    }

    if (caseRow.agent_id !== agentId) {
      return res.status(403).json({
        status: "error",
        message: "Este caso não pertence a este agente.",
      });
    }

    const [[progressRow]] = await pool.query(
      `
      SELECT id, turns_used
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      `,
      [caseId, agentId]
    );

    if (!progressRow) {
      return res.status(400).json({
        status: "error",
        message:
          "Progresso do caso não encontrado. Inicie o caso antes de emitir mandado.",
      });
    }

    const maxTurns = await ensureCaseMaxTurns(pool, caseRow, agentId);
    const turnsUsed = progressRow.turns_used || 0;

    if (maxTurns && turnsUsed >= maxTurns) {
      const scoring = await applyCaseResult({
        caseId,
        agentId,
        result: "failed_timeout",
      });

      return res.status(400).json({
        status: "error",
        message:
          "Tempo esgotado. Você demorou demais para emitir o mandado e o culpado escapou.",
        data: {
          reason: "timeout",
          scoring,
        },
      });
    }

    // --- Regra: só pode emitir mandado se houver evidência suficiente ---
    const status = await getCaseInvestigationStatus(caseId, agentId);

    if (!status?.canIssueWarrant) {
      return res.status(400).json({
        status: "error",
        message:
          "Ainda não há informações suficientes para emitir um mandado de prisão. Continue investigando e coletando mais pistas.",
        data: {
          reason: "not_enough_evidence",
          progress: status?.progress || null,
          cluesCount:
            status?.progress?.cluesCount ??
            (Array.isArray(status?.clues) ? status.clues.length : 0),
        },
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

// ------------------------------------------------------
// DEV: DEBUG COMPLETO DO CASO (narrativa, steps, pistas, npcs)
// GET /api/v1/dev/cases/:id/debug?agentId=1
// ------------------------------------------------------
router.get("/dev/cases/:id/debug", async (req, res) => {
  try {
    const caseId = Number(req.params.id);
    const agentId = Number(req.query.agentId || 1);

    if (!Number.isFinite(caseId) || caseId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "caseId inválido.",
      });
    }

    const pool = getDbPool();

    const [[caseRow]] = await pool.query(
      `
      SELECT *
      FROM cases
      WHERE id = ?
      `,
      [caseId]
    );

    if (!caseRow) {
      return res.status(404).json({
        status: "error",
        message: "Caso não encontrado.",
      });
    }

    const [steps] = await pool.query(
      `
      SELECT
        cs.*,
        l.name   AS location_name,
        l.country AS location_country,
        l.region  AS location_region
      FROM case_steps cs
      LEFT JOIN locations l ON l.id = cs.to_location_id
      WHERE cs.case_id = ?
      ORDER BY cs.step_order ASC
      `,
      [caseId]
    );

    const [travelOptions] = await pool.query(
      `
      SELECT *
      FROM case_travel_options
      WHERE case_id = ?
      ORDER BY step_order ASC, is_correct_country DESC, country_name ASC
      `,
      [caseId]
    );

    const [stepLocations] = await pool.query(
      `
      SELECT *
      FROM case_step_locations
      WHERE case_id = ?
      ORDER BY step_order ASC, id ASC
      `,
      [caseId]
    );

    const [npcs] = await pool.query(
      `
      SELECT *
      FROM case_step_npcs
      WHERE case_id = ?
      ORDER BY step_order ASC, id ASC
      `,
      [caseId]
    );

    const [clues] = await pool.query(
      `
      SELECT
        cvc.*,
        cs.step_order
      FROM case_villain_clues cvc
      LEFT JOIN case_steps cs ON cs.id = cvc.step_id
      WHERE cvc.case_id = ?
      ORDER BY cs.step_order ASC, cvc.id ASC
      `,
      [caseId]
    );

    const [suspects] = await pool.query(
      `
      SELECT *
      FROM case_suspects
      WHERE case_id = ?
      ORDER BY id ASC
      `,
      [caseId]
    );

    const [progressRows] = await pool.query(
      `
      SELECT *
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      `,
      [caseId, agentId]
    );

    return res.json({
      status: "ok",
      data: {
        case: caseRow,
        steps,
        travelOptions,
        stepLocations,
        npcs,
        clues,
        suspects,
        progress: progressRows[0] || null,
      },
    });
  } catch (err) {
    console.error("Erro em GET /dev/cases/:id/debug:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao carregar debug do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// PISTAS ATUAIS PARA O CASO (visão de jogo)
// GET /api/v1/cases/:id/clues?agentId=1
// ------------------------------------------------------
router.get("/cases/:id/clues", async (req, res) => {
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

    return res.json({
      status: "ok",
      data: {
        case: status.case,
        progress: status.progress,
        clues: status.clues,
        suspects: status.suspects,
        canIssueWarrant: status.canIssueWarrant,
      },
    });
  } catch (err) {
    console.error("Erro em GET /cases/:id/clues:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao carregar pistas do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// SUSPEITOS ATUAIS DO CASO (com matchScore)
// GET /api/v1/cases/:id/suspects?agentId=1
// ------------------------------------------------------
router.get("/cases/:id/suspects", async (req, res) => {
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

    // reutiliza toda a lógica de status pra já trazer matchScore, matchedAttributes etc.
    const status = await getCaseInvestigationStatus(caseId, agentId);

    return res.json({
      status: "ok",
      data: {
        case: status.case,
        progress: status.progress,
        suspects: status.suspects,
      },
    });
  } catch (err) {
    console.error("Erro em GET /cases/:id/suspects:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao carregar suspeitos do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// STEP ATUAL (visão completa: progresso + travel + npcs)
// GET /api/v1/cases/:caseId/step/current?agentId=1
// ------------------------------------------------------
router.get("/cases/:caseId/step/current", async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
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
    const pool = getDbPool();

    const currentStepOrder = status.progress.current || 1;

    // opções de viagem (países) pro step atual
    const [travelOptions] = await pool.query(
      `
      SELECT
        id,
        case_id,
        step_order,
        country_name,
        is_correct_country
      FROM case_travel_options
      WHERE case_id = ?
        AND step_order = ?
      ORDER BY is_correct_country DESC, country_name ASC
      `,
      [caseId, currentStepOrder]
    );

    // locais dentro do país correto (gerados pela IA)
    const [stepLocations] = await pool.query(
      `
      SELECT
        id,
        case_id,
        step_order,
        country_name,
        place_name,
        place_type,
        role,
        clue_text,
        suspect_attribute
      FROM case_step_locations
      WHERE case_id = ?
        AND step_order = ?
      ORDER BY id ASC
      `,
      [caseId, currentStepOrder]
    );

    // npcs do step atual
    const [npcs] = await pool.query(
      `
      SELECT
        id,
        case_id,
        step_order,
        archetype,
        allegiance,
        attitude,
        dialogue_high_reputation,
        dialogue_neutral_reputation,
        dialogue_low_reputation
      FROM case_step_npcs
      WHERE case_id = ?
        AND step_order = ?
      ORDER BY id ASC
      `,
      [caseId, currentStepOrder]
    );

    return res.json({
      status: "ok",
      data: {
        case: status.case,
        currentStep: status.currentStep,
        progress: status.progress,
        clues: status.clues,
        suspects: status.suspects,
        canIssueWarrant: status.canIssueWarrant,
        travelOptions,
        locationsInCountry: stepLocations,
        npcs,
      },
    });
  } catch (err) {
    console.error("Erro em GET /cases/:caseId/step/current:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao carregar step atual do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// OPÇÕES DE VIAGEM (países) PARA UM STEP ESPECÍFICO
// GET /api/v1/cases/:caseId/steps/:stepOrder/travel-options
// ------------------------------------------------------
router.get(
  "/cases/:caseId/steps/:stepOrder/travel-options",
  async (req, res) => {
    try {
      const caseId = Number(req.params.caseId);
      const stepOrder = Number(req.params.stepOrder);

      if (!Number.isFinite(caseId) || caseId <= 0) {
        return res.status(400).json({
          status: "error",
          message: "caseId inválido.",
        });
      }

      if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
        return res.status(400).json({
          status: "error",
          message: "stepOrder inválido.",
        });
      }

      const pool = getDbPool();

      const [rows] = await pool.query(
        `
        SELECT
          id,
          case_id,
          step_order,
          country_name,
          is_correct_country
        FROM case_travel_options
        WHERE case_id = ?
          AND step_order = ?
        ORDER BY is_correct_country DESC, country_name ASC
        `,
        [caseId, stepOrder]
      );

      return res.json({
        status: "ok",
        data: rows,
      });
    } catch (err) {
      console.error(
        "Erro em GET /cases/:caseId/steps/:stepOrder/travel-options:",
        err
      );
      return res.status(500).json({
        status: "error",
        message: "Erro ao carregar opções de viagem do step.",
        error: err.message,
      });
    }
  }
);

// ------------------------------------------------------
// ESCOLHER UM PAÍS PARA VIAJAR NUM STEP
// POST /api/v1/cases/:caseId/travel
// body: { agentId, stepOrder, country }
// ------------------------------------------------------
router.post("/cases/:caseId/travel", async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const agentId = Number(req.body.agentId || req.query.agentId || 1);
    const stepOrder = Number(req.body.stepOrder);
    const country = String(req.body.country || "").trim();

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

    if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
      return res.status(400).json({
        status: "error",
        message: "stepOrder inválido.",
      });
    }

    if (!country) {
      return res.status(400).json({
        status: "error",
        message: "country é obrigatório no body.",
      });
    }

    const pool = getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // garante que o caso pertence ao agente
      const [[caseRow]] = await conn.query(
        `
        SELECT id, agent_id, difficulty, max_turns
        FROM cases
        WHERE id = ?
        `,
        [caseId]
      );

      if (!caseRow) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          status: "error",
          message: "Caso não encontrado.",
        });
      }

      if (caseRow.agent_id !== agentId) {
        await conn.rollback();
        conn.release();
        return res.status(403).json({
          status: "error",
          message: "Este caso não pertence a este agente.",
        });
      }

      // confere progresso pra ver step atual
      const [[progressRow]] = await conn.query(
        `
        SELECT id, current_step_order, wrong_travels, turns_used
        FROM case_progress
        WHERE case_id = ?
          AND agent_id = ?
        FOR UPDATE
        `,
        [caseId, agentId]
      );

      if (!progressRow) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          status: "error",
          message:
            "Progresso do caso não encontrado. Inicie o caso antes de viajar.",
        });
      }

      const maxTurns = await ensureCaseMaxTurns(conn, caseRow, agentId);
      const turnsUsed = progressRow.turns_used || 0;

      if (maxTurns && turnsUsed >= maxTurns) {
        await conn.rollback();
        conn.release();

        const scoring = await applyCaseResult({
          caseId,
          agentId,
          result: "failed_timeout",
        });

        return res.status(400).json({
          status: "error",
          message:
            "Tempo esgotado para este caso. Você demorou demais para decidir o próximo destino e o culpado escapou.",
          data: {
            reason: "timeout",
            scoring,
          },
        });
      }

      const currentStepOrder = progressRow.current_step_order || 1;

      // não obrigo stepOrder == currentStepOrder, mas aviso
      const requestedStepOrder = stepOrder;
      if (requestedStepOrder !== currentStepOrder) {
        // opcional: poderia forçar para currentStepOrder
      }

      // pega opções de viagem para o step
      const [travelRows] = await conn.query(
        `
        SELECT
          id,
          country_name,
          is_correct_country
        FROM case_travel_options
        WHERE case_id = ?
          AND step_order = ?
        `,
        [caseId, requestedStepOrder]
      );

      if (!travelRows || travelRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          status: "error",
          message:
            "Nenhuma opção de viagem configurada para esse step do caso.",
        });
      }

      const normalizedCountry = country.toLowerCase().trim();

      const chosen = travelRows.find(
        (t) => t.country_name.toLowerCase().trim() === normalizedCountry
      );

      if (!chosen) {
        // país não está nem nas opções
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          status: "error",
          message:
            "País escolhido não é uma opção válida para este passo da investigação.",
        });
      }

      const isCorrect = chosen.is_correct_country === 1;

      // Atualiza turnos (toda viagem consome 1 turno)
      let newTurnsUsed = (progressRow.turns_used || 0) + 1;

      if (!isCorrect) {
        const newWrongTravels = (progressRow.wrong_travels || 0) + 1;

        await conn.query(
          `
          UPDATE case_progress
          SET wrong_travels = ?, turns_used = ?, updated_at = NOW()
          WHERE id = ?
          `,
          [newWrongTravels, newTurnsUsed, progressRow.id]
        );

        await conn.commit();
        conn.release();

        const emptyLocations = [
          {
            name: "Praça central",
            role: "empty",
            place_type: "praça",
            clue_text: "Não vi ninguém suspeito por aqui.",
          },
          {
            name: "Estação de trem",
            role: "empty",
            place_type: "estação",
            clue_text: "Movimento normal, nenhum rastro do alvo.",
          },
          {
            name: "Café da esquina",
            role: "empty",
            place_type: "café",
            clue_text:
              "Os clientes parecem distraídos, ninguém se lembra de alguém suspeito.",
          },
        ];

        return res.json({
          status: "ok",
          data: {
            correctCountry: false,
            country: chosen.country_name,
            locations: emptyLocations,
            npcs: [],
          },
        });
      }

      // se acertou o país: pega locations e npcs reais do step
      const [locationsRows] = await conn.query(
        `
        SELECT
          id,
          case_id,
          step_order,
          country_name,
          place_name,
          place_type,
          role,
          clue_text,
          suspect_attribute
        FROM case_step_locations
        WHERE case_id = ?
          AND step_order = ?
        ORDER BY id ASC
        `,
        [caseId, requestedStepOrder]
      );

      const [npcsRows] = await conn.query(
        `
        SELECT
          id,
          case_id,
          step_order,
          archetype,
          allegiance,
          attitude,
          dialogue_high_reputation,
          dialogue_neutral_reputation,
          dialogue_low_reputation
        FROM case_step_npcs
        WHERE case_id = ?
          AND step_order = ?
        ORDER BY id ASC
        `,
        [caseId, requestedStepOrder]
      );

      // atualiza apenas turns_used (viagem correta)
      await conn.query(
        `
        UPDATE case_progress
        SET turns_used = ?, updated_at = NOW()
        WHERE id = ?
        `,
        [newTurnsUsed, progressRow.id]
      );

      await conn.commit();
      conn.release();

      return res.json({
        status: "ok",
        data: {
          correctCountry: true,
          country: chosen.country_name,
          locations: locationsRows,
          npcs: npcsRows,
        },
      });
    } catch (innerErr) {
      try {
        await conn.rollback();
      } catch (_) {}
      conn.release();
      console.error("Erro interno em POST /cases/:caseId/travel:", innerErr);
      return res.status(500).json({
        status: "error",
        message: "Erro ao processar viagem do caso.",
        error: innerErr.message,
      });
    }
  } catch (err) {
    console.error("Erro em POST /cases/:caseId/travel:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao processar viagem do caso.",
      error: err.message,
    });
  }
});

// ------------------------------------------------------
// VISITAR UM LOCAL DENTRO DO PAÍS ESCOLHIDO
// POST /api/v1/cases/:caseId/visit-location
// body: { agentId, stepOrder, locationId }
// ------------------------------------------------------
router.post("/cases/:caseId/visit-location", async (req, res) => {
  try {
    const caseId = Number(req.params.caseId);
    const agentId = Number(req.body.agentId || req.query.agentId || 1);
    const stepOrder = Number(req.body.stepOrder);
    const locationId = Number(req.body.locationId);

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

    if (!Number.isFinite(stepOrder) || stepOrder <= 0) {
      return res.status(400).json({
        status: "error",
        message: "stepOrder inválido.",
      });
    }

    if (!Number.isFinite(locationId) || locationId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "locationId inválido.",
      });
    }

    const pool = getDbPool();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // garante que o caso pertence ao agente
      const [[caseRow]] = await conn.query(
        `
        SELECT id, agent_id, villain_id, difficulty, max_turns
        FROM cases
        WHERE id = ?
        `,
        [caseId]
      );

      if (!caseRow) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          status: "error",
          message: "Caso não encontrado.",
        });
      }

      if (caseRow.agent_id !== agentId) {
        await conn.rollback();
        conn.release();
        return res.status(403).json({
          status: "error",
          message: "Este caso não pertence a este agente.",
        });
      }

      const villainId = caseRow.villain_id;

      // progresso do caso
      const [[progressRow]] = await conn.query(
        `
        SELECT id, current_step_order, turns_used
        FROM case_progress
        WHERE case_id = ?
          AND agent_id = ?
        FOR UPDATE
        `,
        [caseId, agentId]
      );

      if (!progressRow) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          status: "error",
          message:
            "Progresso do caso não encontrado. Inicie o caso antes de visitar locais.",
        });
      }

      const maxTurns = await ensureCaseMaxTurns(conn, caseRow, agentId);
      let turnsUsed = progressRow.turns_used || 0;

      if (maxTurns && turnsUsed >= maxTurns) {
        await conn.rollback();
        conn.release();

        const scoring = await applyCaseResult({
          caseId,
          agentId,
          result: "failed_timeout",
        });

        return res.status(400).json({
          status: "error",
          message:
            "Tempo esgotado. Você demorou demais para explorar os locais deste país e o rastro esfriou.",
          data: {
            reason: "timeout",
            scoring,
          },
        });
      }

      const currentStepOrder = progressRow.current_step_order || 1;
      const requestedStepOrder = stepOrder;

      // carrega o local do step
      const [[locationRow]] = await conn.query(
        `
        SELECT
          id,
          case_id,
          step_order,
          country_name,
          place_name,
          place_type,
          role,
          clue_text,
          suspect_attribute
        FROM case_step_locations
        WHERE id = ?
          AND case_id = ?
          AND step_order = ?
        `,
        [locationId, caseId, requestedStepOrder]
      );

      if (!locationRow) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          status: "error",
          message:
            "Local não encontrado para esse caso/step. Verifique o locationId.",
        });
      }

      // registra visita (evita duplicado via UNIQUE)
      const [[existingVisit]] = await conn.query(
        `
        SELECT id
        FROM case_step_visits
        WHERE case_id = ?
          AND agent_id = ?
          AND step_order = ?
          AND location_id = ?
        `,
        [caseId, agentId, requestedStepOrder, locationId]
      );

      let isFirstVisit = false;

      if (!existingVisit) {
        isFirstVisit = true;
        await conn.query(
          `
          INSERT INTO case_step_visits (
            case_id,
            agent_id,
            step_order,
            location_id
          )
          VALUES (?, ?, ?, ?)
          `,
          [caseId, agentId, requestedStepOrder, locationId]
        );

        // primeira visita ao local consome 1 turno
        turnsUsed += 1;
        await conn.query(
          `
          UPDATE case_progress
          SET turns_used = ?, updated_at = NOW()
          WHERE id = ?
          `,
          [turnsUsed, progressRow.id]
        );
      }

      // pega reputação do agente pra escolher fala dos NPCs
      const [[agentRow]] = await conn.query(
        `
        SELECT reputation
        FROM agents
        WHERE id = ?
        `,
        [agentId]
      );

      const reputation = agentRow?.reputation ?? 50;

      const [npcsRows] = await conn.query(
        `
        SELECT
          id,
          case_id,
          step_order,
          archetype,
          allegiance,
          attitude,
          dialogue_high_reputation,
          dialogue_neutral_reputation,
          dialogue_low_reputation
        FROM case_step_npcs
        WHERE case_id = ?
          AND step_order = ?
        ORDER BY id ASC
        `,
        [caseId, requestedStepOrder]
      );

      // escolhe as falas dependendo da reputação
      const npcsWithDialogue = npcsRows.map((npc) => {
        let chosenDialogue = null;

        if (reputation >= 65 && npc.dialogue_high_reputation) {
          chosenDialogue = npc.dialogue_high_reputation;
        } else if (reputation < 35 && npc.dialogue_low_reputation) {
          chosenDialogue = npc.dialogue_low_reputation;
        } else if (npc.dialogue_neutral_reputation) {
          chosenDialogue = npc.dialogue_neutral_reputation;
        } else {
          chosenDialogue =
            npc.dialogue_neutral_reputation ||
            npc.dialogue_high_reputation ||
            npc.dialogue_low_reputation ||
            null;
        }

        return {
          id: npc.id,
          archetype: npc.archetype,
          allegiance: npc.allegiance,
          attitude: npc.attitude,
          dialogue: chosenDialogue,
        };
      });

      // 🔎 SE O LOCAL FOR UMA PISTA DE SUSPEITO, GERAR PISTA EM case_villain_clues
      if (
        locationRow.role === "suspect_clue" &&
        locationRow.suspect_attribute &&
        villainId
      ) {
        const attrName = locationRow.suspect_attribute;

        // busca valor do atributo no vilão culpado
        const [[villainRow]] = await conn.query(
          `
          SELECT
            id,
            hair_color,
            vehicle,
            hobby,
            occupation,
            feature,
            sex
          FROM villain_templates
          WHERE id = ?
          `,
          [villainId]
        );

        if (villainRow) {
          let attrValue = null;

          switch (attrName) {
            case "hair_color":
              attrValue = villainRow.hair_color;
              break;
            case "vehicle":
              attrValue = villainRow.vehicle;
              break;
            case "hobby":
              attrValue = villainRow.hobby;
              break;
            case "occupation":
              attrValue = villainRow.occupation;
              break;
            case "feature":
              attrValue = villainRow.feature;
              break;
            case "sex":
              attrValue = villainRow.sex;
              break;
            default:
              attrValue = null;
          }

          if (attrValue) {
            // pega step_id correspondente a este stepOrder
            const [[stepRow]] = await conn.query(
              `
              SELECT id
              FROM case_steps
              WHERE case_id = ?
                AND step_order = ?
              LIMIT 1
              `,
              [caseId, requestedStepOrder]
            );

            if (stepRow) {
              // verifica se já existe pista desse atributo nesse step
              const [[existingClue]] = await conn.query(
                `
                SELECT cvc.id
                FROM case_villain_clues cvc
                WHERE cvc.case_id = ?
                  AND cvc.step_id = ?
                  AND cvc.attribute_name = ?
                LIMIT 1
                `,
                [caseId, stepRow.id, attrName]
              );

              if (!existingClue) {
                await conn.query(
                  `
                  INSERT INTO case_villain_clues (
                    case_id,
                    step_id,
                    attribute_name,
                    attribute_value
                  )
                  VALUES (?, ?, ?, ?)
                  `,
                  [caseId, stepRow.id, attrName, attrValue]
                );
              }
            }
          }
        }
      }

      // conta quantos locais existem nesse step e quantos já foram visitados
      const [[totalLocationsRow]] = await conn.query(
        `
        SELECT COUNT(*) AS total
        FROM case_step_locations
        WHERE case_id = ?
          AND step_order = ?
        `,
        [caseId, requestedStepOrder]
      );

      const totalLocations = totalLocationsRow?.total || 0;

      const [[visitedCountRow]] = await conn.query(
        `
        SELECT COUNT(DISTINCT location_id) AS visited
        FROM case_step_visits
        WHERE case_id = ?
          AND agent_id = ?
          AND step_order = ?
        `,
        [caseId, agentId, requestedStepOrder]
      );

      const visitedCount = visitedCountRow?.visited || 0;
      const allLocationsVisited =
        totalLocations > 0 && visitedCount >= totalLocations;

      await conn.commit();
      conn.release();

      return res.json({
        status: "ok",
        data: {
          location: {
            id: locationRow.id,
            country_name: locationRow.country_name,
            place_name: locationRow.place_name,
            place_type: locationRow.place_type,
            role: locationRow.role,
            clue_text: locationRow.clue_text,
            suspect_attribute: locationRow.suspect_attribute,
          },
          npcs: npcsWithDialogue,
          allLocationsVisited,
        },
      });
    } catch (innerErr) {
      try {
        await conn.rollback();
      } catch (_) {}
      conn.release();
      console.error(
        "Erro interno em POST /cases/:caseId/visit-location:",
        innerErr
      );
      return res.status(500).json({
        status: "error",
        message: "Erro ao processar visita ao local.",
        error: innerErr.message,
      });
    }
  } catch (err) {
    console.error("Erro em POST /cases/:caseId/visit-location:", err);
    return res.status(500).json({
      status: "error",
      message: "Erro ao processar visita ao local.",
      error: err.message,
    });
  }
});

export default router;
