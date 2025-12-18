import { z } from 'zod';
import { validateBody, validateParams, zId } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import { listProfilesController, createProfileController, getProfileController } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// GET /profiles
router.get('/', listProfilesController);

// POST /profiles (body: detective_name)
const createProfileBody = z.object({ detective_name: z.string().min(3) });
router.post('/', validateBody(createProfileBody), createProfileController);

// GET /profiles/:profileId
const paramsSchema = z.object({ profileId: zId });
router.get('/:profileId', validateParams(paramsSchema), getProfileController);

export default router;
