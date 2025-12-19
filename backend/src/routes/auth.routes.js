import { z } from 'zod';
import { validateBody } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import { registerController, loginController } from '../controllers/auth.controller.js';
import { refreshTokenController, revokeRefreshTokenController } from '../controllers/auth_refresh.controller.js';

const router = Router();

const registerSchema = z.object({
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

const refreshSchema = z.object({ refreshToken: z.string().min(10) });

router.post('/register', validateBody(registerSchema), registerController);
router.post('/login', validateBody(loginSchema), loginController);
router.post('/refresh', validateBody(refreshSchema), refreshTokenController);
router.post('/revoke', validateBody(refreshSchema), revokeRefreshTokenController);

export default router;
