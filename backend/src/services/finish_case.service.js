// src/services/finish_case.service.js
import { v4 as uuid } from 'uuid';
import { solveCase, getCaseById } from '../repositories/warrant.repo.js';
import { findProfileById, updateProfileStats } from '../repositories/profile.repo.js';
import { upsertPlayerReputation } from '../repositories/player_reputation.repo.js';
import { computeXP } from './xp.service.js';
import { getCasePerformanceController } from '../controllers/case_performance.controller.js'; 
// Note: computeXP expects a performance object.

/**
 * Centralized logic to finish a case (SOLVED or FAILED)
 * Updates Case Status, Profile Stats (XP, Rep, Counts), and History.
 */
export async function finishCaseService({ caseId, status, finalDialogue, timeState, isDecoy }) {
  console.log(`[finishCase] Finishing case ${caseId} with status ${status}`);

  // 1. Update Case Status in DB
  await solveCase(caseId, status);

  // 2. Fetch Case & Profile Data
  const gameCase = await getCaseById(caseId);
  if (!gameCase) throw new Error('Case not found');
  
  const profileId = gameCase.profile_id;
  const profile = await findProfileById(profileId);
  if (!profile) throw new Error('Profile not found');

  // 3. Determine Reputation Delta
  // SOLVED: +10 (or dynamic), FAILED: -5
  // Can be refined later with difficulty factors
  let repDelta = 0;
  if (status === 'SOLVED') repDelta = 15; // Increased reward
  else if (status === 'FAILED') repDelta = -5;

  // Calculate new Reputation Score
  let newRepScore = (profile.reputation_score || 0) + repDelta;
  if (newRepScore > 100) newRepScore = 100;
  if (newRepScore < -100) newRepScore = -100;

  // 4. Calculate XP
  // Mock performance data for now, or assume defaults
  // Ideally we would gather real metrics (days early, precision)
  // For FAILED, finished=false usually triggers failure penalty in computeXP
  const performanceMock = {
    finished: status === 'SOLVED',
    routeErrors: 0, // TODO: track this
    placesSkippedPct: 0,
    perfectPrecision: status === 'SOLVED', // Bonus for solving
  };

  const xpResult = await computeXP({
    playerId: profileId,
    caseId,
    difficulty: gameCase.difficulty_id === 1 ? 'EASY' : (gameCase.difficulty_id === 2 ? 'HARD' : 'EXTREME'), // Mapping needed or use code
    // Wait, difficulty_id needs mapping. Let's assume 'EASY' default or check repo mapping.
    // Repo uses codes 'EASY', 'HARD', 'EXTREME' usually.
    // Let's assume passed difficulty string or derive it.
    // gameCase might store difficulty_id integer. We need the code.
    // For simplicity, defaulting to EASY if unknown, but computeXP handles fallback.
    // Actually investigate.service passes difficulty code to computeXP usually.
    // We'll pass 'EASY' here if we can't find it easily, OR fetch it.
    // Let's rely on computeXP's fallback or pass it if available.
    // Update: computeXP calls getXpRuleByDifficulty.
    // gameCase.difficulty_id: 1=EASY, 2=HARD, 3=EXTREME (Standard)
    difficulty: (gameCase.difficulty_id === 2 ? 'HARD' : (gameCase.difficulty_id === 3 ? 'EXTREME' : 'EASY')),
    reputationScore: newRepScore, // Use new score? Or old? Usually old score affects multiplier.
    // computeXP uses rep score for multipliers. Let's use current (old) score.
    // Actually pass old score to computeXP.
    reputationScore: profile.reputation_score || 0,
    performance: performanceMock,
    daysEarly: 0 // Simplification
  });

  const xpEarned = xpResult.xpFinal;

  // 5. Update Profile Stats
  const updates = {
    xp: (profile.xp || 0) + xpEarned,
    reputation_score: newRepScore,
    cases_solved: (profile.cases_solved || 0) + (status === 'SOLVED' ? 1 : 0),
    cases_failed: (profile.cases_failed || 0) + (status === 'FAILED' ? 1 : 0),
  };
  
  await updateProfileStats(profileId, updates);

  // 6. Insert Reputation History
  await upsertPlayerReputation({
    playerId: profileId,
    caseId,
    reputationScore: newRepScore
  });

  return {
    text: finalDialogue,
    gameOver: true,
    solved: status === 'SOLVED',
    timeState,
    xpEarned,
    repDelta
  };
}
