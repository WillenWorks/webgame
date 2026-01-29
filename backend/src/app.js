import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import registerRoutes from './routes/index.js';
import { errorMiddleware } from './middlewares/error.middleware.js';
import { requestIdMiddleware, rateLimitMiddleware, sanitizeMiddleware } from './middlewares/security.middleware.js';
import { metricsMiddleware, metricsController } from './middlewares/metrics.middleware.js';

const app = express();

// Request ID antes de tudo
app.use(requestIdMiddleware);

// Helmet com diretivas seguras
app.use(helmet({
  xssFilter: true,
  noSniff: true,
  hidePoweredBy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));

// CORS estrito via env ALLOWED_ORIGINS (CSV)
const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Postman/CLI
    if (allowed.length === 0 || allowed.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
};
app.use(cors(corsOptions));

// JSON e saneamento
app.use(express.json());
app.use(sanitizeMiddleware);

// Rate limiting e métricas
app.use(rateLimitMiddleware);
app.use(metricsMiddleware);

// Endpoint de métricas Prometheus
app.get('/metrics', metricsController);

// Rotas
registerRoutes(app);

// Erros padronizados
app.use(errorMiddleware);

// Fallback
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    error: { requestId: req.requestId, code: 'INTERNAL_ERROR', message: 'Internal server error', method: req.method, path: req.path },
  });
});

export default app;
