import { randomUUID } from 'crypto';
import prisma from '../config/prisma.js';

const int = (v) => (v == null ? v : Number(v));

/** Tabela gerenciada pelas migrations do Prisma. */
export async function initCurrentViewTable() {
  /* no-op */
}

export async function setCurrentView(caseId, cityId, stepOrder) {
  const existing = await prisma.caseCurrentView.findFirst({
    where: { caseId, stepOrder: int(stepOrder) },
  });
  if (existing) {
    await prisma.caseCurrentView.update({
      where: { id: existing.id },
      data: { cityId: int(cityId) },
    });
    return existing.id;
  }
  const id = randomUUID();
  await prisma.caseCurrentView.create({
    data: { id, caseId, cityId: int(cityId), stepOrder: int(stepOrder) },
  });
  return id;
}

export async function getCurrentView(caseId, stepOrder) {
  const row = await prisma.caseCurrentView.findFirst({
    where: { caseId, stepOrder: int(stepOrder) },
  });
  if (!row) return null;
  return { city_id: row.cityId, step_order: row.stepOrder };
}

export async function clearCurrentViewForCase(caseId) {
  await prisma.caseCurrentView.deleteMany({ where: { caseId } });
}
