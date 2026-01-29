import { getRevealedCluesService } from '../services/clue.service.js';

export async function getRevealedCluesController(req, res, next) {
  try {
    const result = await getRevealedCluesService(req.params.caseId);
    res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
