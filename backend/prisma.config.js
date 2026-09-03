import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Substitui a chave `prisma` do package.json (deprecada, removida no Prisma 7).
// Prisma com config file NÃO auto-carrega .env — daí o `dotenv/config` acima.
// No Prisma 7 a URL de conexão saiu do schema.prisma e vive aqui (usada pela
// CLI em migrate/db); o runtime (PrismaClient) usa o driver adapter @prisma/adapter-pg.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
