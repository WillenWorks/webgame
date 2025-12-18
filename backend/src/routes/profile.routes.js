import { Router } from 'express';
import {
  createProfileController,
  listProfilesController,
  getProfileController
} from '../controllers/profile.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authMiddleware);

router.post('/', createProfileController);
router.get('/', listProfilesController);
router.get('/:profileId', getProfileController);

export default router;
