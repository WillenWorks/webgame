#!/usr/bin/env node
/**
 * Roda o runner E2E nas três dificuldades em sequência.
 * Sai com código ≠ 0 se qualquer uma falhar.
 *
 *   npm run e2e:all
 *   npm run e2e:all -- --base http://localhost:3333
 */
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runner = path.join(__dirname, 'runner.js');
const passthru = process.argv.slice(2);
const stamp = Date.now().toString(36);

let failed = 0;
for (const diff of ['EASY', 'HARD', 'EXTREME']) {
  const args = [
    runner,
    '--user', `e2e_${diff.toLowerCase()}_${stamp}`,
    '--pass', 'secret123',
    '--profile', `E2E ${diff} ${stamp}`,
    '--difficulty', diff,
    ...passthru,
  ];
  const res = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (res.status !== 0) failed++;
}

process.exit(failed === 0 ? 0 : 1);
