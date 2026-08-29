import prisma from '../config/prisma.js';

/** Tabela gerenciada pelas migrations do Prisma. */
export async function initTravelLogTable() {
  /* no-op */
}

function toRow(l) {
  if (!l) return null;
  return {
    id: l.id,
    active_case_id: l.activeCaseId,
    from_city_id: l.fromCityId,
    to_city_id: l.toCityId,
    step_order: l.stepOrder,
    success: l.success,
    reason: l.reason,
    arrival_time: l.arrivalTime,
    created_at: l.createdAt,
  };
}

export async function insertTravelLog({ id, caseId, fromCityId, toCityId, stepOrder, success, reason, arrivalTime = null }) {
  await prisma.caseTravelLog.create({
    data: {
      id,
      activeCaseId: caseId,
      fromCityId: Number(fromCityId),
      toCityId: Number(toCityId),
      stepOrder: Number(stepOrder),
      success: Boolean(success),
      reason: reason || null,
      arrivalTime: arrivalTime || null,
    },
  });
}

export async function getTravelLogs(caseId) {
  const rows = await prisma.caseTravelLog.findMany({
    where: { activeCaseId: caseId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toRow);
}

export async function getLastTravelLogForStep(caseId, stepOrder) {
  return toRow(
    await prisma.caseTravelLog.findFirst({
      where: { activeCaseId: caseId, stepOrder: Number(stepOrder) },
      orderBy: { createdAt: 'desc' },
    })
  );
}

export async function getLastTravelLog(caseId) {
  return toRow(
    await prisma.caseTravelLog.findFirst({
      where: { activeCaseId: caseId },
      orderBy: { createdAt: 'desc' },
    })
  );
}

export async function updateTravelLogArrival(id) {
  await prisma.caseTravelLog.update({
    where: { id },
    data: { arrivalTime: new Date() },
  });
}

/** Erros de rota: viagens para destino errado ou falhas de percurso. */
const ROUTE_ERROR_REASONS = ['Rota incorreta', 'Falha aleatória de viagem'];

export async function countRouteErrors(caseId) {
  return prisma.caseTravelLog.count({
    where: { activeCaseId: caseId, success: false, reason: { in: ROUTE_ERROR_REASONS } },
  });
}
