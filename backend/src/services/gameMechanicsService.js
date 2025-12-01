// src/services/gameMechanicsService.js
import { getDbPool } from "../database/database.js"

const pool = getDbPool()

/**
 * Retorna número de turnos máximos sugeridos pela dificuldade.
 * Se o case tiver max_turns definido, esse valor é priorizado.
 */
export function getMaxTurnsForDifficulty(difficulty) {
  switch (difficulty) {
    case "hard":
      return 5
    case "medium":
      return 6
    case "easy":
    default:
      return 8
  }
}

/**
 * Calcula pontuação e impacto em reputação com base no desempenho:
 *  - base por dificuldade
 *  - bônus por tempo (menos turnos usados)
 *  - penalidade por viagens erradas (wrong_travels)
 *  - penalidade por mandados errados (wrong_warrants)
 *  - bônus leve de eficiência
 */
export function computeScoreAndReputationImpact({
  difficulty,
  maxTurns,
  turnsUsed,
  wrongTravels,
  wrongWarrants,
  result,
}) {
  const baseByDifficulty = {
    easy: 100,
    medium: 200,
    hard: 300,
  }

  const base = baseByDifficulty[difficulty] ?? 100
  const safeTurnsUsed = Number.isFinite(turnsUsed) ? turnsUsed : 0
  const safeWrongTravels = Number.isFinite(wrongTravels) ? wrongTravels : 0
  const safeWrongWarrants = Number.isFinite(wrongWarrants)
    ? wrongWarrants
    : 0
  const safeMaxTurns = Number.isFinite(maxTurns) ? maxTurns : 0

  const tempoBonus = Math.max(0, safeMaxTurns - safeTurnsUsed) * 10
  const penaltyWrongTravel = safeWrongTravels * 15
  const penaltyWrongWarrant = safeWrongWarrants * 50
  const efficiencyBonus = Math.max(0, 3 - safeWrongTravels) * 5

  let rawScore =
    base + tempoBonus + efficiencyBonus - penaltyWrongTravel - penaltyWrongWarrant

  const minScore = result === "solved" ? 10 : 0
  if (!Number.isFinite(rawScore)) rawScore = minScore

  const score = Math.max(rawScore, minScore)

  // Impacto em reputação – mais leve que o XP
  let reputationDelta = 0

  if (result === "solved") {
    reputationDelta += 3
    if (safeWrongTravels === 0) reputationDelta += 2
    if (safeWrongWarrants === 0) reputationDelta += 2
  } else if (result === "failed_time") {
    reputationDelta -= 5
  } else if (result === "failed_wrong_suspect") {
    reputationDelta -= 7
  }

  return { score, reputationDelta }
}

/**
 * Aplica o resultado final de um caso:
 *  - grava status + score em `cases`
 *  - atualiza `result` em `case_progress`
 *  - atualiza XP, reputação, solved/failed em `agents`
 *  - recalcula posição (rank) do agente
 *
 * @param {Object} params
 * @param {number} params.caseId
 * @param {number} params.agentId
 * @param {"solved"|"failed_time"|"failed_wrong_suspect"} params.result
 */
export async function applyCaseResult({ caseId, agentId, result }) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 1) Carrega o case e bloqueia linha pra update
    const [[caseRow]] = await conn.query(
      `
      SELECT id, difficulty, max_turns
      FROM cases
      WHERE id = ?
      FOR UPDATE
      `,
      [caseId],
    )

    if (!caseRow) {
      throw new Error("Case não encontrado para aplicação de resultado.")
    }

    // 2) Carrega progresso do case para esse agente
    const [[progressRow]] = await conn.query(
      `
      SELECT id, turns_used, wrong_travels, wrong_warrants
      FROM case_progress
      WHERE case_id = ? AND agent_id = ?
      FOR UPDATE
      `,
      [caseId, agentId],
    )

    if (!progressRow) {
      throw new Error("Progresso do caso não encontrado para este agente.")
    }

    const difficulty = caseRow.difficulty || "easy"
    const maxTurns =
      caseRow.max_turns || getMaxTurnsForDifficulty(difficulty)

    const { score, reputationDelta } = computeScoreAndReputationImpact({
      difficulty,
      maxTurns,
      turnsUsed: progressRow.turns_used,
      wrongTravels: progressRow.wrong_travels,
      wrongWarrants: progressRow.wrong_warrants,
      result,
    })

    // 3) Atualiza o case em si
    await conn.query(
      `
      UPDATE cases
      SET status = ?, score_earned = ?, closed_at = NOW()
      WHERE id = ?
      `,
      [result === "solved" ? "solved" : "failed", score, caseId],
    )

    // 4) Atualiza o case_progress
    await conn.query(
      `
      UPDATE case_progress
      SET result = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [result, progressRow.id],
    )

    // 5) Atualiza o agente (XP, reputação, counters, posição)
    const [[agentRow]] = await conn.query(
      `
      SELECT id, xp, reputation, solved_cases, failed_cases
      FROM agents
      WHERE id = ?
      FOR UPDATE
      `,
      [agentId],
    )

    if (!agentRow) {
      throw new Error("Agente não encontrado.")
    }

    const currentXp = agentRow.xp ?? 0
    const currentReputation = agentRow.reputation ?? 50
    const currentSolved = agentRow.solved_cases ?? 0
    const currentFailed = agentRow.failed_cases ?? 0

    const newXp = currentXp + score
    let newReputation = currentReputation + reputationDelta
    newReputation = Math.max(0, Math.min(100, newReputation))

    const newSolved =
      currentSolved + (result === "solved" ? 1 : 0)
    const newFailed =
      currentFailed + (result === "solved" ? 0 : 1)

    const newPosition = determineAgentPositionByXp(newXp)

    await conn.query(
      `
      UPDATE agents
      SET xp = ?, reputation = ?, solved_cases = ?, failed_cases = ?, position = ?
      WHERE id = ?
      `,
      [newXp, newReputation, newSolved, newFailed, newPosition, agentId],
    )

    await conn.commit()

    return {
      score,
      reputationDelta,
      newXp,
      newReputation,
      newPosition,
      result,
    }
  } catch (err) {
    await conn.rollback()
    console.error("Erro em applyCaseResult:", err)
    throw err
  } finally {
    conn.release()
  }
}

/**
 * Regra de promoção por XP:
 *
 * 0–299      => trainee
 * 300–799    => field_agent
 * 800–1599   => senior_agent
 * 1600–2499  => inspector
 * 2500+      => chief
 */
export function determineAgentPositionByXp(xp) {
  if (xp >= 2500) return "chief"
  if (xp >= 1600) return "inspector"
  if (xp >= 800) return "senior_agent"
  if (xp >= 300) return "field_agent"
  return "trainee"
}
