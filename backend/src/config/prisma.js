// Singleton do Prisma Client.
// Em desenvolvimento (com hot-reload do nodemon) evitamos abrir várias conexões
// reaproveitando a instância pendurada em globalThis.

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma 7: a URL saiu do schema e o adapter lê process.env no load deste
// módulo — garante o .env antes de qualquer import de repositório/teste.
const isDev = process.env.NODE_ENV !== 'production';

const globalForPrisma = globalThis;

// Prisma 7 exige um driver adapter no construtor do client.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const prisma =
  globalForPrisma.__operacaoMundoPrisma ??
  new PrismaClient({
    adapter,
    log: isDev ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });

if (isDev) {
  globalForPrisma.__operacaoMundoPrisma = prisma;
}

export default prisma;
