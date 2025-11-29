// src/services/llmService.js

// No futuro vamos usar process.env.OPENAI_API_KEY e chamar a API da OpenAI.
// Por enquanto, isso é apenas um stub para o MVP 0.2 Task 1.

export async function generateCarmenCase(input) {
  console.log("[llmService] generateCarmenCase stub chamado com:", input)

  // Esse formato será expandido depois quando formos integrar BD + IA de verdade.
  return {
    caseId: "stub-case-001",
    title: "Caso Stub: O Enigma do Arquivo Fantasma",
    summary:
      "Este é um caso gerado localmente apenas para testar integração. A versão com IA real será implementada nas próximas tasks.",
  }
}
