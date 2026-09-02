import { Router } from 'express';
import { testAI } from '../controllers/dev.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

// Rotas de diagnóstico: exigem token válido. O registro deste router já é
// condicionado a ambiente não-produção em routes/index.js, mas a guarda de
// auth aqui evita que qualquer anônimo na rede queime cota de IA.
router.use(authMiddleware);

router.post('/ai-test', testAI);

export default router;
