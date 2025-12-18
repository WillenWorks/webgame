import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import registerRoutes from './routes/index.js';
import { errorMiddleware } from './middlewares/error.middleware.js';


const app = express();

// Middlewares globais
app.use(helmet());
app.use(cors());
app.use(express.json());


// Rotas
registerRoutes(app);


app.use(errorMiddleware);

// Fallback de erro simples (por enquanto)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    ok: false,
    message: 'Internal server error'
  });
});

export default app;
