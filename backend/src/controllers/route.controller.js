import { generateRouteService } from '../services/route.generator.service.js';
import { getRouteByCaseId } from '../repositories/route.repo.js';

export async function generateRouteController(req, res, next) {
  try {
    const route = await generateRouteService({
      activeCaseId: req.body.caseId
    });

    res.status(201).json({
      ok: true,
      route
    });
  } catch (err) {
    next(err);
  }
}

export async function getRouteController(req, res, next) {
  try {
    const route = await getRouteByCaseId(req.params.caseId);

    res.json({
      ok: true,
      route
    });
  } catch (err) {
    next(err);
  }
}
