import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

const num = (v) => (v == null ? v : Number(v));

// Perfil "cru" (equivalente a SELECT p.* [+ r.title as rank_title])
function toProfileRow(p) {
  if (!p) return null;
  const row = {
    id: p.id,
    user_id: p.userId,
    detective_name: p.detectiveName,
    rank_id: p.rankId,
    xp: p.xp,
    reputation_score: p.reputationScore,
    cases_solved: p.casesSolved,
    cases_failed: p.casesFailed,
    created_at: p.createdAt,
  };
  if (p.rank !== undefined) {
    row.rank_title = p.rank?.title ?? null;
    row.rank_min_xp = p.rank ? num(p.rank.minXp) : null;
    row.rank_max_xp = p.rank ? num(p.rank.maxXp) : null;
  }
  return row;
}

export async function createProfile({ id, userId, detectiveName }) {
  try {
    await prisma.profile.create({
      data: { id: id || randomUUID(), userId, detectiveName },
    });
  } catch (err) {
    if (err && err.code === 'P2002') {
      return toProfileRow(
        await prisma.profile.findUnique({ where: { detectiveName } })
      );
    }
    throw err;
  }
}

export async function findProfilesByUser(userId) {
  const rows = await prisma.profile.findMany({
    where: { userId },
    include: { rank: true },
    orderBy: { createdAt: 'asc' },
  });
  return rows.map((p) => ({
    id: p.id,
    detective_name: p.detectiveName,
    rank_id: p.rankId,
    xp: p.xp,
    reputation_score: p.reputationScore,
    cases_solved: p.casesSolved,
    cases_failed: p.casesFailed,
    rank_title: p.rank?.title ?? null,
    rank_min_xp: p.rank ? num(p.rank.minXp) : null,
    rank_max_xp: p.rank ? num(p.rank.maxXp) : null,
  }));
}

export async function findProfileById(profileId) {
  return toProfileRow(
    await prisma.profile.findUnique({
      where: { id: profileId },
      include: { rank: true },
    })
  );
}

export async function updateProfileStats(profileId, data) {
  const { xp, reputation_score, cases_solved, cases_failed } = data;
  await prisma.profile.update({
    where: { id: profileId },
    data: {
      xp,
      reputationScore: reputation_score,
      casesSolved: cases_solved,
      casesFailed: cases_failed,
    },
  });
}

export async function getProfileByUserId(userId) {
  const p = await prisma.profile.findFirst({
    where: { userId },
    include: { rank: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!p) return undefined;
  return {
    id: p.id,
    detective_name: p.detectiveName,
    user_id: p.userId,
    rank_id: p.rankId,
    xp: p.xp,
    reputation_score: p.reputationScore,
    cases_solved: p.casesSolved,
    cases_failed: p.casesFailed,
    created_at: p.createdAt,
    rank_title: p.rank?.title ?? null,
    rank_min_xp: p.rank ? num(p.rank.minXp) : null,
  };
}

export async function updateProfileName(profileId, detectiveName) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { detectiveName },
  });
}

export async function findProfileByName(detectiveName) {
  return toProfileRow(
    await prisma.profile.findUnique({ where: { detectiveName } })
  );
}

export async function updateProfileRank(profileId, rankId) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { rankId },
  });
}

export async function getProfileCaseCounters(profileId) {
  const [solved, failed] = await Promise.all([
    prisma.activeCase.count({ where: { profileId, status: 'SOLVED' } }),
    prisma.activeCase.count({ where: { profileId, status: 'FAILED' } }),
  ]);
  return { solved, failed, total: solved + failed };
}

export async function updateProfileCaseCounters(profileId, solved, failed) {
  await prisma.profile.update({
    where: { id: profileId },
    data: { casesSolved: solved, casesFailed: failed },
  });
}
