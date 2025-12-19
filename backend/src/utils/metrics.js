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
  labelNames: ['result'], // success | fallback | error
  registers: [metricsRegistry],
});

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
