import env from '../config/env.js';
import { observeAiCall } from '../utils/metrics.js';
import { makeCacheKey, getCached, setCached } from './ai.cache.js';

/**
 * Adaptador universal de IA — desacopla o jogo de qualquer SDK específico.
 *
 * Provedores suportados (chaveados por `AI_PROVIDER`):
 *   - "gemini" → Google Gemini via `@google/genai`  (padrão)
 *   - "claude" → Anthropic Claude via `@anthropic-ai/sdk`
 *
 * API pública:
 *   callAI({ system, user, options })      → string
 *   callAIStructured({ system, user, schema, options }) → objeto JSON validado
 *
 * Toda a estruturação de JSON usa saída nativa do provedor (`responseSchema` no
 * Gemini, instrução estrita + parse tolerante no Claude) para eliminar falhas
 * de parsing.
 */

const DEFAULT_TIMEOUT = env.AI_TIMEOUT;
const DEFAULT_RETRIES = env.AI_MAX_RETRIES;

/**
 * A IA só é considerada ativa quando há chave para o provedor selecionado.
 * Sem chave, os geradores usam texto determinístico — o jogo permanece
 * 100% jogável e correto (evita também o MetadataLookupWarning do @google/genai).
 */
export function isAiEnabled(provider = env.AI_PROVIDER) {
  if (process.env.AI_ENABLED === 'false') return false; // override explícito (testes / modo offline)
  const p = String(provider || '').toLowerCase();
  if (p === 'claude') return Boolean(env.ANTHROPIC_API_KEY);
  if (p === 'gemini') return Boolean(env.GEMINI_API_KEY);
  return false;
}

// ── Lazy loaders (evita exigir SDK do provedor que não está em uso) ──────
let _geminiClient = null;
async function getGemini() {
  if (!_geminiClient) {
    const { GoogleGenAI } = await import('@google/genai');
    _geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return _geminiClient;
}

let _claudeClient = null;
async function getClaude() {
  if (!_claudeClient) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    _claudeClient = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY,
      timeout: DEFAULT_TIMEOUT,
      maxRetries: 0, // controlamos retries aqui
    });
  }
  return _claudeClient;
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timeout de ${ms}ms excedido (${label})`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ── Gemini ──────────────────────────────────────────────────────────────
async function generateWithGemini({ system, user, options }) {
  const ai = await getGemini();

  const config = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 400,
    // Menor nível de "thinking" do 3.6 Flash → latência mínima.
    // (thinkingBudget: 0 passou a retornar 400 INVALID_ARGUMENT nesta geração;
    //  thinkingLevel aceita "minimal" | "low" | "medium" | "high".)
    thinkingConfig: { thinkingLevel: options.thinkingLevel ?? 'minimal' },
  };

  if (system) config.systemInstruction = system;

  if (options.schema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = options.schema;
  } else if (options.json) {
    config.responseMimeType = 'application/json';
  }

  const res = await ai.models.generateContent({
    model: options.model || env.GEMINI_MODEL,
    contents: user,
    config,
  });

  return typeof res?.text === 'string' ? res.text : '';
}

// ── Claude ──────────────────────────────────────────────────────────────
async function generateWithClaude({ system, user, options }) {
  const client = await getClaude();

  let systemPrompt = system || '';
  if (options.schema || options.json) {
    systemPrompt +=
      '\n\nRESPONDA EXCLUSIVAMENTE COM UM JSON VÁLIDO (sem markdown, sem crases, sem comentários).';
    if (options.schema) {
      systemPrompt += `\nSiga estritamente este schema: ${JSON.stringify(options.schema)}`;
    }
  }

  const msg = await client.messages.create({
    model: options.model || env.ANTHROPIC_MODEL,
    max_tokens: options.maxTokens ?? 400,
    temperature: options.temperature ?? 0.7,
    ...(systemPrompt.trim() ? { system: systemPrompt.trim() } : {}),
    messages: [{ role: 'user', content: user }],
  });

  return (msg?.content || [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();
}

const PROVIDERS = {
  gemini: generateWithGemini,
  claude: generateWithClaude,
};

/**
 * Chamada de texto livre. Retorna string não-vazia ou lança erro
 * (o chamador é responsável pelos fallbacks diegéticos).
 */
export async function callAI({ system, user, options = {} }) {
  if (typeof user !== 'string' || user.trim().length === 0) {
    throw new Error('callAI: prompt de usuário ausente ou inválido');
  }

  const providerName = (options.provider || env.AI_PROVIDER).toLowerCase();
  const generate = PROVIDERS[providerName];
  if (!generate) {
    throw new Error(`callAI: provedor desconhecido "${providerName}"`);
  }
  if (!isAiEnabled(providerName)) {
    throw new Error(`callAI: IA desativada (sem chave para "${providerName}")`);
  }

  const timeout = options.timeout ?? DEFAULT_TIMEOUT;
  const maxRetries = options.retries ?? DEFAULT_RETRIES;

  // Cache determinístico opt-in: a chave cobre provedor, modelo e prompt.
  const model =
    options.model || (providerName === 'claude' ? env.ANTHROPIC_MODEL : env.GEMINI_MODEL);
  const cacheKey = options.cache
    ? makeCacheKey({ provider: providerName, model, system, user, schema: options.schema })
    : null;
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const startedAt = Date.now();
    try {
      const text = await withTimeout(
        generate({ system, user, options }),
        timeout,
        providerName,
      );
      if (text && text.trim().length >= 3) {
        observeAiCall({ provider: providerName, result: 'success', seconds: (Date.now() - startedAt) / 1000 });
        if (process.env.NODE_ENV !== 'production') {
          console.info(
            `[AI] ${providerName} ok em ${Date.now() - startedAt}ms (tentativa ${attempt + 1})`,
          );
        }
        const clean = text.trim();
        if (cacheKey) setCached(cacheKey, clean);
        return clean;
      }
      lastError = new Error(`Provedor ${providerName} retornou resposta vazia`);
      observeAiCall({ provider: providerName, result: 'error', seconds: (Date.now() - startedAt) / 1000 });
    } catch (err) {
      lastError = err;
      observeAiCall({ provider: providerName, result: 'error', seconds: (Date.now() - startedAt) / 1000 });
      console.warn(
        `[AI] ${providerName} falhou (tentativa ${attempt + 1}/${maxRetries + 1}): ${err.message}`,
      );
    }
  }

  throw lastError || new Error('Falha ao obter resposta da IA');
}

/**
 * Chamada com saída estruturada. `schema` é um JSON Schema (subset OpenAPI 3.0).
 * Retorna o objeto já parseado. Lança erro se não for possível parsear.
 */
export async function callAIStructured({ system, user, schema, options = {} }) {
  const raw = await callAI({
    system,
    user,
    options: { ...options, schema, json: true },
  });
  return parseJsonLoose(raw);
}

/**
 * Parser tolerante: remove cercas de markdown e recorta o primeiro objeto/array
 * JSON presente no texto antes de fazer o parse.
 */
export function parseJsonLoose(text) {
  if (text && typeof text === 'object') return text;
  const cleaned = String(text)
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.search(/[[{]/);
    const last = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
    if (first !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error(`Resposta da IA não é JSON válido: ${cleaned.slice(0, 120)}`);
  }
}
