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
