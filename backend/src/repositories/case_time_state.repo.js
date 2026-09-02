import prisma from '../config/prisma.js';

function toRow(s) {
  if (!s) return null;
  return {
    case_id: s.caseId,
    start_time: s.startTime,
    deadline_time: s.deadlineTime,
    current_time: s.currentTime,
    timezone: s.timezone,
  };
}

export async function getCaseTimeState(caseId) {
  return toRow(await prisma.caseTimeState.findUnique({ where: { caseId } }));
}

export async function upsertCaseTimeState({ caseId, startTime, deadlineTime, currentTime, timezone }) {
  // Cenário A: inicialização completa
  if (startTime && deadlineTime && currentTime) {
    await prisma.caseTimeState.upsert({
      where: { caseId },
      create: {
        caseId,
        startTime,
        deadlineTime,
        currentTime,
        timezone: timezone ?? 'UTC',
      },
      update: {
        startTime,
        deadlineTime,
        currentTime,
        timezone: timezone ?? 'UTC',
      },
    });
    return true;
  }

  // Cenário B: atualização parcial — só os campos fornecidos, sem inserir linha nova
  const data = {};
  if (currentTime) data.currentTime = currentTime;
  if (timezone) data.timezone = timezone;
  if (startTime) data.startTime = startTime;
  if (deadlineTime) data.deadlineTime = deadlineTime;

  if (Object.keys(data).length === 0) return false;

  const result = await prisma.caseTimeState.updateMany({ where: { caseId }, data });
  return result.count > 0;
}
