import { Router } from 'express';
import { testAI } from '../controllers/dev.controller.js';

const router = Router();

router.post('/ai-test', testAI);

export default router;
