import {
  createCaseService,
  getActiveCaseService
} from '../services/case.service.js';

export async function createCaseController(req, res, next) {
  try {
    const result = await createCaseService({
      profileId: req.body.profileId
    });

    res.status(201).json({
      ok: true,
      case: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getActiveCaseController(req, res, next) {
  try {
    const result = await getActiveCaseService(req.body.profileId);

    res.json({
      ok: true,
      case: result
    });
  } catch (err) {
    next(err);
  }
}
