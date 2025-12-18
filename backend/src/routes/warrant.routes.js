import { z } from 'zod';
import { validateBody, validateParams, zId, zNum } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import { issueWarrantController } from "../controllers/warrant.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
router.use(authMiddleware);

const caseParams = z.object({ caseId: zId });
const warrantBody = z.object({ suspectId: zId });

router.post("/cases/:caseId/warrant", validateParams(caseParams), validateBody(warrantBody), issueWarrantController);

export default router;
