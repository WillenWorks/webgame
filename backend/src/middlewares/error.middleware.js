import { randomUUID } from 'crypto';

// Error responder: padrão único com requestId, code, message, details
export function errorMiddleware(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();

  // Zod-like issues
  const zodIssues = err?.issues || err?.error?.issues || null;
  const code = err?.code || (zodIssues ? 'VALIDATION_ERROR' : 'BAD_REQUEST');
  const status = code === 'VALIDATION_ERROR' ? 400 : 400;

  // Log estruturado (pode ser integrado com um logger real)
  console.error(JSON.stringify({
    level: 'error',
    requestId,
    method: req.method,
    path: req.originalUrl,
    code,
    message: err?.message || 'Erro interno',
    details: zodIssues || undefined,
  }));

  return res.status(status).json({
    ok: false,
    error: {
      requestId,
      code,
      message: err?.message || 'Erro interno',
      details: zodIssues || undefined,
    },
  });
}
