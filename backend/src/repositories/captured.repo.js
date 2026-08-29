import prisma from '../config/prisma.js';

export async function insertCapturedVillainLog({ id, profileId, caseId, villainName, attributesSnapshot, finalDialogue }) {
  await prisma.capturedVillainLog.create({
    data: {
      id,
      profileId,
      caseId: caseId || null,
      villainName,
      attributesSnapshot: attributesSnapshot ?? null,
      finalDialogue: finalDialogue || null,
    },
  });
}

export async function getCapturedVillains(profileId) {
  const rows = await prisma.capturedVillainLog.findMany({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => ({
    id: r.id,
    profile_id: r.profileId,
    case_id: r.caseId,
    villain_name: r.villainName,
    attributes_snapshot: r.attributesSnapshot,
    final_dialogue: r.finalDialogue,
    created_at: r.createdAt,
  }));
}
