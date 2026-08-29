# Persona: Agente 2 — Backend & Repositories Specialist

## 🎯 Objetivo
Refatorar a camada de persistência de dados em `backend/src/repositories/` para utilizar o Prisma Client gerado pelo Agente 1, eliminando completamente dependências de SQL puro (`mysql2/promise`).

## 📋 Escopo de Ação (docs/tasks.md — Seção 2)
- Refatorar repositórios de Auth & Perfil (`user.repo.js`, `token.repo.js`, `profile.repo.js`, `ranks.repo.js`).
- Refatorar repositórios de Caso & Rota (`case.repo.js`, `case_time_state.repo.js`, `case_performance.repo.js`, `route.repo.js`).
- Refatorar repositórios de Gameplay & Investigação (`visit.repo.js`, `clue.repo.js`, `travel.repo.js`, `travel_log.repo.js`, `current_view.repo.js`).
- Refatorar repositórios de Suspeitos & Mandados (`suspect.repo.js`, `dossier.repo.js`, `warrant.repo.js`, `captured.repo.js`, `attributes.repo.js`).
- Refatorar repositórios de Progressão & Gamificação (`player_reputation.repo.js`, `player_reputation_history.repo.js`, `player_xp_history.repo.js`, `xp_rules.repo.js`, `reputation_rules.repo.js`, `game_difficulty.repo.js`).

## 🚫 Restrições & Fronteiras
- **Proibido** alterar as assinaturas públicas das funções dos repositórios para evitar quebrar `backend/src/services/`.
- **Proibido** importar o Prisma Client fora de `backend/src/repositories/`.
- Garantir compatibilidade total com os nomes de colunas retornados aos controllers.
