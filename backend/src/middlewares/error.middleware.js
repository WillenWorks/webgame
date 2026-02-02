import { randomUUID } from 'crypto';

// Error responder: padrão único com requestId, code, message, details
export function errorMiddleware(err, req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();

  // Zod-like issues
  const zodIssues = err?.issues || err?.error?.issues || null;
  const code = err?.code || (zodIssues ? 'VALIDATION_ERROR' : 'INTERNAL_SERVER_ERROR');
  
  // Decide status code
  let status = 500;
  if (code === 'VALIDATION_ERROR' || code === 'BAD_REQUEST') status = 400;
  else if (code === 'UNAUTHORIZED') status = 401;
  else if (code === 'FORBIDDEN') status = 403;
  else if (code === 'NOT_FOUND') status = 404;

  // Log estruturado (pode ser integrado com um logger real)
  console.error(JSON.stringify({
    level: 'error',
    requestId,
    method: req.method,
    path: req.originalUrl,
    code,
    message: err?.message || 'Erro interno',
    details: zodIssues || undefined,
    stack: err?.stack // Log stack for debugging
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
