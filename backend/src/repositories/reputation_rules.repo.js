import prisma from '../config/prisma.js';

const num = (v) => (v == null ? v : Number(v));

export async function getReputationMultipliers(reputationScore) {
  const r = await prisma.reputationRule.findFirst({
    where: {
      minRep: { lte: reputationScore },
      maxRep: { gte: reputationScore },
    },
  });
  if (!r) return { debuff_base_factor: 1.0, bonus_multiplier: 1.0 };
  return {
    debuff_base_factor: num(r.debuffBaseFactor),
    bonus_multiplier: num(r.bonusMultiplier),
  };
}
