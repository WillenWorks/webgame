// src/services/caseGeneratorService.js
import { getDbPool } from "../database/database.js"
import { generateCarmenCaseStructure } from "./llmService.js"

// função util pra embaralhar array simples
function shuffle(array) {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
}

/**
 * Cria um caso para um agente:
 * - escolhe 1 vilão culpado
 * - escolhe 9 vilões falsos
 * - chama IA para gerar narrativa (título, resumo, steps)
 * - cria registro em `cases`
 * - cria 10 `case_suspects` (snapshot)
 * - cria `case_steps` usando os steps da IA (ou fallback)
 * - cria `case_villain_clues` com pistas ligadas aos atributos do vilão
 */
export async function createCaseForAgent(agentId, difficulty = "easy") {
  const pool = getDbPool()
  const conn = await pool.getConnection()

  try {
    await conn.beginTransaction()

    // 1) Busca vilões ativos
    const [villains] = await conn.query(
      "SELECT * FROM villain_templates WHERE active = 1",
    )

    if (!villains || villains.length < 10) {
      throw new Error(
        "É necessário ter pelo menos 10 vilões em villain_templates para gerar um caso.",
      )
    }

    const shuffled = shuffle(villains)
    const guilty = shuffled[0]
    const others = shuffled.slice(1, 10) // 9 falsos

    // 2) Busca locations
    const [locations] = await conn.query("SELECT * FROM locations")
    if (!locations || locations.length === 0) {
      throw new Error(
        "É necessário ter locations cadastradas para gerar um caso.",
      )
    }

    const startLocation = shuffle(locations)[0]

    // 3) Chama IA para gerar narrativa do caso
    let aiNarrative = null
    let title = `Caso preliminar: atividade suspeita em ${startLocation.name}`
    let summary = `Relatório inicial indica movimentação suspeita ligada a ${guilty.name} em ${startLocation.name}. Este caso ainda não foi enriquecido pela IA.`

    try {
      aiNarrative = await generateCarmenCaseStructure({
        villain: {
          name: guilty.name,
          sex: guilty.sex,
          occupation: guilty.occupation,
          hobby: guilty.hobby,
          hair_color: guilty.hair_color,
          vehicle: guilty.vehicle,
          feature: guilty.feature,
          other: guilty.other,
        },
        locations: locations.map((l) => ({
          id: l.id,
          name: l.name,
        })),
        difficulty,
      })

      if (aiNarrative?.title) title = aiNarrative.title
      if (aiNarrative?.summary) summary = aiNarrative.summary
    } catch (err) {
      console.error(
        "⚠️ Falha ao gerar narrativa com IA, usando textos padrão:",
        err.message,
      )
      aiNarrative = null
    }

    // 4) Cria o registro de case
    const [caseResult] = await conn.query(
      `INSERT INTO cases
       (agent_id, external_case_id, title, summary, status, difficulty, villain_template_id, start_location_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        agentId,
        null,
        title,
        summary,
        "available",
        difficulty,
        guilty.id,
        startLocation.id,
      ],
    )

    const caseId = caseResult.insertId

    // 5) Cria case_suspects — 1 culpado + 9 falsos
    const suspects = [guilty, ...others]

    for (const v of suspects) {
      const isGuilty = v.id === guilty.id ? 1 : 0
      await conn.query(
        `INSERT INTO case_suspects
         (case_id, villain_template_id, is_guilty,
          name_snapshot, sex_snapshot, occupation_snapshot, hobby_snapshot,
          hair_color_snapshot, vehicle_snapshot, feature_snapshot, other_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          v.id,
          isGuilty,
          v.name,
          v.sex,
          v.occupation,
          v.hobby,
          v.hair_color,
          v.vehicle,
          v.feature,
          v.other,
        ],
      )
    }

    // 6) Cria case_steps + registra meta para pistas
    const attributeMap = {
      name: guilty.name,
      sex: guilty.sex,
      occupation: guilty.occupation,
      hobby: guilty.hobby,
      hair_color: guilty.hair_color,
      vehicle: guilty.vehicle,
      feature: guilty.feature,
      other: guilty.other,
    }

    const createdStepsMeta = []

    if (aiNarrative && Array.isArray(aiNarrative.steps) && aiNarrative.steps.length > 0) {
      const locationByName = new Map()
      for (const loc of locations) {
        locationByName.set(loc.name, loc)
      }

      let order = 1
      for (const step of aiNarrative.steps) {
        const loc = locationByName.get(step.location) || startLocation

        const [stepResult] = await conn.query(
          `INSERT INTO case_steps
           (case_id, step_order, from_location_id, to_location_id, step_type, description)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            caseId,
            order,
            null,
            loc.id,
            step.type || "clue",
            step.description || "",
          ],
        )

        const stepId = stepResult.insertId

        createdStepsMeta.push({
          order,
          stepId,
          villainClueAttr: step.villain_clue_attribute || null,
        })

        order++
      }
    } else {
      // Fallback: 2 steps básicos se IA falhar
      const [step1Result] = await conn.query(
        `INSERT INTO case_steps
         (case_id, step_order, from_location_id, to_location_id, step_type, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          1,
          null,
          startLocation.id,
          "briefing",
          `Você recebe um dossiê preliminar sobre ${guilty.name} e é enviado para ${startLocation.name} para investigar.`,
        ],
      )

      const [step2Result] = await conn.query(
        `INSERT INTO case_steps
         (case_id, step_order, from_location_id, to_location_id, step_type, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          caseId,
          2,
          startLocation.id,
          startLocation.id,
          "clue",
          `Moradores locais relatam ter visto uma figura compatível com o perfil de ${guilty.name} circulando em áreas turísticas.`,
        ],
      )

      createdStepsMeta.push({
        order: 1,
        stepId: step1Result.insertId,
        villainClueAttr: null,
      })
      createdStepsMeta.push({
        order: 2,
        stepId: step2Result.insertId,
        villainClueAttr: null,
      })
    }

    // 7) Criar entradas em case_villain_clues com base nas metas
    for (const meta of createdStepsMeta) {
      if (!meta.villainClueAttr) continue

      const attrName = meta.villainClueAttr
      const attrValue = attributeMap[attrName]

      if (!attrValue) continue

      await conn.query(
        `INSERT INTO case_villain_clues
         (case_id, step_id, attribute_name, attribute_value)
         VALUES (?, ?, ?, ?)`,
        [caseId, meta.stepId, attrName, attrValue],
      )
    }

    await conn.commit()

    return {
      caseId,
      agentId,
      difficulty,
      guiltyVillainId: guilty.id,
      startLocationId: startLocation.id,
    }
  } catch (err) {
    await conn.rollback()
    console.error("Erro em createCaseForAgent:", err)
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Retorna os casos disponíveis / em andamento de um agente.
 */
export async function getAvailableCasesForAgent(agentId) {
  const pool = getDbPool()

  const [rows] = await pool.query(
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
    [agentId],
  )

  return rows
}

/**
 * Inicia (ou retoma) um caso para um agente:
 * - valida se o caso pertence ao agente
 * - se estiver 'available', muda pra 'in_progress'
 * - se estiver encerrado (solved/failed), bloqueia
 * - garante registro em case_progress
 * - retorna dados do caso + step atual + suspeitos + progresso
 */
export async function startCaseForAgent(caseId, agentId) {
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
      throw new Error("Caso já encerrado. Não é possível reiniciar.")
    }

    if (caseData.status === "available") {
      await conn.query(
        "UPDATE cases SET status = 'in_progress' WHERE id = ?",
        [caseId],
      )
      caseData.status = "in_progress"
    }

    // Progresso do caso
    const [progressRows] = await conn.query(
      "SELECT * FROM case_progress WHERE case_id = ? AND agent_id = ?",
      [caseId, agentId],
    )

    let currentStepOrder = 1
    let progressId = null

    if (!progressRows || progressRows.length === 0) {
      const [progressInsert] = await conn.query(
        "INSERT INTO case_progress (case_id, agent_id, current_step_order) VALUES (?, ?, ?)",
        [caseId, agentId, 1],
      )
      progressId = progressInsert.insertId
      currentStepOrder = 1
    } else {
      const prog = progressRows[0]
      progressId = prog.id
      currentStepOrder = prog.current_step_order || 1
    }

    const [stepRows] = await conn.query(
      "SELECT * FROM case_steps WHERE case_id = ? ORDER BY step_order ASC",
      [caseId],
    )

    const totalSteps = stepRows.length

    if (totalSteps === 0) {
      throw new Error("Caso sem passos configurados.")
    }

    if (currentStepOrder > totalSteps) {
      currentStepOrder = totalSteps
      await conn.query(
        "UPDATE case_progress SET current_step_order = ? WHERE id = ?",
        [currentStepOrder, progressId],
      )
    }

    const currentStep =
      stepRows.find((s) => s.step_order === currentStepOrder) || stepRows[0]

    const [suspectRows] = await conn.query(
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

    await conn.commit()

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
        current: currentStepOrder,
        total: totalSteps,
      },
      suspects: suspectRows,
    }
  } catch (err) {
    await conn.rollback()
    console.error("Erro em startCaseForAgent:", err)
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Retorna o status completo da investigação para um agente:
 * - case
 * - step atual
 * - progresso (current/total)
 * - pistas liberadas até o step atual
 * - suspeitos
 * - canIssueWarrant (se já chegou no último step e estiver em andamento)
 */
export async function getCaseInvestigationStatus(caseId, agentId) {
  const pool = getDbPool()

  const [caseRows] = await pool.query(
    "SELECT * FROM cases WHERE id = ? AND agent_id = ?",
    [caseId, agentId],
  )

  if (!caseRows || caseRows.length === 0) {
    throw new Error("Caso não encontrado para este agente.")
  }

  const caseData = caseRows[0]

  const [[stepsCountRow]] = await pool.query(
    "SELECT COUNT(*) AS totalSteps FROM case_steps WHERE case_id = ?",
    [caseId],
  )

  const totalSteps = stepsCountRow.totalSteps || 0

  let currentStepOrder = 1

  const [progressRows] = await pool.query(
    "SELECT * FROM case_progress WHERE case_id = ? AND agent_id = ?",
    [caseId, agentId],
  )

  if (progressRows && progressRows.length > 0) {
    currentStepOrder = progressRows[0].current_step_order || 1
  }

  if (totalSteps > 0 && currentStepOrder > totalSteps) {
    currentStepOrder = totalSteps
  }

  let currentStep = null

  if (totalSteps > 0) {
    const [stepRows] = await pool.query(
      `SELECT cs.*,
              l.name AS location_name,
              l.country AS location_country
       FROM case_steps cs
       LEFT JOIN locations l ON l.id = cs.to_location_id
       WHERE cs.case_id = ? AND cs.step_order = ?
       ORDER BY cs.step_order ASC`,
      [caseId, currentStepOrder],
    )

    currentStep = stepRows.length > 0 ? stepRows[0] : null
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
       AND (cs.step_order IS NULL OR cs.step_order <= ?)
     ORDER BY cs.step_order ASC, cvc.id ASC`,
    [caseId, currentStepOrder],
  )

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

  const canIssueWarrant =
    caseData.status === "in_progress" && totalSteps > 0 && currentStepOrder >= totalSteps

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
    },
    clues: clueRows,
    suspects,
    canIssueWarrant,
  }
}

/**
 * Avança o step do caso para o agente:
 * - valida caso
 * - valida status
 * - valida progresso
 * - se já estiver no último step: não avança, apenas sinaliza que pode emitir mandado
 * - se avançar: atualiza current_step_order e retorna status atualizado
 */
export async function advanceCaseStep(caseId, agentId) {
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
      throw new Error("Caso já encerrado. Não é possível avançar passos.")
    }

    const [[stepsCountRow]] = await conn.query(
      "SELECT COUNT(*) AS totalSteps FROM case_steps WHERE case_id = ?",
      [caseId],
    )

    const totalSteps = stepsCountRow.totalSteps || 0

    if (totalSteps === 0) {
      throw new Error("Caso sem passos configurados.")
    }

    const [progressRows] = await conn.query(
      "SELECT * FROM case_progress WHERE case_id = ? AND agent_id = ?",
      [caseId, agentId],
    )

    let currentStepOrder = 1
    let progressId = null

    if (!progressRows || progressRows.length === 0) {
      const [progressInsert] = await conn.query(
        "INSERT INTO case_progress (case_id, agent_id, current_step_order) VALUES (?, ?, ?)",
        [caseId, agentId, 1],
      )
      progressId = progressInsert.insertId
      currentStepOrder = 1
    } else {
      const prog = progressRows[0]
      progressId = prog.id
      currentStepOrder = prog.current_step_order || 1
    }

    if (currentStepOrder >= totalSteps) {
      // já está no último step
      await conn.commit()
      const status = await getCaseInvestigationStatus(caseId, agentId)
      return {
        ...status,
        reachedEnd: true,
      }
    }

    const newOrder = currentStepOrder + 1

    await conn.query(
      "UPDATE case_progress SET current_step_order = ? WHERE id = ?",
      [newOrder, progressId],
    )

    await conn.commit()

    const status = await getCaseInvestigationStatus(caseId, agentId)

    return {
      ...status,
      reachedEnd: status.progress.current >= status.progress.total,
    }
  } catch (err) {
    await conn.rollback()
    console.error("Erro em advanceCaseStep:", err)
    throw err
  } finally {
    conn.release()
  }
}
