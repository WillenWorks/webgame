import app from './app.js';
import { ensureDefaultRanks } from './repositories/ranks.repo.js';

const PORT = process.env.PORT || 3333;

// Seed de ranks no startup
ensureDefaultRanks().catch(err => console.warn('seed ranks error:', String(err)));

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
