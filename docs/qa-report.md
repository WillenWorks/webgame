# Relatório de QA — Agente 4 (Seção 4 · `docs/tasks.md`)

Data: 2026-08-28 · Stack alvo: Prisma + PostgreSQL (working tree dos Agentes 1–3)

---

## ✅ Entregue

### Task 4.1 — Runner E2E (`backend/tools/runner.js`)
- Reescrito de `mysql2` → **Prisma Client / PostgreSQL** (`@prisma/client`, `dotenv`).
- Fluxo coberto: `Health → Login → Perfil → Criar Caso → Visitar → Investigar → Viajar → Warrant → Captura → Validar XP`.
- "Trapaças" (rota real, vilão verdadeiro, histórico de XP) lidas via Prisma: `caseRoute`, `caseSuspect`, `playerXpHistory`, `activeCase`.
- Adiciona **veredito de QA** (`solved && xpRecorded && warrantCorrect`) e sai com código ≠ 0 se falhar.
- `backend/tools/package.json`: removido `mysql2`, adicionados `@prisma/client` + `dotenv`.
- Novo script: `npm run e2e` (em `backend/`).

### Task 4.2 — Suíte de testes (`node --test`)
- `backend/package.json`: scripts `test` / `test:watch` via **Node test runner** nativo (sem dependência nova).
- Regras críticas extraídas para módulos **puros e testáveis** em `backend/src/domain/`:
  - `time.rules.js` — janela de sono, `advanceClock` (avanço por viagem/visita), `computeDaysEarly`, `haversineKm`, buckets de viagem por dificuldade. `time.service.js` agora delega a este módulo.
  - `xp.rules.js` — `computeXpBreakdown` (base, bônus por dias, precisão, skip, debuffs), `rankForXp` / `evaluatePromotion` (evolução de patente). `xp.service.js` delega.
  - `dossier.rules.js` — `normalizeNotes`, `notesToPrismaWhere`, `filterSuspectsByNotes`, `identifyVillain`. `suspect.repo.js`, `dossier.repo.js` e `suspect_filter.service.js` passam a usar a fonte única.
- **42 testes, 100% verdes** (`backend/test/*.test.js`).

### Task 4.3 — Telemetria & Healthcheck
- `GET /ping` (liveness) e `GET /health` (readiness com `SELECT 1` no PostgreSQL via Prisma; 200/503) — `backend/src/routes/health.routes.js`, montados em `app.js`.
- `backend/src/utils/metrics.js`: novo histograma `ai_request_duration_seconds{provider,result}` + helper `observeAiCall()`.
- Instrumentação: `ai.client.js` (latência + `success`/`error` por provedor), `ai.guard.js` (contador `fallback`).
- **Verificado com servidor + banco reais**:
  - `/ping` → `200 {ok:true,pong:true}`
  - `/health` → `200 {checks:{database:{ok:true,engine:"postgresql"}}}`
  - `/metrics` → expõe `http_requests_total`, `http_request_duration_seconds`, `ai_requests_total`, `ai_request_duration_seconds`.

---

## ⛔ Runner NÃO fecha 100% — bloqueios fora do escopo do Agente 4

O runner foi executado contra ambiente real (container `operacao-mundo-db` healthy, migração `20260828143407_init` aplicada, seed OK). Progresso obtido:

`/health ✓ → register ✓ → login ✓ → perfil ✓ → criar caso → ✗`

### Bloqueio 1 — Migração Prisma incompleta (Agente 2)
`POST /api/v1/cases` falha em `clue.manager.service.js:20` com **`ECONNREFUSED`**: o serviço ainda usa o `pool` MySQL (`mysql2`) apontando para `localhost:3306`.

Arquivos ainda em MySQL/`pool` (SQL cru, `?` placeholders, `ST_X/ST_Y`, `NOW()`, `SHOW COLUMNS`):

| Arquivo | Observação |
|---|---|
| `services/clue.manager.service.js` | **bloqueia criação de caso** |
| `services/case.service.js` | `pool.query` cidades/países |
| `services/case.generator.service.js` | — |
| `services/case.planner.js` | — |
| `services/route.generator.service.js` | `ST_Y/ST_X(geo_coordinates)` (coluna não existe no schema novo) |
| `services/visit.service.js` | `ST_Y/ST_X`, `case_travel_log` cru |
| `services/investigate.service.js` | `import('../config/database.js').execute(...)` sem try/catch (linhas ~155-161) |
| `services/travel.service.js` | `import('../config/database.js')` |
| `services/phase.seed.service.js` | `pool.execute` |
| `services/profile_summary.service.js` | `pool.execute` |
| `services/seed_attributes.service.js` | `pool` (startup: `[seed] Error expanding attributes`) |
| `services/migration.service.js` | `SHOW COLUMNS` (startup: `[db] Falha ao rodar migrações`) — MySQL-only; deve ser removido |
| `services/time.service.js` | 3× `import('../config/database.js')` em `try/catch` (degrada para fallback — **não bloqueia**, mas suja o comportamento) |

**Correção mecânica já aplicada por QA** (necessária para o runner passar da criação de caso):
- `repositories/case.repo.js` — `activeCase.create` misturava `profileId` escalar com `difficulty: { connect }`; trocado para `profile: { connect: { id } }`. Validado: `createCase` passa a ter sucesso.

### Bloqueio 2 — Adapter de IA sem chave (Agente 3)
Com `GEMINI_API_KEY` vazio, `@google/genai` tenta *Application Default Credentials* / metadata server e emite `MetadataLookupWarning` + erro repetido por chamada. Os **fallbacks diegéticos funcionam** (`[name.generator] fallback acionado`), mas o provedor deveria ser curto-circuitado quando não há chave. Não bloqueia o runner (fallback cobre), mas polui os logs e adiciona latência.

---

## 🔧 Setup de ambiente (feito para viabilizar o teste)
- `backend/.env` continha apenas `DATABASE_URL`. Foram anexadas variáveis de dev (`JWT_SECRET`, `PORT`, `ALLOWED_ORIGINS`, `AI_*`, chaves de IA vazias) espelhando `backend/.env.example`. **Ajuste `JWT_SECRET` e as chaves de IA antes de qualquer uso não-local.**

## ▶️ Como rodar o runner quando o Agente 2 concluir
```bash
docker compose up -d                 # container já está de pé
cd backend
npx prisma migrate deploy            # já aplicado
npm run db:seed                      # já aplicado
npm run dev                          # sobe API na 3333
npm run e2e -- --user "agente.nelliw" --pass "secret123" --difficulty EASY
```

## 🚦 Veredito
- Tasks 4.1, 4.2 e 4.3: **concluídas**.
- Critério "runner 100% verde antes de liberar Agente 5": **bloqueado** pela migração Prisma incompleta do Agente 2 (e, secundariamente, pelo curto-circuito de IA do Agente 3). O runner, a suíte de testes e a observabilidade estão prontos para validar assim que o Agente 2 finalizar.
