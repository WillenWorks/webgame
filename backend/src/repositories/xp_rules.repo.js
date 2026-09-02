import prisma from '../config/prisma.js';

const num = (v) => (v == null ? v : Number(v));

export async function getXpRuleByDifficulty(difficulty) {
  const r = await prisma.xpRule.findFirst({
    where: { difficulty: { code: difficulty } },
  });
  if (!r) return null;
  return {
    xp_base: r.xpBase,
    bonus_time_factor: num(r.bonusTimeFactor),
    bonus_precision: r.bonusPrecision,
    debuff_failure_factor: num(r.debuffFailureFactor),
  };
}
