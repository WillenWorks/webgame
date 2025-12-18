export async function guardAIResponse({ aiCall, fallback }) {
  try {
    const response = await aiCall();

    // Aceitar tanto objeto de completion quanto string direta
    const text = typeof response === 'string'
      ? response
      : response?.choices?.[0]?.message?.content;

    if (!text || text.trim().length < 3) {
      throw new Error('Empty or invalid AI response');
    }

    return sanitize(text);
  } catch (err) {
    console.warn('[AI GUARD] Falling back:', err.message);
    return fallback;
  }
}

function sanitize(text) {
  const cleaned = String(text)
    .replace(/\s+/g, ' ')
    .trim();

  // Em vez de invalidar, garantimos pontuação final mínima
  if (!/[.!?]"?$/.test(cleaned)) {
    return cleaned + '.';
  }

  return cleaned;
}
