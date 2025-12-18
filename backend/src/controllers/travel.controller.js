import { travelService } from '../services/travel.service.js';

export async function travelController(req, res, next) {
  try {
    const result = await travelService(
      req.params.caseId,
      req.body.cityId
    );

    res.json({
      ok: true,
      ...result
    });
  } catch (err) {
    next(err);
  }
}
