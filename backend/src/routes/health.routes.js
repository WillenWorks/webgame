import { Router } from 'express';
import prisma from '../config/prisma.js';

const router = Router();
const startedAt = Date.now();

/**
 * GET /ping — liveness. Não toca no banco. Sempre 200 se o processo está de pé.
 */
router.get('/ping', (req, res) => {
  res.json({
    ok: true,
    pong: true,
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health — readiness. Verifica conectividade com o PostgreSQL via Prisma.
 * 200 quando tudo ok; 503 quando o banco está indisponível.
 */
router.get('/health', async (req, res) => {
  const health = {
    ok: true,
    service: 'operacao-mundo-api',
    uptimeSeconds: Math.round(process.uptime()),
    bootedAt: new Date(startedAt).toISOString(),
    timestamp: new Date().toISOString(),
    checks: {},
  };

  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = {
      ok: true,
      engine: 'postgresql',
      latencyMs: Date.now() - t0,
    };
  } catch (err) {
    health.ok = false;
    health.checks.database = {
      ok: false,
      engine: 'postgresql',
      latencyMs: Date.now() - t0,
      error: err?.message || String(err),
    };
  }

  res.status(health.ok ? 200 : 503).json(health);
});

export default router;
