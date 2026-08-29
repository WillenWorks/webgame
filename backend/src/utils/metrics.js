import client from 'prom-client';

// Create a Registry and default metrics
export const metricsRegistry = new client.Registry();
client.collectDefaultMetrics({ register: metricsRegistry });

// HTTP metrics
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

// AI call metrics
export const aiRequestsTotal = new client.Counter({
  name: 'ai_requests_total',
  help: 'Total AI calls',
  labelNames: ['provider', 'result'], // result: success | fallback | error
  registers: [metricsRegistry],
});

export const aiRequestDurationSeconds = new client.Histogram({
  name: 'ai_request_duration_seconds',
  help: 'AI provider call latency in seconds',
  labelNames: ['provider', 'result'], // result: success | error
  buckets: [0.1, 0.25, 0.5, 0.8, 1, 2, 4, 8, 15],
  registers: [metricsRegistry],
});

/**
 * Registra o desfecho de uma chamada de IA nas métricas Prometheus.
 * @param {{ provider?: string, result: 'success'|'fallback'|'error', seconds?: number }} params
 */
export function observeAiCall({ provider = 'unknown', result, seconds }) {
  aiRequestsTotal.inc({ provider, result });
  if (typeof seconds === 'number' && (result === 'success' || result === 'error')) {
    aiRequestDurationSeconds.observe({ provider, result }, seconds);
  }
}

// Helper to measure HTTP request duration
export function startTimer() {
  const start = process.hrtime.bigint();
  return () => {
    const end = process.hrtime.bigint();
    const diffNs = Number(end - start);
    return diffNs / 1e9; // seconds
  };
}

// Expose metrics as text
export async function renderMetrics() {
  return await metricsRegistry.metrics();
}
