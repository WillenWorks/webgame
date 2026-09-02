import dotenv from 'dotenv';
dotenv.config();

const toInt = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export default {
  // ── Camada de IA (adaptador universal) ────────────────────────────────
  // Provedor ativo: "gemini" (padrão) ou "claude".
  AI_PROVIDER: (process.env.AI_PROVIDER || 'gemini').toLowerCase(),
  // Timeout global (ms) para qualquer chamada de IA.
  AI_TIMEOUT: toInt(process.env.AI_TIMEOUT, 10000),
  AI_MAX_RETRIES: toInt(process.env.AI_MAX_RETRIES, 1),

  // Cache determinístico de respostas de IA (economia de cota + latência zero
  // em acerto). Chaveado por (provedor, modelo, prompt, schema).
  AI_CACHE_ENABLED: (process.env.AI_CACHE_ENABLED || 'true').toLowerCase() !== 'false',
  AI_CACHE_TTL_MS: toInt(process.env.AI_CACHE_TTL_SECONDS, 86400) * 1000,
  AI_CACHE_MAX: toInt(process.env.AI_CACHE_MAX, 500),

  // Google Gemini (@google/genai)
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',

  // Anthropic Claude (@anthropic-ai/sdk)
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',

  // ── Auth / sessão ────────────────────────────────────────────────────
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
