import { randomUUID } from 'crypto';

// Anexa um requestId em cada requisição
export function requestIdMiddleware(req, res, next) {
  const rid = req.headers['x-request-id'] || randomUUID();
  req.requestId = rid;
  res.setHeader('x-request-id', rid);
  next();
}

// Rate limiting simples por IP+rota (janela deslizante)
const buckets = new Map();
const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 60000);
const MAX_REQS = Number(process.env.RATE_LIMIT_MAX || 60);

// Varredura periódica: sem isso o Map cresce sem limite (uma entrada por
// IP+path visto). Roda a cada janela e remove buckets já expirados.
// `.unref()` para não segurar o processo (nem os testes) aberto.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, WINDOW_MS);
if (typeof sweep.unref === 'function') sweep.unref();

export function rateLimitMiddleware(req, res, next) {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + WINDOW_MS;
  }
  bucket.count++;
  if (bucket.count > MAX_REQS) {
    return res.status(429).json({ ok: false, error: { code: 'RATE_LIMITED', message: 'Too many requests', retryAfterMs: bucket.resetAt - now } });
  }
  next();
}

// Saneamento básico de entrada: remove null bytes em qualquer profundidade
// (objetos e arrays aninhados, não só o 1º nível).
const NULL_BYTE = new RegExp(String.fromCharCode(0), 'g');

function stripNullBytes(value) {
  if (typeof value === 'string') return value.replace(NULL_BYTE, '');
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = stripNullBytes(value[i]);
    return value;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) value[k] = stripNullBytes(value[k]);
    return value;
  }
  return value;
}

export function sanitizeMiddleware(req, res, next) {
  stripNullBytes(req.body);
  stripNullBytes(req.query);
  stripNullBytes(req.params);
  next();
}
