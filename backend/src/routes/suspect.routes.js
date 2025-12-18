import { z } from 'zod';
import { validateBody, validateParams, validateQuery, zId } from '../middlewares/validate.middleware.js';
import { Router } from 'express';
import { filterSuspectsService } from '../services/suspect_filter.service.js';

const router = Router();

const caseIdParams = z.object({ caseId: zId });
const filterSchema = z.object({
  sex_id: z.string().optional(),
  hair_id: z.string().optional(),
  hobby_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  feature_id: z.string().optional(),
});

// GET /cases/:caseId/suspects/filter?hair_id=..&vehicle_id=..
router.get('/:caseId/suspects/filter', validateParams(caseIdParams), validateQuery(filterSchema), async (req, res, next) => {
  try {
    const caseId = req.validated.params.caseId;
    const suspects = await filterSuspectsService(caseId, req.validated.query);
    res.json({ ok: true, count: suspects.length, suspects });
  } catch (err) {
    next(err);
  }
});

// POST /cases/:caseId/suspects/filter (body raw JSON)
router.post('/:caseId/suspects/filter', validateParams(caseIdParams), validateBody(filterSchema), async (req, res, next) => {
  try {
    const caseId = req.validated.params.caseId;
    const suspects = await filterSuspectsService(caseId, req.validated.body);
    res.json({ ok: true, count: suspects.length, suspects });
  } catch (err) {
    next(err);
  }
});

export default router;
