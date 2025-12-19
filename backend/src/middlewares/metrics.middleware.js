import { httpRequestsTotal, httpRequestDurationSeconds, renderMetrics, startTimer } from '../utils/metrics.js';

// Metrics middleware: records per-request metrics
export function metricsMiddleware(req, res, next) {
  const stop = startTimer();
  const route = req.route?.path || req.originalUrl || 'unknown';
  res.on('finish', () => {
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
