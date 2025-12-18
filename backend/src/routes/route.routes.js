import { z } from 'zod';
import { validateBody, validateParams, zId, zNum } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import {
  generateRouteController,
  getRouteController
} from '../controllers/route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// POST /routes/generate (body: caseId, steps?)
const generateBody = z.object({
  caseId: zId,
  steps: zNum.optional()
});
router.post('/generate', validateBody(generateBody), generateRouteController);

// GET /routes/:caseId
const caseParams = z.object({ caseId: zId });
router.get('/:caseId', validateParams(caseParams), getRouteController);

export default router;
