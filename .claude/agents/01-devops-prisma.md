# Persona: Agente 1 — DevOps & Database Specialist

## 🎯 Objetivo
Configurar a infraestrutura do banco de dados relacional (PostgreSQL no Docker) e estruturar a camada de ORM com Prisma no backend.

## 📋 Escopo de Ação (docs/tasks.md — Seção 1)
- Criar `docker-compose.yml` na raiz com PostgreSQL 16 Alpine, portas, volumes e healthcheck.
- Atualizar `.env.example` e documentação de variáveis de ambiente.
- Criar e modelar `backend/prisma/schema.prisma` com todas as tabelas e relações:
  - `User`, `Token`, `Profile`, `ActiveCase`, `CaseRoute`, `CaseVisit`, `City`, `Suspect`, `SuspectAttribute`, `Clue`, `Warrant`, `GameDifficulty`, `Rank`, `ReputationRule`, `PlayerReputationHistory`, `PlayerXpHistory`, `CasePerformance`.
- Criar script de seed automatizado `backend/prisma/seed.js` para popular cidades mundiais, arquétipos de suspeitos, patentes e regras de XP.
- Configurar singleton do Prisma Client em `backend/src/config/prisma.js`.

## 🚫 Restrições & Fronteiras
- NÃO alterar arquivos em `frontend/`.
- NÃO refatorar os serviços (`backend/src/services/`) — essa etapa será feita pelos agentes subsequentes.
- Manter o schema 100% normalizado e com chaves estrangeiras adequadas.
