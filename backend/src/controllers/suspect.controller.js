import { listSuspectsService } from '../services/suspect.service.js';

export async function listSuspectsController(req, res, next) {
  try {
    const suspects = await listSuspectsService(req.params.caseId);

    res.json({
      ok: true,
      suspects
    });
  } catch (err) {
    next(err);
  }
}
