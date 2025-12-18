import { investigateService } from '../services/investigate.service.js';

export async function investigateController(req, res, next) {
  try {
    const text = await investigateService(
      req.params.caseId,
      req.body.placeId // agora usa o ID do lugar (city_place.id)
    );

    res.json({
      ok: true,
      text,
    });
  } catch (err) {
    next(err);
  }
}
