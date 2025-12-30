#!/usr/bin/env node
/**
 * Runner E2E – Operação Mônaco (MVP)
 * Executa fluxo automático via HTTP: Auth -> Perfil -> Caso -> (visit/investigate/travel) por step -> Warrant antes do último step
 * Consulta XP final e gera relatório detalhado passo-a-passo.
 *
 * Uso:
 *   node tools/runner.js --base http://localhost:3333 --user "agente.nelliw" --pass secret123 --profile "Agente Nelliw" --difficulty EASY
 */
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : def;
}
const BASE = arg("base", "http://localhost:3333");
const USER = arg("user");
const PASS = arg("pass");
const PROFILE = arg("profile", "Agente Nelliw");
const DIFF = (arg("difficulty", "EASY") || "EASY").toUpperCase();

if (!USER || !PASS) {
  console.error("Erro: informe --user e --pass");
  process.exit(1);
}

// DB envs para leitura auxiliar
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = parseInt(process.env.DB_PORT || "3306", 10);
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASSWORD || "BE-MySql666Dr@gon";
const DB_NAME = process.env.DB_NAME || "project_detective";

async function http(method, pathUrl, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${pathUrl}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const txt = await res.text();
  let json = null; try { json = JSON.parse(txt); } catch {}
  if (!res.ok) { throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`); }
  return json || { raw: txt };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function saveReport(report, caseId) {
  try {
    const out = path.join(process.cwd(), `runner_report_${caseId || 'error'}.json`);
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log('Runner: relatório salvo em', out);
  } catch (e) {
    console.warn('Runner: falha ao salvar relatório:', String(e));
  }
}

// Helpers de "trapaça" (consultas diretas)
async function getRoute(conn, caseId) {
  const [rows] = await conn.execute(
    'SELECT step_order, city_id FROM case_route WHERE active_case_id = ? ORDER BY step_order ASC',
    [caseId]
  );
  return rows || [];
}

async function getTrueVillainId(conn, caseId) {
  // Seleciona diretamente pelo flag is_culprit na tabela de suspeitos do caso
  try {
    const [rows] = await conn.execute(
      'SELECT id AS suspect_id FROM suspects WHERE active_case_id = ? AND is_culprit = 1 LIMIT 1',
      [caseId]
    );
    if (rows && rows[0] && rows[0].suspect_id) return rows[0].suspect_id;
  } catch {}
  // Fallback 1: case_suspects com flags alternativos
  try {
    const [rows2] = await conn.execute(
      'SELECT suspect_id FROM case_suspects WHERE active_case_id = ? AND (is_culprit = 1 OR is_true = 1 OR is_villain = 1) LIMIT 1',
      [caseId]
    );
    if (rows2 && rows2[0] && rows2[0].suspect_id) return rows2[0].suspect_id;
  } catch {}
  // Fallback 2: active_case.true_villain_id
  try {
    const [rows3] = await conn.execute(
      'SELECT true_villain_id AS suspect_id FROM active_case WHERE id = ? LIMIT 1',
      [caseId]
    );
    if (rows3 && rows3[0] && rows3[0].suspect_id) return rows3[0].suspect_id;
  } catch {}
  return null;
}

// Sequência final controlada: visitar última cidade e investigar 2 NEXT_LOCATION + 1 VILLAIN
async function finalCitySequence(report, caseId, token) {
  try {
    const finalVisit = await http('GET', `/api/v1/cases/${caseId}/visit-current`, null, token);
    report.steps.push({ action: 'visit_final_city', response: finalVisit });
    const places = finalVisit.places || [];
    const nextLocs = places.filter(p => p.clue_type === 'NEXT_LOCATION').slice(0, 2);
    const villainSpots = places.filter(p => p.clue_type === 'VILLAIN');

    for (const p of nextLocs) {
      const inv = await http('POST', `/api/v1/cases/${caseId}/investigate`, { placeId: p.id }, token);
      report.steps.push({ action: 'investigate_final_next_location', placeId: p.id, response: inv });
      await sleep(100);
    }
    if (villainSpots[0]) {
      const invVillain = await http('POST', `/api/v1/cases/${caseId}/investigate`, { placeId: villainSpots[0].id }, token);
      report.steps.push({ action: 'investigate_final_villain', placeId: villainSpots[0].id, response: invVillain });
    } else {
      report.steps.push({ action: 'investigate_final_villain', error: 'Nenhum spot VILLAIN na última cidade' });
    }
  } catch (inner) {
    report.steps.push({ action: 'final_city_sequence_error', error: String(inner) });
  }
}

async function main() {
  const report = { baseUrl: BASE, difficulty: DIFF, steps: [], summary: {} };

  // Auth
  try { await http('POST', '/api/v1/auth/register', { username: USER, password: PASS }); } catch {}
  const login = await http('POST', '/api/v1/auth/login', { username: USER, password: PASS });
  const token = login.accessToken;
  report.summary.auth = { ok: !!token };

  // Perfil
  let profileId = null;
  try {
    const create = await http('POST', '/api/v1/profiles', { detective_name: PROFILE }, token);
    profileId = create.profile?.id;
    report.steps.push({ action: 'create_profile', request: { name: PROFILE }, response: create });
  } catch (e) {
    const list = await http('GET', '/api/v1/profiles', null, token);
    profileId = list.profiles?.[0]?.id;
    report.steps.push({ action: 'list_profiles', response: list });
  }
  if (!profileId) throw new Error('Perfil não disponível');

  // Caso
  const createCase = await http('POST', '/api/v1/cases', { difficulty: DIFF }, token);
  const caseId = createCase.case?.id;
  report.steps.push({ action: 'create_case', request: { difficulty: DIFF }, response: createCase });
  if (!caseId) throw new Error('Caso não criado');

  // Conexão DB e "trapaças"
  const conn = await mysql.createConnection({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASS, database: DB_NAME });
  const route = await getRoute(conn, caseId);
  if (!route || route.length < 2) throw new Error('Rota insuficiente');
  const lastStep = route[route.length - 1];
  const penultStep = route[route.length - 2];
  const trueVillainId = await getTrueVillainId(conn, caseId);
  report.summary.cheat = { lastCityId: lastStep.city_id, penultCityId: penultStep.city_id, trueVillainId };

  // Flags/Fases
  let phase = 1; // 1..5
  let visitsInCurrentCity = 0;
  let currentStepOrder = route[0].step_order;

  // Loop por passos
  for (let i = 0; i < route.length - 1; i++) {
    // Visita atual
    const visit = await http('GET', `/api/v1/cases/${caseId}/visit-current`, null, token);
    report.steps.push({ action: 'visit_current', response: visit });
    visitsInCurrentCity = 0;
    currentStepOrder = visit.city?.step_order || (i + 1);
    phase = Math.min(currentStepOrder, 5); // mapeamento simples: step_order ~ fase

    // Investigar todos os locais da cidade corrente
    const places = visit.places || [];
    for (const p of places) {
      const inv = await http('POST', `/api/v1/cases/${caseId}/investigate`, { placeId: p.id }, token);
      report.steps.push({ action: 'investigate', placeId: p.id, response: inv });
      visitsInCurrentCity++;
      await sleep(100);
    }

    // Se concluímos todas as visitas da fase 4, preparar fase final (5): emitir mandado do vilão verdadeiro e viajar para última cidade
    if (phase === 4) {
      try {
        // Escolher suspeito correto prioritariamente via DB (is_culprit)
        let suspectId = trueVillainId;
        if (!suspectId) {
          // Fallback pela API: tentar achar o flag equivalente
          const suspects = await http('GET', `/api/v1/cases/${caseId}/suspects`, null, token);
          suspectId = (suspects.suspects?.find?.(s => s?.is_culprit === 1 || s?.is_culprit === true)?.id)
                   || null;
        }
        if (suspectId) {
          const warrant = await http('POST', `/api/v1/cases/${caseId}/warrant`, { suspectId }, token);
          report.steps.push({ action: 'warrant_true_villain', suspectId, response: warrant });
        } else {
          report.steps.push({ action: 'warrant_true_villain', error: 'Nenhum suspeito com is_culprit encontrado' });
        }
      } catch (e) {
        report.steps.push({ action: 'warrant_true_villain', error: String(e) });
      }
      // Viajar para a última cidade e executar sequência final
      try {
        const travelFinal = await http('POST', `/api/v1/cases/${caseId}/travel`, { cityId: lastStep.city_id }, token);
        report.steps.push({ action: 'travel_to_final_city', to: lastStep.city_id, response: travelFinal });
      } catch (e) {
        report.steps.push({ action: 'travel_to_final_city', to: lastStep.city_id, error: String(e) });
      }
      await finalCitySequence(report, caseId, token);
      phase = 5;
      break; // encerra loop normal; fase final já executada
    }

    // Se não é fase 4, seguir rota perfeita normalmente
    const nextCityId = route[i+1].city_id;
    // Penúltimo passo (fallback defensivo): garantir mandado e sequência final mesmo que lógica acima não dispare
    if (i === route.length - 2) {
      try {
        let suspectId = trueVillainId;
        if (!suspectId) {
          const suspects = await http('GET', `/api/v1/cases/${caseId}/suspects`, null, token);
          suspectId = (suspects.suspects?.find?.(s => s?.is_culprit === 1 || s?.is_culprit === true)?.id)
                   || null;
        }
        if (suspectId) {
          const warrant = await http('POST', `/api/v1/cases/${caseId}/warrant`, { suspectId }, token);
          report.steps.push({ action: 'warrant_penult_fallback', suspectId, response: warrant });
        } else {
          report.steps.push({ action: 'warrant_penult_fallback', error: 'Nenhum suspeito com is_culprit encontrado' });
        }
      } catch (e) {
        report.steps.push({ action: 'warrant_penult_fallback', error: String(e) });
      }
      try {
        const travel = await http('POST', `/api/v1/cases/${caseId}/travel`, { cityId: nextCityId }, token);
        report.steps.push({ action: 'travel_to_final_city', to: nextCityId, response: travel });
      } catch (e) {
        const msg = String(e);
        report.steps.push({ action: 'travel_to_final_city', to: nextCityId, error: msg });
      }
      await finalCitySequence(report, caseId, token);
      break;
    }
    // Passos intermediários
    try {
      const travel = await http('POST', `/api/v1/cases/${caseId}/travel`, { cityId: nextCityId }, token);
      report.steps.push({ action: 'travel', to: nextCityId, response: travel });
    } catch (e) {
      const msg = String(e);
      report.steps.push({ action: 'travel', to: nextCityId, error: msg });
      if (msg.includes('Não existe próxima cidade') || msg.includes('Viagem indisponível') || msg.includes('fase final')) {
        await finalCitySequence(report, caseId, token);
        break;
      } else {
        throw e;
      }
    }
  }

  // Tempo e XP
  const [tsRows] = await conn.execute('SELECT start_time, deadline_time, current_time FROM case_time_state WHERE case_id = ? LIMIT 1', [caseId]);
  report.summary.timeState = tsRows[0] || null;

  const [xpRows] = await conn.execute('SELECT xp_awarded, breakdown_json FROM player_xp_history WHERE case_id = ?', [caseId]);
  report.summary.xpHistory = xpRows || [];

  // Checar status do caso via API
  try {
    const caseInfo = await http('GET', `/api/v1/cases/${caseId}`, null, token);
    report.summary.caseStatus = caseInfo.case?.status || caseInfo.status || null;
    report.steps.push({ action: 'check_case_status', response: caseInfo });
  } catch (e) {
    report.summary.caseStatusError = String(e);
    report.steps.push({ action: 'check_case_status', error: String(e) });
  }

  await conn.end();

  // Salvar relatório
  await saveReport(report, caseId);
  console.log('Runner concluído.');
  console.log(JSON.stringify({ caseId, steps: report.steps.length, timeState: report.summary.timeState, xp: report.summary.xpHistory, status: report.summary.caseStatus, cheat: report.summary.cheat }, null, 2));
}

main().catch(async err => { 
  console.error('Falha no runner:', err);
  try { await saveReport({ error: String(err) }, 'error'); } catch {}
  process.exit(1);
});
