import app from './app.js';
import { ensureDefaultRanks } from './repositories/ranks.repo.js';
import { runMigrations } from './services/migration.service.js';

const PORT = process.env.PORT || 3333;

async function startup() {
  try {
    await runMigrations();
  } catch (e) {
    console.warn('Migration error:', e);
  }

  try {
    await ensureDefaultRanks();
  } catch (err) {
    console.warn('seed ranks error:', String(err));
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startup();
