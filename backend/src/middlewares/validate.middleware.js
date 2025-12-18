import { z } from 'zod';

export function validate(schema) {
  return (req, res, next) => {
    const target = req.method === 'GET' ? req.query : req.body;
    const result = schema.safeParse(target);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        message: 'Validation failed',
        issues: result.error.issues,
      });
    }
    // attach parsed data for downstream usage
    req.validated = result.data;
    next();
  };
}

// Helpers de validação com Zod
export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Payload inválido', details: result.error.issues } });
    }
    req.validated = { ...(req.validated || {}), body: result.data };
    next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query || {});
    if (!result.success) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Query inválida', details: result.error.issues } });
    }
    req.validated = { ...(req.validated || {}), query: result.data };
    next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params || {});
    if (!result.success) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Parâmetros inválidos', details: result.error.issues } });
    }
    req.validated = { ...(req.validated || {}), params: result.data };
    next();
  };
}

// Utilitário comum: coerções de tipos numéricos
export const zId = z.string().min(1);
export const zNum = z.coerce.number().int();
