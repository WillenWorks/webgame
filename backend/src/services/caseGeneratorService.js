// src/services/caseGeneratorService.js
import { getDbPool } from "../database/database.js";
import { generateCarmenCaseStructure } from "./llmService.js";
import { determineAgentPositionByXp } from "./gameMechanicsService.js";

// função util pra embaralhar array simples
function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

/**
 * Cria um caso para um agente:
 * - escolhe 1 vilão culpado
 * - escolhe 9 vilões falsos
 * - gera steps a partir do LLM
 * - cria relação de pistas (case_villain_clues)
 * - cria suspects (case_suspects)
 */
export async function createCaseForAgent(agentId, difficulty = "easy") {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1) Busca vilões ativos
    const [villains] = await conn.query(
      "SELECT * FROM villain_templates WHERE active = 1"
    );

    if (!villains || villains.length < 10) {
      throw new Error(
        "É necessário ter pelo menos 10 vilões em villain_templates para gerar um caso."
      );
    }

    // 2) Escolhe vilão culpado + 9 vilões falsos
    const shuffledVillains = shuffle(villains);
    const guiltyVillain = shuffledVillains[0];
    const fakeVillains = shuffledVillains.slice(1, 10);

    // 3) Busca alguns locais
    const [locations] = await conn.query(
      `
      SELECT id, name, country, region
      FROM locations
      ORDER BY RAND()
      LIMIT 8
      `
    );

    if (!locations || locations.length === 0) {
      throw new Error("Nenhum local encontrado para gerar um caso.");
    }

    // 4) Usa LLM pra gerar estrutura do caso
    const structure = await generateCarmenCaseStructure({
      villain: guiltyVillain,
      locations,
      difficulty,
    });

    // 5) Cria o case
    const [caseInsert] = await conn.query(
      `
      INSERT INTO cases (
        agent_id,
        villain_id,
        title,
        summary,
        difficulty,
        status,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, 'available', NOW())
      `,
      [
        agentId,
        guiltyVillain.id,
        structure.title,
        structure.summary,
        difficulty,
      ]
    );

    const caseId = caseInsert.insertId;

    // 6) Cria case_steps + registra mapeamento
    const stepMap = new Map();

    const totalSteps = structure.steps?.length || 0;

    for (const step of structure.steps) {
      // fallback de local: se a IA não trouxe location_id,
      // usamos a lista de locations sorteada no início
      const fallbackLocation =
        locations[(step.order - 1) % locations.length] || locations[0];

      const toLocationId = step.location_id ?? fallbackLocation.id;

      const [stepInsert] = await conn.query(
        `
    INSERT INTO case_steps (
      case_id,
      step_order,
      step_type,
      to_location_id,
      description
    )
    VALUES (?, ?, ?, ?, ?)
    `,
        [caseId, step.order, step.type, toLocationId, step.description]
      );

      stepMap.set(step.id, stepInsert.insertId);
    }

    // 7) Cria pistas do vilão (case_villain_clues)
    if (structure.villain_clues && structure.villain_clues.length > 0) {
      // Usa as pistas vindas da IA
      for (const clue of structure.villain_clues) {
        const stepDbId = clue.step_ref ? stepMap.get(clue.step_ref) : null;

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
          [caseId, stepDbId, clue.attribute_name, clue.attribute_value]
        );
      }
    } else {
      // Fallback: gera pistas básicas a partir dos atributos do vilão culpado
      const baseClues = [
        { name: "hair_color", value: guiltyVillain.hair_color },
        { name: "occupation", value: guiltyVillain.occupation },
        { name: "hobby", value: guiltyVillain.hobby },
        { name: "vehicle", value: guiltyVillain.vehicle },
        { name: "feature", value: guiltyVillain.feature },
      ].filter((c) => c.value);

      const stepIds = Array.from(stepMap.values());

      baseClues.forEach(async (clue, index) => {
        if (!stepIds.length) return;

        // distribui em steps diferentes, na ordem
        const stepDbId = stepIds[Math.min(index, stepIds.length - 1)];

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
          [caseId, stepDbId, clue.name, clue.value]
        );
      });
    }

    // 8) Cria suspeitos (case_suspects) – 1 real + 9 falsos
    const allSuspects = [guiltyVillain, ...fakeVillains];

    for (const v of allSuspects) {
      const isGuilty = v.id === guiltyVillain.id ? 1 : 0;

      await conn.query(
        `
        INSERT INTO case_suspects (
          case_id,
          villain_template_id,
          is_guilty,
          name_snapshot,
          sex_snapshot,
          occupation_snapshot,
          hobby_snapshot,
          hair_color_snapshot,
          vehicle_snapshot,
          feature_snapshot,
          other_snapshot
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          caseId,
          v.id,
          isGuilty ? 1 : 0,
          v.name,
          v.sex || null,
          v.occupation || null,
          v.hobby || null,
          v.hair_color || null,
          v.vehicle || null,
          v.feature || null,
          v.other || null,
        ]
      );
    }

    await conn.commit();
    return caseId;
  } catch (err) {
    await conn.rollback();
    console.error("Erro em createCaseForAgent:", err);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Retorna a lista de casos disponíveis para um agente,
 * respeitando o "rank" (posição interna calculada pelo XP):
 *
 * - trainee / field_agent
 *   => caso designado (no máx. 1 caso ativo)
 *   => se não houver caso, cria um "easy" automaticamente
 *
 * - senior_agent em diante
 *   => pode escolher entre casos disponíveis
 *   => se não houver nenhum, gera alguns casos (ex.: 3) para escolha
 */
export async function getAvailableCasesForAgent(agentId) {
  const pool = getDbPool();

  // 1) Carrega o perfil básico do agente
  const [[agentRow]] = await pool.query(
    `
    SELECT id, xp, position, reputation, solved_cases, failed_cases
    FROM agents
    WHERE id = ?
    `,
    [agentId]
  );

  if (!agentRow) {
    throw new Error("Agente não encontrado ao buscar casos disponíveis.");
  }

  const xp = agentRow.xp ?? 0;
  // Rank interno usado para regras de jogo
  const rank = determineAgentPositionByXp(xp);

  const isRestrictedPosition = rank === "trainee" || rank === "field_agent";

  // 2) Busca casos já existentes para o agente
  const [existingCases] = await pool.query(
    `SELECT 
       id,
       title,
       summary,
       status,
       difficulty,
       created_at
     FROM cases
     WHERE agent_id = ?
       AND status IN ('available', 'in_progress')
     ORDER BY created_at DESC`,
    [agentId]
  );

  // 3) Para posições iniciais (trainee / field_agent), o agente não escolhe:
  //    sempre há no máximo 1 caso designado pra ele.
  if (isRestrictedPosition) {
    if (existingCases.length > 0) {
      // Já existe um caso designado (available ou in_progress)
      return existingCases.slice(0, 1);
    }

    // Nenhum caso ainda: cria um caso novo e retorna apenas ele
    const createdCaseId = await createCaseForAgent(agentId, "easy");

    const [[assignedCase]] = await pool.query(
      `SELECT 
         id,
         title,
         summary,
         status,
         difficulty,
         created_at
       FROM cases
       WHERE id = ?`,
      [createdCaseId]
    );

    return assignedCase ? [assignedCase] : [];
  }

  // 4) Para posições a partir de senior_agent, o agente pode escolher entre casos.
  //    Se não houver nenhum, geramos alguns casos para oferecer variedade.
  if (existingCases.length > 0) {
    return existingCases;
  }

  const createdCaseIds = [];
  const targetCount = 3;

  for (let i = 0; i < targetCount; i++) {
    const createdId = await createCaseForAgent(agentId, "medium");
    createdCaseIds.push(createdId);
  }

  if (createdCaseIds.length === 0) {
    return [];
  }

  const [createdCases] = await pool.query(
    `SELECT 
       id,
       title,
       summary,
       status,
       difficulty,
       created_at
     FROM cases
     WHERE agent_id = ?
       AND status IN ('available', 'in_progress')
     ORDER BY created_at DESC`,
    [agentId]
  );

  return createdCases;
}

/**
 * Inicia (ou retoma) um caso para um agente:
 * - valida se o caso pertence ao agente
 * - cria/atualiza registro em case_progress
 */
export async function startCaseForAgent(caseId, agentId) {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [caseRows] = await conn.query(
      "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
      [caseId, agentId]
    );

    if (!caseRows || caseRows.length === 0) {
      throw new Error("Caso não encontrado para este agente.");
    }

    const caseData = caseRows[0];

    if (caseData.status === "available") {
      await conn.query("UPDATE cases SET status = 'in_progress' WHERE id = ?", [
        caseId,
      ]);
    }

    const [progressRows] = await conn.query(
      `
      SELECT id, current_step_order
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      `,
      [caseId, agentId]
    );

    if (!progressRows || progressRows.length === 0) {
      await conn.query(
        `
      INSERT INTO case_progress (
        case_id,
        agent_id
      )
      VALUES (?, ?)
    `,
        [caseId, agentId]
      );
    }

    await conn.commit();

    return { caseId, status: "ok" };
  } catch (err) {
    await conn.rollback();
    console.error("Erro em startCaseForAgent:", err);
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Retorna o status detalhado de um caso para um agente:
 *  - dados básicos do case
 *  - step atual
 *  - progresso (current/total)
 *  - pistas (case_villain_clues)
 *  - lista de suspeitos (case_suspects)
 *  - regra de quando pode emitir mandado
 */
export async function getCaseInvestigationStatus(caseId, agentId) {
  const pool = getDbPool();

  // Parametrização básica da regra de evidência
  const MIN_STEPS_FOR_WARRANT = 3;
  const MIN_CLUES_FOR_WARRANT = 3;

  // 1) Carrega o caso para esse agente
  const [caseRows] = await pool.query(
    "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
    [caseId, agentId]
  );

  if (!caseRows || caseRows.length === 0) {
    throw new Error("Caso não encontrado para este agente.");
  }

  const caseData = caseRows[0];

  // 2) Conta quantos steps esse caso possui
  const [[stepsCountRow]] = await pool.query(
    "SELECT COUNT(*) AS totalSteps FROM case_steps WHERE case_id = ?",
    [caseId]
  );

  const totalSteps = stepsCountRow.totalSteps || 0;

  // 3) Descobre qual é o step atual pelo case_progress
  let currentStepOrder = 1;

  const [progressRows] = await pool.query(
    "SELECT * FROM case_progress WHERE case_id = ? AND agent_id = ?",
    [caseId, agentId]
  );

  if (progressRows && progressRows.length > 0) {
    currentStepOrder = progressRows[0].current_step_order || 1;
  }

  if (totalSteps > 0 && currentStepOrder > totalSteps) {
    currentStepOrder = totalSteps;
  }

  // 4) Carrega o step atual, juntando com o local de destino (to_location_id)
  let currentStep = null;

  if (totalSteps > 0) {
    const [stepRows] = await pool.query(
      `SELECT cs.*,
            l.name AS location_name
     FROM case_steps cs
     LEFT JOIN locations l ON l.id = cs.to_location_id
     WHERE cs.case_id = ?
       AND cs.step_order = ?
     ORDER BY cs.step_order ASC`,
      [caseId, currentStepOrder]
    );

    currentStep = stepRows.length > 0 ? stepRows[0] : null;
  }

  // 5) Pistas do vilão já liberadas até o step atual
  const [clueRows] = await pool.query(
    `SELECT
       cvc.id,
       cvc.step_id,
       cs.step_order,
       cvc.attribute_name,
       cvc.attribute_value,
       cvc.created_at
     FROM case_villain_clues cvc
     LEFT JOIN case_steps cs ON cs.id = cvc.step_id
     WHERE cvc.case_id = ?
       AND (cs.step_order IS NULL OR cs.step_order <= ?)
     ORDER BY cvc.created_at ASC`,
    [caseId, currentStepOrder]
  );

  // 6) Lista de suspeitos (snapshot de vilões pra esse caso)
  const [suspectsRows] = await pool.query(
    `SELECT
       id,
       case_id,
       villain_template_id,
       is_guilty,
       name_snapshot,
       sex_snapshot,
       occupation_snapshot,
       hobby_snapshot,
       hair_color_snapshot,
       vehicle_snapshot,
       feature_snapshot,
       other_snapshot
     FROM case_suspects
     WHERE case_id = ?
     ORDER BY id ASC`,
    [caseId]
  );

  // --- cálculo de compatibilidade pistas x suspeitos ---
  const normalizedClues = (clueRows || []).map((c) => ({
    name: c.attribute_name,
    value:
      typeof c.attribute_value === "string"
        ? c.attribute_value.toLowerCase().trim()
        : String(c.attribute_value ?? "")
            .toLowerCase()
            .trim(),
  }));

  function computeMatchesForSuspect(suspect) {
    let score = 0;
    const matchedAttributes = [];

    for (const clue of normalizedClues) {
      let suspectValueRaw = null;

      switch (clue.name) {
        case "hair_color":
          suspectValueRaw = suspect.hair_color_snapshot;
          break;
        case "occupation":
          suspectValueRaw = suspect.occupation_snapshot;
          break;
        case "hobby":
          suspectValueRaw = suspect.hobby_snapshot;
          break;
        case "vehicle":
          suspectValueRaw = suspect.vehicle_snapshot;
          break;
        case "feature":
          suspectValueRaw = suspect.feature_snapshot;
          break;
        default:
          break;
      }

      if (!suspectValueRaw) continue;

      const suspectValue = String(suspectValueRaw).toLowerCase().trim();

      if (!suspectValue) continue;

      // match simples: contém ou é igual
      if (
        suspectValue === clue.value ||
        suspectValue.includes(clue.value) ||
        clue.value.includes(suspectValue)
      ) {
        score += 1;
        matchedAttributes.push(clue.name);
      }
    }

    return {
      score,
      matchedAttributes,
    };
  }

  const suspects = (suspectsRows || []).map((s) => {
    const { score, matchedAttributes } = computeMatchesForSuspect(s);
    return {
      ...s,
      matchScore: score,
      matchedAttributes,
    };
  });

  // ---- Regra reforçada de emissão de mandado ----
  const completedSteps =
    totalSteps === 0
      ? 0
      : Math.max(0, Math.min(currentStepOrder - 1, totalSteps));
  const cluesCount = clueRows.length;
  const reachedEnd = totalSteps > 0 && currentStepOrder >= totalSteps;
  const hasAnyClue = cluesCount > 0;

  // Regra:
  // - caminho "padrão": mínimo de passos + mínimo de pistas
  // - fallback: se chegou no fim do caso, libera mesmo que não tenha pistas (para não travar)
  const canIssueWarrant =
    caseData.status === "in_progress" &&
    totalSteps > 0 &&
    ((completedSteps >= MIN_STEPS_FOR_WARRANT &&
      cluesCount >= MIN_CLUES_FOR_WARRANT) ||
      reachedEnd);

  // 8) Monta o objeto de status pra API
  return {
    case: {
      id: caseData.id,
      title: caseData.title,
      summary: caseData.summary,
      status: caseData.status,
      difficulty: caseData.difficulty,
      created_at: caseData.created_at,
      closed_at: caseData.closed_at || null,
    },
    currentStep,
    progress: {
      current: totalSteps === 0 ? 0 : currentStepOrder,
      total: totalSteps,
      completedSteps,
      cluesCount,
      minStepsForWarrant: MIN_STEPS_FOR_WARRANT,
      minCluesForWarrant: MIN_CLUES_FOR_WARRANT,
      canIssueWarrant,
      reachedEnd,
      hasAnyClue,
    },
    clues: clueRows,
    suspects,
    canIssueWarrant,
  };
}

/**
 * Avança o passo da investigação:
 *  - incrementa current_step_order em case_progress
 *  - incrementa turns_used
 *  - retorna novo status (currentStep + progress + clues + suspects)
 */
export async function advanceCaseStep(caseId, agentId) {
  const pool = getDbPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [[caseRow]] = await conn.query(
      "SELECT id, difficulty, max_turns FROM cases WHERE id = ? FOR UPDATE",
      [caseId]
    );

    if (!caseRow) {
      throw new Error("Caso não encontrado para advanceCaseStep.");
    }

    const [steps] = await conn.query(
      `
      SELECT id, step_order
      FROM case_steps
      WHERE case_id = ?
      ORDER BY step_order ASC
      `,
      [caseId]
    );

    const totalSteps = steps.length;

    const [[progressRow]] = await conn.query(
      `
      SELECT
        id,
        current_step_order,
        turns_used,
        wrong_travels,
        wrong_warrants
      FROM case_progress
      WHERE case_id = ?
        AND agent_id = ?
      FOR UPDATE
      `,
      [caseId, agentId]
    );

    if (!progressRow) {
      throw new Error("Progresso do caso não encontrado para advanceCaseStep.");
    }

    let currentStepOrder = progressRow.current_step_order || 1;
    let turnsUsed = progressRow.turns_used || 0;

    // Avança step (mas não passa do total)
    if (currentStepOrder < totalSteps) {
      currentStepOrder += 1;
    }

    turnsUsed += 1;

    await conn.query(
      `
      UPDATE case_progress
      SET current_step_order = ?, turns_used = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [currentStepOrder, turnsUsed, progressRow.id]
    );

    await conn.commit();

    const status = await getCaseInvestigationStatus(caseId, agentId);

    return {
      ...status,
      reachedEnd: status.progress.current >= status.progress.total,
    };
  } catch (err) {
    await conn.rollback();
    console.error("Erro em advanceCaseStep:", err);
    throw err;
  } finally {
    conn.release();
  }
}
