// Singleton do Prisma Client.
// Em desenvolvimento (com hot-reload do nodemon) evitamos abrir várias conexões
// reaproveitando a instância pendurada em globalThis.

import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__operacaoMundoPrisma ??
  new PrismaClient({
    log: isDev ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (isDev) {
  globalForPrisma.__operacaoMundoPrisma = prisma;
}

export default prisma;
