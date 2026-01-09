import { getCasePerformanceByCaseId } from '../repositories/case_performance.repo.js';

export async function getCasePerformanceController(req, res, next) {
  try {
    const { caseId } = req.params;
    const perf = await getCasePerformanceByCaseId(caseId);
    if (!perf) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Performance não encontrada' } });
    }
    res.json({ ok: true, performance: perf });
  } catch (err) {
    next(err);
  }
}
