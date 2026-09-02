import { investigateService } from '../services/investigate.service.js';

export async function investigateController(req, res, next) {
  try {
    const result = await investigateService(req.params.caseId, req.body.placeId);

    // Shape plano e consistente: { ok, text, timeState, clueType?, gameOver?, solved?, xpEarned?, repDelta? }
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
}
