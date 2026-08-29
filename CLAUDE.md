# Claude Code Guidelines — Operação Mundo (Carmen Sandiego MVP)

Este arquivo define as diretrizes de desenvolvimento, regras arquiteturais e o protocolo de trabalho com múltiplos agentes no projeto **Operação Mundo**.

---

## 🏗️ Padrões Arquiteturais & Regras Estritas

1. **Backend (Node.js + Express 5 ESM + PostgreSQL + Prisma ORM)**:
   - Arquitetura em camadas estrita: `routes/` → `controllers/` → `services/` → `repositories/`.
   - **Proibido** executar SQL direto ou chamar o Prisma Client diretamente dentro de `services/`. Toda persistência deve residir em `repositories/`.
   - Sessão e Tokens: `accessToken` (15m) + `refreshToken` rotativo (30d) emitido em cookie `httpOnly`, `Secure`, `SameSite=Lax`.

2. **Camada de IA & Prompts**:
   - Desacoplamento via `ai.client.js` suportando **Google Gemini** (`@google/genai`) e **Anthropic Claude** (`@anthropic-ai/sdk`).
   - Geração estrita via JSON Schema (`responseSchema`) e fallbacks diegéticos por reputação.

3. **Frontend (Nuxt 3 SPA + TailwindCSS + Retro CRT Aesthetic)**:
   - Estado global centralizado em composables (`useGame.ts`, `useAuth.ts`, `useApi.ts`).
   - Requisições com interceptor de *silent-refresh* em caso de 401 via `useApi.ts`.
   - Estética retrô terminal (fontes `Press Start 2P`, `VT323`, scanlines, cores âmbar/ciano).

4. **Banco de Dados & Migrations**:
   - Modelado exclusivamente em `backend/prisma/schema.prisma`.
   - Migrações executadas via `npx prisma migrate dev`.
   - Seeds gerenciados via `backend/prisma/seed.js`.

---

## 🤖 Protocolo de Agentes Especializados

Ao executar tarefas, o Claude Code deve atuar em conformidade com o agente correspondente definido em `.claude/agents/` e na tasklist em [docs/tasks.md](docs/tasks.md):

- **Agente 1 (DevOps & Database)**: `.claude/agents/01-devops-prisma.md` → Tasks 1.1 a 1.4
- **Agente 2 (Backend Repositories)**: `.claude/agents/02-backend-repos.md` → Tasks 2.1 a 2.5
- **Agente 2.5 (Services Sanitization)**: `.claude/agents/02-sanitize-services.md` → Tasks 2.5.1 a 2.5.3 *(Expurgo do MySQL)*
- **Agente 3 (AI Engine & Narrative)**: `.claude/agents/03-ai-narrative.md` → Tasks 3.1 a 3.4
- **Agente 4 (QA & E2E Testing)**: `.claude/agents/04-qa-runner.md` → Tasks 4.1 a 4.3
- **Agente 5 (Frontend & UX Retro)**: `.claude/agents/05-frontend-retro.md` → Tasks 5.1 a 5.4

---

## 🛠️ Comandos Principais

```bash
# Subir banco PostgreSQL no Docker
docker compose up -d

# Migrações e Seed do Prisma (dentro de backend/)
npx prisma migrate dev --name init
npx prisma db seed

# Iniciar Backend
npm run dev # na pasta backend (porta 3333)

# Iniciar Frontend
npm run dev # na pasta frontend (porta 3000)

# Executar Testes Unitários
npm test # na pasta backend

# Executar Simulação E2E
npm run e2e # ou node tools/runner.js
```
