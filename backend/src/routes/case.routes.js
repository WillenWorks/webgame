import { Router } from 'express';
import {
  createCaseController,
  getActiveCaseController
} from '../controllers/case.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { visitCurrentCityController } from '../controllers/visit.controller.js';
import { investigateController } from '../controllers/investigate.controller.js';
import { travelController } from '../controllers/travel.controller.js';
import { listSuspectsController } from '../controllers/suspect.controller.js';
import { listTravelLogController } from '../controllers/travel_log.controller.js';


const router = Router();

router.use(authMiddleware);

router.post('/', createCaseController);
router.get('/active', getActiveCaseController);
router.get('/:caseId/suspects', listSuspectsController);
router.get('/:caseId/visit-current', visitCurrentCityController);
router.get('/:caseId/travel-log', listTravelLogController);
router.post('/:caseId/investigate', investigateController);
router.post('/:caseId/travel', travelController);

export default router;
