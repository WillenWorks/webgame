// Semeia o backend (registro → login → perfil → caso ativo) e devolve os
// tokens + caseId para os testes visuais preencherem as telas gated.
//
// O caso é FIXADO em `tests/e2e/.seed.json` (gitignored) e reusado entre
// execuções — sem isso, cada run geraria um caso novo com briefing/cidade/
// suspeitos diferentes e a comparação de screenshot não teria sentido.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const API = process.env.QA_API_BASE || 'http://localhost:3333';
const SEED_FILE = fileURLToPath(new URL('./.seed.json', import.meta.url));

async function http(method: string, path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(txt);
  } catch {
    /* corpo não-JSON */
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${method} ${path} :: ${json?.error?.message || txt.slice(0, 200)}`);
  }
  return json ?? {};
}

export interface SeedResult {
  accessToken: string;
  refreshToken: string;
  caseId: string;
  detectiveName: string;
}

export async function seedGame(): Promise<SeedResult> {
  await http('GET', '/health');

  const pinned = existsSync(SEED_FILE)
    ? (JSON.parse(readFileSync(SEED_FILE, 'utf8')) as Partial<SeedResult> & { username?: string; password?: string })
    : null;

  const user = pinned?.username || `qa_visual_${Date.now().toString(36)}`;
  const pass = pinned?.password || 'secret123';
  const detectiveName = pinned?.detectiveName || `QA Visual ${user}`;

  try {
    await http('POST', '/api/v1/auth/register', { username: user, password: pass, email: `${user}@local.test` });
  } catch {
    /* já existe */
  }
  const login = await http('POST', '/api/v1/auth/login', { username: user, password: pass });
  const accessToken: string = login.accessToken;
  const refreshToken: string = login.refreshToken;
  if (!accessToken) throw new Error('login não retornou accessToken');

  try {
    await http('POST', '/api/v1/profiles', { detective_name: detectiveName }, accessToken);
  } catch {
    /* perfil já existe */
  }

  // Reusa o caso fixado se ainda estiver ativo; senão cria um e fixa.
  let caseId: string | undefined;
  const active = await http('GET', '/api/v1/cases/active', null, accessToken).catch(() => ({}));
  if (active?.case?.status === 'ACTIVE') {
    caseId = active.case.id;
  } else {
    const created = await http('POST', '/api/v1/cases', { difficulty: 'EASY' }, accessToken);
    caseId = created.case?.id;
  }
  if (!caseId) throw new Error('não consegui obter um caso ativo');

  const result: SeedResult = { accessToken, refreshToken, caseId, detectiveName };
  if (!pinned || pinned.caseId !== caseId) {
    writeFileSync(SEED_FILE, JSON.stringify({ username: user, password: pass, detectiveName, caseId }, null, 2));
  }
  return result;
}
