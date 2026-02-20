import { callOpenAI } from '../ai/openai.client.js';

/**
 * Gera um objeto roubado e uma narrativa inicial baseada na cidade de partida via IA.
 */
export async function generateCaseMetadata(city, rankLabel = 'Recruta') {
  const country = city?.country_name || 'Desconhecido';
  const cityName = city?.name || 'Cidade Desconhecida';

  const system = `
    Você é o Agente Chefe da ACME. Gere um caso de detetive educacional estilo Carmen Sandiego.
    O caso deve focar em um tesouro roubado da cidade/país especificado.
    Seja criativo, culturalmente preciso e use um tom urgente.
    
    Retorne APENAS um JSON válido.
  `;

  const user = `
    Local: ${cityName}, ${country}
    Rank do Detetive: ${rankLabel}
    
    Gere:
    1. "stolenObject": Nome do objeto roubado. DEVE SER algo culturalmente relevante ou valioso para ${cityName}/${country}. (Ex: Artefato histórico, Obra de arte, Joia da Coroa, Tecnologia de ponta).
    2. "introText": Briefing da missão para o detetive. (max 350 caracteres). Use um tom sério e urgente. Mencione o objeto e a importância dele.
    3. "stolenObjectImage": Mantenha "/images/artifact-placeholder.png".

    JSON esperado:
    {
      "stolenObject": "...",
      "introText": "...",
      "stolenObjectImage": "/images/artifact-placeholder.png"
    }
  `;

  try {
    const jsonStr = await callOpenAI({ 
        system, 
        user, 
        options: { json: true, temperature: 0.8, max_tokens: 400 } 
    });
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Erro gerando caso AI (fallback):", e);
    return {
        stolenObject: "Documento Secreto",
        introText: `ATENÇÃO AGENTE: Um documento de vital importância foi subtraído do cofre central em ${cityName}. Recupere-o antes que seja tarde.`,
        stolenObjectImage: "/images/artifact-placeholder.png"
    };
  }
}
