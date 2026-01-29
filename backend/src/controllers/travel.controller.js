import { travelService } from '../services/travel.service.js';
import { estimateTravelMinutes } from '../services/time.service.js';
import { getCurrentCityByCase } from '../repositories/visit.repo.js';

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

export async function getTravelQuoteController(req, res, next) {
  try {
    const { caseId } = req.params;
    const toCityId = Number(req.query.to);

    if (!toCityId) {
      return res.status(400).json({ ok: false, error: { code: 'VALIDATION', message: 'Query param "to" (cityId) é obrigatório' } });
    }

    const currentCity = await getCurrentCityByCase(caseId);
    if (!currentCity) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Cidade atual não encontrada' } });
    }

    const minutes = await estimateTravelMinutes({
      fromCityId: currentCity.city_id,
      toCityId: toCityId,
      caseId
    });

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const formatted = hours > 0 ? `${hours}h${mins > 0 ? ` ${mins}m` : ''}` : `${mins}m`;

    res.json({
      ok: true,
      estimate: {
        fromCityId: currentCity.city_id,
        toCityId,
        minutes,
        formatted
      }
    });
  } catch (err) {
    next(err);
  }
}
