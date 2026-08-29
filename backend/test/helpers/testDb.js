// test/helpers/testDb.js
// Utilidades para os testes de GERAÇÃO de dados, que exigem PostgreSQL + seed.
// Se o banco não responder, os testes que dependem dele são PULADOS (não falham).

import { randomUUID } from 'crypto';
import prisma from '../../src/config/prisma.js';

export async function dbAvailable() {
  try {
    await Promise.race([
      prisma.$queryRawUnsafe('SELECT 1'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2500)),
    ]);
    const cities = await prisma.city.count();
    const places = await prisma.placeType.count();
    return cities >= 20 && places >= 5;
  } catch {
    return false;
  }
}

/**
 * Cria usuário + perfil descartáveis e gera um caso real via `createCaseService`.
 * Retorna { caseId, profileId, cleanup }.
 */
export async function createCaseForTest(difficulty = 'EASY') {
  const { createCaseService } = await import('../../src/services/case.service.js');

  const tag = randomUUID().slice(0, 8);
  const user = await prisma.user.create({
    data: { username: `t_${tag}`, email: `t_${tag}@test.local`, passwordHash: 'x' },
  });
  const profile = await prisma.profile.create({
    data: { userId: user.id, detectiveName: `Teste ${tag}` },
  });

  const caseData = await createCaseService({ profileId: profile.id, difficulty });

  const cleanup = async () => {
    try {
      await prisma.activeCase.deleteMany({ where: { profileId: profile.id } });
      await prisma.profile.delete({ where: { id: profile.id } });
      await prisma.user.delete({ where: { id: user.id } });
    } catch {
      /* melhor esforço */
    }
  };

  return { caseId: caseData.id, profileId: profile.id, difficulty, cleanup };
}

export { prisma };
