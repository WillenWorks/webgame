import prisma from '../config/prisma.js';

const num = (v) => (v == null ? v : Number(v));

function toRank(r) {
  if (!r) return null;
  return {
    id: r.id,
    title: r.title,
    min_xp: num(r.minXp),
    max_xp: num(r.maxXp),
    mission_select_unlocked: r.missionSelectUnlocked,
    difficulty_modifier: num(r.difficultyModifier),
  };
}

export async function getAllRanks() {
  const rows = await prisma.rank.findMany({ orderBy: { id: 'asc' } });
  return rows.map(toRank);
}

export async function getNextRank(currentRankId) {
  if (currentRankId == null) return null;
  return toRank(
    await prisma.rank.findUnique({ where: { id: Number(currentRankId) + 1 } })
  );
}

export async function getRankByXp(xp) {
  const rows = await prisma.rank.findMany({ orderBy: { minXp: 'asc' } });
  let chosen = rows[0];
  for (const r of rows) {
    if (xp >= r.minXp) chosen = r;
    else break;
  }
  return toRank(chosen);
}

/**
 * Patentes são semeadas por `prisma db seed`. Mantida por compatibilidade
 * com o startup e com o profile.service.
 */
export async function ensureDefaultRanks() {
  /* no-op: patentes gerenciadas pelo seed do Prisma */
}
