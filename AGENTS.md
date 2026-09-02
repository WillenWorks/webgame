# Diretrizes do Projeto & Protocolo de Agente — Operação Mundo

Este repositório contém o projeto **"Operação Mundo" (Carmen Sandiego MVP 0.2)** — jogo web educativo de investigação criminal e geografia.

---

## 🎯 Modo de Planejamento Obrigatório (Planning Mode)

Todos os agentes de IA que atuarem neste repositório devem seguir rigorosamente o protocolo de **Planejamento Prévio** antes de realizar alterações estruturais, refatorações ou implementação de novas features.

### 1. Etapa de Pesquisa & Diagnóstico (Read-Only)
- Inspecione arquivos relevantes de backend (`backend/src/`) e frontend (`frontend/`).
- Identifique dependências, fluxos de dados e potenciais efeitos colaterais.
- **NÃO** realize alterações de código nem rode comandos destrutivos durante a fase de pesquisa.

### 2. Criação / Atualização do Plano de Implementação
- Crie ou atualize o plano de trabalho estruturado detalhando:
  - **Objetivo & Contexto**: Problema resolvido e valor entregue.
  - **Priorização RICE / MoSCoW**: Avaliação de Reach, Impact, Confidence e Effort.
  - **Proposta Técnica por Camadas**: Backend (rotas, controllers, services, repos), Frontend (composables, páginas, componentes) e Banco de Dados (schema/migrations).
  - **Critérios de Aceite & Plano de Verificação**: Testes automatizados e roteiro de teste manual.
- Apresente o plano para revisão e aprovação do usuário.

### 3. Execução & Verificação
- Após aprovação, execute as etapas de forma incremental e atômica.
- Valide as alterações através de testes automatizados (`npm test` no backend) e build do frontend (`npm run build`).

---

## 🏗️ Padrões Arquiteturais do Projeto

1. **Backend (Node.js + Express 5 ESM + MySQL)**:
   - Arquitetura em camadas estrita: `routes/` → `controllers/` → `services/` → `repositories/`.
   - **Proibido** executar SQL direto ou `await import('../config/database.js')` dentro de `services/`. Toda persistência deve residir em `repositories/`.
   - Sessão e Tokens: `accessToken` (15m) + `refreshToken` rotativo (30d) emitido em cookie `httpOnly`, `Secure`, `SameSite=Lax`.

2. **Frontend (Nuxt 3 SPA + TailwindCSS + Retro Aesthetic)**:
   - Estado global centralizado em composables (`useGame.ts`, `useAuth.ts`, `useApi.ts`).
   - Requisições com interceptor de *silent-refresh* em caso de erro 401 via `useApi.ts`.
   - Estética retrô terminal/CRT (fontes `Press Start 2P`, `VT323`, scanlines, cartões com bordas âmbar/ciano).

3. **Banco de Dados & Migrations**:
   - Todo schema e seed devem ser versionados em `backend/migrations/` (ex: `001_initial_schema.sql`, `002_initial_seeds.sql`).
   - Migrations executadas automaticamente via tabela `migrations_history`.
