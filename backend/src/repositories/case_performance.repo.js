// src/repositories/case_performance.repo.js
import pool from '../config/database.js';

export async function insertCasePerformance({ id, caseId, playerId, difficultyId, visitsCount = 0, routeErrors = 0, finishedEarlierMinutes = 0, perfectPrecision = false, xpAwarded = 0, reputationDelta = 0 }) {
  const sql = `
    INSERT INTO case_performance (
      id,
      case_id,
      profile_id,
      difficulty_code,
      visits_count,
      route_errors,
      finished_earlier_minutes,
      perfect_precision,
      xp_awarded,
      reputation_delta
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [
    id,
    caseId,
    playerId,
    difficultyId, // INT conforme schema (difficulty_code INT)
    visitsCount,
    routeErrors,
    finishedEarlierMinutes,
    perfectPrecision ? 1 : 0,
    xpAwarded,
    reputationDelta
  ]);
}

export async function getCasePerformanceByCaseId(caseId) {
  const sql = `
    SELECT cp.*, gd.code AS difficulty
    FROM case_performance cp
    LEFT JOIN active_cases ac ON ac.id = cp.case_id
    LEFT JOIN game_difficulty gd ON gd.id = ac.difficulty_id
    WHERE cp.case_id = ?
    ORDER BY cp.created_at DESC
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows[0] || null;
}
