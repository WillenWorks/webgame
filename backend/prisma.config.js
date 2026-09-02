import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Substitui a chave `prisma` do package.json (deprecada, removida no Prisma 7).
// Prisma com config file NÃO auto-carrega .env — daí o `dotenv/config` acima.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
});
