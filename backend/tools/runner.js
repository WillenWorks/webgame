#!/usr/bin/env node
/**
 * Runner E2E — Operação Mundo
 *
 * Simula uma partida completa via HTTP e valida o estado final no PostgreSQL.
 * A "verdade" (rota real, atributos do culpado) é lida direto do banco via
 * Prisma — nunca via API — apenas para dirigir o roteiro de teste.
 *
 *   node tools/runner.js --user "agente.x" --pass secret123 --difficulty EASY
 *   npm run e2e:all      # EASY + HARD + EXTREME em sequência
 *
 * Sem catch silencioso: qualquer passo inesperado aborta com exit ≠ 0.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}
const BASE = arg('base', 'http://localhost:3333');
const USER = arg('user');
const PASS = arg('pass');
const PROFILE = arg('profile', `Agente ${arg('difficulty', 'EASY')} ${Date.now().toString(36)}`);
const DIFF = (arg('difficulty', 'EASY') || 'EASY').toUpperCase();

if (!USER || !PASS) {
  console.error('Erro: informe --user e --pass');
  process.exit(1);
}

const prisma = new PrismaClient();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

async function http(method, pathUrl, body, token) {
  const headers = { 'Content-Type': 'application/json', 'X-Debug': '1' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathUrl}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json = null;
  try { json = JSON.parse(txt); } catch { /* corpo não-JSON */ }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${method} ${pathUrl} :: ${json?.error?.message || txt?.slice(0, 200)}`);
  }
  return json ?? {};
}

function assert(cond, msg) {
  if (!cond) throw new Error(`ASSERT FALHOU: ${msg}`);
}
const DEBUG = process.env.RUNNER_DEBUG === '1';
const dbg = (...a) => { if (DEBUG) console.error('[dbg]', ...a); };

// ── Leituras de verdade (Prisma) ───────────────────────────────────────────
async function readRoute(caseId) {
  const rows = await prisma.caseRoute.findMany({
    where: { activeCaseId: caseId },
    orderBy: { stepOrder: 'asc' },
    include: { city: { include: { country: true } } },
  });
  return rows.map((r) => ({ step: r.stepOrder, cityId: r.cityId, name: r.city.name, country: r.city.country.name }));
}
async function readCulprit(caseId) {
  const s = await prisma.caseSuspect.findFirst({ where: { caseId, isCulprit: true } });
  return s;
}
async function readCase(caseId) {
  return prisma.activeCase.findUnique({ where: { id: caseId }, select: { status: true, warrantSuspectId: true } });
}
async function readXp(caseId) {
  return prisma.playerXpHistory.findMany({ where: { caseId }, select: { xpAwarded: true, breakdownJson: true } });
}
async function readPerformance(caseId) {
  return prisma.casePerformance.findFirst({ where: { caseId } });
}

async function timeState(caseId, token) {
  const info = await http('GET', `/api/v1/cases/${caseId}`, null, token);
  return info?.timeState || null;
}
const minutesOf = (ts) => (ts?.current_time ? new Date(ts.current_time).getTime() : 0);

async function travelWithRetry(caseId, cityId, token, maxTries = 6) {
  for (let i = 0; i < maxTries; i++) {
    const r = await http('POST', `/api/v1/cases/${caseId}/travel`, { cityId }, token);
    if (r.gameOver) return r;
    if (r.success) return r;
    const msg = String(r.message || '');
    if (/imprevistos|falhou por/i.test(msg)) { await sleep(120); continue; } // falha transitória → repete o mesmo destino
    throw new Error(`Viagem para ${cityId} recusada: ${msg}`);
  }
  throw new Error(`Viagem para ${cityId} não concluiu após ${maxTries} tentativas`);
}

async function main() {
  const report = { difficulty: DIFF, startedAt: nowIso(), checks: [] };
  const ok = (name) => report.checks.push({ name, ok: true });

  // 0. Health
  const health = await http('GET', '/health');
  assert(health.ok, '/health ok');
  ok('health');

  // 1. Auth
  try { await http('POST', '/api/v1/auth/register', { username: USER, password: PASS, email: `${USER}@local.test` }); } catch { /* já existe */ }
  const login = await http('POST', '/api/v1/auth/login', { username: USER, password: PASS });
  const token = login.accessToken;
  assert(token, 'login retornou accessToken');
  ok('auth');

  // 2. Perfil
  let profileId;
  try {
    const created = await http('POST', '/api/v1/profiles', { detective_name: PROFILE }, token);
    profileId = created.profile?.id;
  } catch {
    const list = await http('GET', '/api/v1/profiles', null, token);
    profileId = list.profiles?.[0]?.id;
  }
  assert(profileId, 'perfil disponível');
  ok('profile');

  // 3. Caso
  const active = await http('GET', '/api/v1/cases/active', null, token).catch(() => ({}));
  let caseId;
  if (active?.case?.status === 'ACTIVE') {
    caseId = active.case.id;
  } else {
    const created = await http('POST', '/api/v1/cases', { difficulty: DIFF }, token);
    caseId = created.case?.id;
    assert(created.case?.time_limit_hours > 0, 'caso tem time_limit_hours real');
  }
  assert(caseId, 'caso criado');
  report.caseId = caseId;
  ok('case-created');

  // 4. Verdade
  const route = await readRoute(caseId);
  assert(route.length >= 2, `rota com ${route.length} passos`);
  const culprit = await readCulprit(caseId);
  assert(culprit, 'culpado existe');
  ok('truth-loaded');

  // 5. Percorrer a rota — jogo eficiente: todas as pistas de destino + só as
  //    pistas do vilão necessárias (há 5 atributos no total).
  let revealedTotal = 0;
  let villainBudget = 5;
  for (let i = 0; i < route.length - 1; i++) {
    const visit = await http('GET', `/api/v1/cases/${caseId}/visit-current`, null, token);
    assert(visit.city?.city_id === route[i].cityId, `cidade atual = ${route[i].name} (passo ${i + 1})`);

    const before = await timeState(caseId, token);
    dbg(`passo ${i + 1} @ ${route[i].name} | current=${before?.current_time} deadline=${before?.deadline_time} daysEarly=${before?.daysEarly}`);
    let sawNextLocation = false;
    for (const p of visit.places || []) {
      if (p.clueType === 'VILLAIN' && villainBudget <= 0) continue; // dossiê já fechado
      const inv = await http('POST', `/api/v1/cases/${caseId}/investigate`, { placeId: p.id }, token);
      assert(inv.ok !== false, `investigar ${p.name} respondeu ok`);
      if (inv.gameOver) throw new Error(`gameOver inesperado ao investigar no passo ${i + 1}: ${inv.text}`);
      if (inv.clueType === 'NEXT_LOCATION') {
        sawNextLocation = true;
        assert(typeof inv.text === 'string' && inv.text.length > 15, 'pista de próximo destino tem texto');
      }
      if (inv.clueType === 'VILLAIN_ATTRIBUTE') villainBudget--;
    }
    const after = await timeState(caseId, token);
    assert(minutesOf(after) > minutesOf(before), `relógio avançou ao investigar (passo ${i + 1})`);
    assert(sawNextLocation, `passo ${i + 1} revelou ao menos uma pista de próximo destino`);

    const revealed = await http('GET', `/api/v1/cases/${caseId}/clues/revealed`, null, token).catch(() => ({}));
    if (Array.isArray(revealed.clues)) {
      assert(revealed.clues.length > revealedTotal, 'contador de pistas reveladas subiu');
      revealedTotal = revealed.clues.length;
    }

    // Viagem para o próximo passo (com retry em falha transitória).
    const beforeTravel = await timeState(caseId, token);
    const r = await travelWithRetry(caseId, route[i + 1].cityId, token);
    if (r.gameOver) throw new Error(`gameOver durante viagem no passo ${i + 1}: ${r.text || r.message}`);
    const afterTravel = await http('GET', `/api/v1/cases/${caseId}/visit-current`, null, token); // dispara consumo do tempo de viagem
    void afterTravel;
    const afterTravelTs = await timeState(caseId, token);
    assert(minutesOf(afterTravelTs) > minutesOf(beforeTravel), `relógio avançou ao viajar (passo ${i + 1})`);
  }
  ok('route-traversed');

  // 6. Cidade final: mandado + captura
  const finalVisit = await http('GET', `/api/v1/cases/${caseId}/visit-current`, null, token);
  assert(finalVisit.city?.city_id === route[route.length - 1].cityId, 'chegou na cidade final');

  // Mandado para o culpado (o front chegaria aqui via dossiê).
  const warrant = await http('POST', `/api/v1/cases/${caseId}/warrant`, { suspectId: culprit.id }, token);
  assert(warrant.ok, 'mandado emitido');
  ok('warrant');

  // Encontrar e investigar o ponto de captura.
  const capturePlace = await prisma.caseCityPlace.findFirst({
    where: { caseId, cityId: route[route.length - 1].cityId, isCaptureLocation: true },
  });
  assert(capturePlace, 'ponto de captura existe na cidade final');

  // Com o mandado em mãos, o jogo ótimo vai direto ao ponto de captura.
  const capture = await http('POST', `/api/v1/cases/${caseId}/investigate`, { placeId: capturePlace.id }, token);
  assert(capture.gameOver, 'investigar o ponto de captura encerra o caso');
  assert(capture.solved, `caso resolvido (${capture.text})`);
  ok('capture');

  // 7. Consolidação no banco
  const dbCase = await readCase(caseId);
  assert(dbCase.status === 'SOLVED', `status final SOLVED (obtido ${dbCase.status})`);
  assert(dbCase.warrantSuspectId === culprit.id, 'mandado registrado para o culpado');

  const xp = await readXp(caseId);
  assert(xp.length === 1, `exatamente 1 registro de XP (obtido ${xp.length})`);
  const bd = xp[0].breakdownJson || {};
  assert(xp[0].xpAwarded > 0, 'XP concedido > 0');
  assert(typeof bd.bonusDays === 'number', 'breakdown tem bonusDays');
  const ts = await timeState(caseId, token);
  if ((ts?.daysEarly || 0) > 0) assert(bd.bonusDays > 0, 'bônus de dias adiantados aplicado quando daysEarly > 0');
  ok('xp');

  const perf = await readPerformance(caseId);
  assert(perf, 'linha em case_performance gravada');
  assert(perf.xpAwarded === xp[0].xpAwarded, 'case_performance.xpAwarded coerente com o histórico');
  assert(perf.perfectPrecision === (perf.routeErrors === 0), 'perfectPrecision coerente com routeErrors');
  ok('performance');

  report.verdict = { pass: true, checks: report.checks.length };
  report.finishedAt = nowIso();
  saveReport(report, caseId);
  console.log(`\n✅ [${DIFF}] E2E OK — ${report.checks.length} verificações\n${JSON.stringify({ xp: xp[0].xpAwarded, breakdown: bd, daysEarly: ts?.daysEarly, routeErrors: perf.routeErrors }, null, 2)}`);
}

function saveReport(report, caseId) {
  try {
    const out = path.join(process.cwd(), `runner_report_${caseId || 'error'}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
  } catch { /* melhor esforço */ }
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (err) => {
    console.error(`\n❌ [${DIFF}] E2E FALHOU:`, err.message);
    saveReport({ difficulty: DIFF, error: err.message, stack: err.stack }, 'error');
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
