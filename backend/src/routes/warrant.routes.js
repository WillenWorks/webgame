import { Router } from 'express';
import { issueWarrantController } from "../controllers/warrant.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/cases/:caseId/warrant", authMiddleware, issueWarrantController);

export default router;
