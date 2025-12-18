import { Router } from 'express';
import {
  generateRouteController,
  getRouteController
} from '../controllers/route.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/generate', generateRouteController);
router.get('/:caseId', getRouteController);

export default router;
