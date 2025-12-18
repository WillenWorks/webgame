import { listTravelLogsService } from '../services/travel_log.service.js';

export async function listTravelLogController(req, res, next) {
  try {
    const logs = await listTravelLogsService(req.params.caseId);
    res.json({ ok: true, logs });
  } catch (err) {
    next(err);
  }
}
