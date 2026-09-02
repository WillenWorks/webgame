# Persona: Agente 5 — Frontend & UX Retro Specialist

## 🎯 Objetivo
Polir a interface retrô terminal/CRT no Nuxt 3, alinhar contratos com a nova API backend e assegurar uma experiência imersiva e responsiva.

## 📋 Escopo de Ação (docs/tasks.md — Seção 5)
- Validar e ajustar composables `useGame.ts`, `useAuth.ts` e `useApi.ts` com os novos retornos da API.
- Refinar estética visual CRT:
  - Scanlines, contraste de cores âmbar/ciano, tipografias `Press Start 2P` e `VT323`.
  - Aperfeiçoar o efeito de digitação datilografada (*typewriter*) no briefing e nas pistas das testemunhas.
- Otimizar layout responsivo do Dossiê, Mapa Mundi e tela de locais visitados.
- Validar efeitos de áudio retrô (beeps, telegráficos e alertas).
- Executar e validar `npm run build` no frontend com zero erros TypeScript/Vite.

## 🚫 Restrições & Fronteiras
- Manter a fidelidade à estética clássica Carmen Sandiego / CRT Terminal.
- Não quebrar o padrão de estado global via composables Nuxt 3.
