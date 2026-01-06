import {
  createCaseService,
  getActiveCaseService
} from '../services/case.service.js';
import { getCaseById } from '../repositories/warrant.repo.js';

export async function createCaseController(req, res, next) {
  try {
    const result = await createCaseService({
      profileId: req.user?.profileId,
      difficulty: req.body?.difficulty ?? 'EASY'
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
    const result = await getActiveCaseService(req.user?.profileId);

    res.json({
      ok: true,
      case: result
    });
  } catch (err) {
    next(err);
  }
}

export async function getCaseByIdController(req, res, next) {
  try {
    const { caseId } = req.params;
    const result = await getCaseById(caseId);
    if (!result) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Caso não encontrado' } });
    }
    res.json({ ok: true, case: result });
  } catch (err) {
    next(err);
  }
}
