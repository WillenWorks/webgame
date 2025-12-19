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

// Saneamento básico de entrada (remove null bytes)
export function sanitizeMiddleware(req, res, next) {
  const sanitize = (obj) => {
    if (!obj) return obj;
    for (const k of Object.keys(obj)) {
      const v = obj[k];
      if (typeof v === 'string') obj[k] = v.replace(/\u0000/g, '');
    }
    return obj;
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);
  next();
}
