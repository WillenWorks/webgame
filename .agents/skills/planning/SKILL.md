---
name: planning
description: Protocolo de planejamento estratégico, priorização RICE, arquitetura em camadas e decomposição de tarefas para o projeto Operação Mundo.
---

# Skill de Planejamento e Decomposição Estratégica

Esta skill guia os agentes na estruturação e execução de tarefas de desenvolvimento no projeto **Operação Mundo**.

## Quando Utilizar
- Ao iniciar uma nova funcionalidade, refatoração ou correção com impacto em múltiplos módulos.
- Ao priorizar demandas de produto, balanceando valor de gameplay (RICE) com integridade técnica.

## Fluxo de Trabalho de Planejamento

1. **Investigação Prévia (Fase de Leitura)**:
   - Identificar os componentes afetados em `backend/src/` e `frontend/`.
   - Analisar contratos de API, tipos e esquemas de banco de dados.

2. **Decomposição em Fases**:
   - **Fase 1**: Quick Wins, estabilidade e remoção de débitos técnicos imediatos.
   - **Fase 2**: Testes automatizados e infraestrutura de banco (migrations).
   - **Fase 3+**: Funcionalidades de produto priorizadas por pontuação RICE:
     - `Score RICE = (Reach * Impact * Confidence) / Effort`

3. **Validação e Entrega**:
   - Todo fluxo deve ser acompanhado por testes automatizados (`npm test`).
   - Geração de walkthrough após a conclusão para documentar as alterações realizadas.
