import { httpRequestsTotal, httpRequestDurationSeconds, renderMetrics, startTimer } from '../utils/metrics.js';

// Label único para tudo que não casou com nenhuma rota (404, ou rejeição por
// middleware antes do dispatch: auth 401, rate-limit 429, CORS). Sem isso, um
// scanner batendo em paths aleatórios explodiria a cardinalidade do Prometheus.
export const UNMATCHED_ROUTE = '<unmatched>';

/**
 * Rótulo estável para a rota. Usa o padrão casado pelo Express
 * (`/api/v1/cases/:caseId/investigate`) — já vem com placeholders e cardinalidade
 * limitada. Sem rota casada, colapsa em `<unmatched>`.
 */
export function routeLabel(req) {
  if (req.route && typeof req.route.path === 'string') {
    const base = req.baseUrl || '';
    const sub = req.route.path === '/' ? '' : req.route.path;
    return `${base}${sub}` || '/';
  }
  return UNMATCHED_ROUTE;
}

// Metrics middleware: records per-request metrics
export function metricsMiddleware(req, res, next) {
  const stop = startTimer();
  res.on('finish', () => {
    // Avaliado no 'finish': aqui `req.route` já foi preenchido pelo dispatch.
    const route = routeLabel(req);
    const status = res.statusCode;
    const duration = stop();
    httpRequestsTotal.inc({ method: req.method, route, status });
    httpRequestDurationSeconds.observe({ method: req.method, route, status }, duration);
  });
  next();
}

// Metrics endpoint handler (with optional token protection)
export async function metricsController(req, res) {
  const enabled = (process.env.METRICS_ENABLED || 'true').toLowerCase() === 'true';
  if (!enabled) return res.status(404).send('metrics disabled');

  const requiredToken = process.env.METRICS_AUTH_TOKEN || '';
  if (requiredToken) {
    const provided = req.headers['x-metrics-token'] || '';
    if (provided !== requiredToken) {
      return res.status(401).send('unauthorized');
    }
  }

  try {
    res.setHeader('Content-Type', 'text/plain');
    res.send(await renderMetrics());
  } catch (err) {
    res.status(500).send('metrics error');
  }
}
