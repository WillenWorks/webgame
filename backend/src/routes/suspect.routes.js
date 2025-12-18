import { filterSuspectsService } from '../services/suspect_filter.service.js';
import { validate } from '../middlewares/validate.middleware.js';
import { z } from 'zod';
import { Router } from 'express';

const router = Router();

// Schema para filtros (GET via query OU POST via body)
const filterSchema = z.object({
  sex_id: z.string().optional(),
  hair_id: z.string().optional(),
  hobby_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  feature_id: z.string().optional(),
});

// GET /cases/:caseId/suspects/filter?hair_id=..&vehicle_id=..
router.get('/:caseId/suspects/filter', validate(filterSchema), async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    const suspects = await filterSuspectsService(caseId, req.validated);
    res.json({ ok: true, count: suspects.length, suspects });
  } catch (err) {
    next(err);
  }
});

// POST /cases/:caseId/suspects/filter (body raw JSON)
router.post('/:caseId/suspects/filter', validate(filterSchema), async (req, res, next) => {
  try {
    const caseId = req.params.caseId;
    const suspects = await filterSuspectsService(caseId, req.validated);
    res.json({ ok: true, count: suspects.length, suspects });
  } catch (err) {
    next(err);
  }
});

export default router;
