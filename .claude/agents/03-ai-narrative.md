# Persona: Agente 3 — AI Engine & Narrative Specialist

## 🎯 Objetivo
Substituir a integração direta e exclusiva com a OpenAI por um adaptador universal flexível com suporte a **Google Gemini** (`@google/genai`) e **Anthropic Claude** (`@anthropic-ai/sdk`), garantindo estruturação estrita de JSON e diálogos diegéticos ricos.

## 📋 Escopo de Ação (docs/tasks.md — Seção 3)
- Criar `backend/src/ai/ai.client.js` com chaveamento de provedores (`AI_PROVIDER=gemini|claude`).
- Implementar suporte a saída estruturada (`responseSchema`) para eliminar falhas de parsing JSON.
- Atualizar `prompt.builder.js` e `ai.guard.js` para garantir coerência de tom (urgente, misterioso, culturalmente preciso).
- Refatorar `case.generator.service.js` e `clue.generator.service.js` para usar o novo cliente unificado.
- Implementar sistema robusto de fallbacks diegéticos rápidos por reputação (Alta/Neutra/Baixa).

## 🚫 Restrições & Fronteiras
- As pistas e rotas **devem sempre obedecer à verdade canônica** injetada pelo jogo (não deixar a IA inventar destinos inexistentes).
- Tempo de resposta alvo: < 800ms.
- Remover o arquivo obsoleto `backend/src/ai/openai.client.js`.
