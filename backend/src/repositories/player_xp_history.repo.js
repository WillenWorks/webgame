import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

export async function insertXpHistory({ playerId, caseId, xpAwarded, breakdown }) {
  await prisma.playerXpHistory.create({
    data: {
      id: randomUUID(),
      profileId: playerId,
      caseId,
      xpAwarded,
      breakdownJson: breakdown || {},
    },
  });
  return true;
}
