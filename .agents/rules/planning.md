---
description: Diretrizes obrigatórias de planejamento, priorização RICE e execução incremental para o projeto Operação Mundo.
globs: "**/*"
---

# Regra de Planejamento e Execução Estruturada

Ao trabalhar em qualquer tarefa neste repositório:
1. **Modo de Planejamento (Planning Mode)**:
   - Para mudanças estruturais, novas features ou refatorações complexas, elabore sempre um plano de implementação prévio com objetivos, mudanças por arquivo e plano de testes.
   - Utilize a metodologia **RICE** (Reach, Impact, Confidence, Effort) e categorização **MoSCoW** (Must, Should, Could, Won't) para priorizar itens de produto e valor para o jogador.
2. **Preservação de Integridade**:
   - Mantenha a separação em camadas do backend (`routes` → `controllers` → `services` → `repositories`).
   - Evite regressões nas interfaces e composables do Nuxt 3.
   - Nunca deixe código inline de banco de dados (`import database.js`) dentro de services.
3. **Validação Contínua**:
   - Valide todo trabalho através de testes unitários automatizados com Vitest.
