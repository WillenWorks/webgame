import { z } from 'zod';
import { validateBody, validateParams, zId } from '../middlewares/validate.middleware.js';
import { requireProfileMiddleware } from '../middlewares/require_profile.middleware.js';
import { Router } from 'express';
import { listProfilesController, createProfileController, getProfileController, updateProfileController, getProfileByNameController } from '../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();
router.use(authMiddleware);

// GET /profiles → lista todos do usuário logado
router.get('/', requireProfileMiddleware, listProfilesController);

// GET /profiles/:profileId → busca por id
const paramsSchema = z.object({ profileId: zId });
router.get('/:profileId', validateParams(paramsSchema), requireProfileMiddleware, getProfileController);

// GET /profiles/:profileId/summary
import { getProfileSummaryController } from '../controllers/profile_summary.controller.js';
router.get('/:profileId/summary', validateParams(paramsSchema), requireProfileMiddleware, getProfileSummaryController);

// GET /profiles/by-name/:name → busca por nome (do usuário logado)
const nameParamsSchema = z.object({ name: z.string().min(3) });
router.get('/by-name/:name', validateParams(nameParamsSchema), requireProfileMiddleware, getProfileByNameController);

// POST /profiles → criar perfil novo
const createProfileBody = z.object({ detective_name: z.string().min(3) });
router.post('/', validateBody(createProfileBody), createProfileController);

// PUT /profiles/:profileId → editar perfil (nome)
const updateProfileBody = z.object({ detective_name: z.string().min(3) });
router.put('/:profileId', validateParams(paramsSchema), validateBody(updateProfileBody), requireProfileMiddleware, updateProfileController);

export default router;
