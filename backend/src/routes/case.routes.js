import { z } from 'zod';
import { validateBody, validateParams, zId, zNum } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import { requireProfileMiddleware } from '../middlewares/require_profile.middleware.js';
import {
  createCaseController,
  getActiveCaseController,
  getCaseByIdController
} from '../controllers/case.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { visitCurrentCityController } from '../controllers/visit.controller.js';
import { investigateController } from '../controllers/investigate.controller.js';
import { travelController } from '../controllers/travel.controller.js';
import { listSuspectsController } from '../controllers/suspect.controller.js';
import { getCasePerformanceController } from '../controllers/case_performance.controller.js';
import { listTravelLogController } from '../controllers/travel_log.controller.js';

const router = Router();
router.use(authMiddleware);

// POST /cases (body: profileId)
const createCaseSchema = z.object({ difficulty: z.enum(['EASY','HARD','EXTREME']).optional() });
router.post('/', requireProfileMiddleware, validateBody(createCaseSchema), createCaseController);

// GET /cases/active (sem body)
router.get('/active', requireProfileMiddleware, getActiveCaseController);

// GET /cases/:caseId
const caseIdParams = z.object({ caseId: zId });
router.get('/:caseId', validateParams(caseIdParams), getCaseByIdController);
// GET /cases/:caseId/performance
router.get('/:caseId/performance', validateParams(caseIdParams), getCasePerformanceController);

// GET /cases/:caseId/suspects
router.get('/:caseId/suspects', validateParams(caseIdParams), listSuspectsController);

// GET /cases/:caseId/visit-current
router.get('/:caseId/visit-current', validateParams(caseIdParams), visitCurrentCityController);

// GET /cases/:caseId/travel-log
router.get('/:caseId/travel-log', validateParams(caseIdParams), listTravelLogController);

// POST /cases/:caseId/investigate (body: placeId)
const investigateBody = z.object({ placeId: zId });
router.post('/:caseId/investigate', validateParams(caseIdParams), validateBody(investigateBody), investigateController);

// POST /cases/:caseId/travel (body: cityId)
const travelBody = z.object({ cityId: zNum });
router.post('/:caseId/travel', validateParams(caseIdParams), validateBody(travelBody), travelController);

export default router;
