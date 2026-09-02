# Persona: Agente 2.5 — Backend Services Sanitization Specialist

## 🎯 Objetivo
Expurgar 100% dos imports de `../config/database.js` e chamadas SQL diretas (`pool.query`, `db.execute`) da camada `backend/src/services/`, movendo as consultas para funções correspondentes nos repositórios Prisma (`backend/src/repositories/`).

## 📋 Escopo de Ação (docs/tasks.md — Seção 2.5)

### Passo 1: Encapsular Métodos Faltantes nos Repositórios
- `backend/src/repositories/case.repo.js`:
  - Adicionar `getCaseById(caseId)`: retorna o caso completo pelo ID.
  - Adicionar `getCaseDifficulty(caseId)`: retorna o código da dificuldade (`EASY`, `HARD`, `EXTREME`).
  - Adicionar `updateCaseMetadata({ id, stolenObject, introText })`: atualiza o objeto roubado e briefing do caso.
- `backend/src/repositories/city.repo.js`:
  - Adicionar `getCityWithCountry(cityId)`: busca cidade e inclui relação com país (`include: { country: true }`).
- `backend/src/repositories/clue.repo.js`:
  - Adicionar `insertVillainClues(caseId, attributes)`: insere registros em `prisma.caseVillainClue`.
  - Adicionar `pickUnrevealedVillainClue(caseId)`: sorteia uma pista não revelada.
  - Adicionar `markVillainClueRevealed(id)`: atualiza `isRevealed: true`.
- `backend/src/repositories/travel_log.repo.js`:
  - Adicionar `getLastTravelLog(caseId)`: busca o último log de viagem.
  - Adicionar `updateTravelLogArrival(id)`: atualiza `arrivalTime: new Date()`.
- `backend/src/repositories/profile.repo.js`:
  - Adicionar `getProfileCaseCounters(profileId)`: agrega casos resolvidos e falhados via `prisma.activeCase.groupBy` ou `count`.
  - Adicionar `updateProfileCaseCounters(profileId, solved, failed)`: atualiza os contadores no perfil.
- `backend/src/repositories/route.repo.js`:
  - Adicionar `countRoutesForCase(caseId)`: retorna quantidade de passos gerados para o caso.
  - Adicionar `getCaseProfileInfo(caseId)`: retorna profile_id associado ao caso.

### Passo 2: Refatorar os Arquivos de Services
- `backend/src/services/case.service.js`: Remover `pool.query`, usar `getCityWithCountry` e `updateCaseMetadata`.
- `backend/src/services/visit.service.js`: Remover `pool.query`, usar `travel_log.repo.js`.
- `backend/src/services/travel.service.js`: Remover `import('../config/database.js')`, usar `getCaseDifficulty` de `case.repo.js`.
- `backend/src/services/time.service.js`: Remover `import('../config/database.js')`, usar `getCaseDifficulty` de `case.repo.js`.
- `backend/src/services/investigate.service.js`: Remover `import('../config/database.js')`, usar `case.repo.js` e `profile.repo.js`.
- `backend/src/services/clue.manager.service.js`: Remover `pool.query`, usar `clue.repo.js`.
- `backend/src/services/route.generator.service.js`: Remover `pool.execute`, usar `route.repo.js` e `profile.repo.js`.
- `backend/src/services/phase.seed.service.js`: Remover `pool.execute`, usar `getAllPlaceTypes()` de `visit.repo.js`.
- `backend/src/services/profile_summary.service.js`: Remover `pool.execute`, usar `profile.repo.js` e `profile_stats_history.repo.js`.

### Passo 3: Limpeza de Startup e Remoção do MySQL
- `backend/src/server.js`: Remover `runMigrations()` e `ensureExpandedAttributes()`.
- Excluir arquivos obsoletos:
  - `backend/src/services/migration.service.js`
  - `backend/src/services/seed_attributes.service.js`
  - `backend/src/services/case.planner.js`
  - `backend/src/config/database.js`
- Remover `"mysql2"` de `backend/package.json`.

## 🚫 Restrições & Fronteiras
- **Proibido** executar SQL direto ou chamar o Prisma Client diretamente dentro de `services/`. Toda persistência deve residir em `repositories/`.
- Manter o retorno e contratos das funções públicas de `services/` idênticos aos esperados pelos controllers.
