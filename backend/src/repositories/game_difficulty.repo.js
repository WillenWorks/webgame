import prisma from '../config/prisma.js';

export async function getGameDifficultyByCode(code) {
  const d = await prisma.gameDifficulty.findUnique({ where: { code } });
  if (!d) return null;
  return {
    code: d.code,
    max_fails_allowed: d.maxFailsAllowed,
    visits_buffer: d.visitsBuffer,
  };
}
