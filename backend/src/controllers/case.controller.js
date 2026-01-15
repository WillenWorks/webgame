import {
  createCaseService,
  getActiveCaseService
} from '../services/case.service.js';
import { getCaseById } from '../repositories/warrant.repo.js';
import { getCaseTimeSummary } from '../services/time.service.js';
import dayjs from 'dayjs';

function parseNumericStartToISO(num) {
  // Expect format YYYYMMDDHHmmss as bigint
  if (!num) return null;
  const s = String(num).padStart(14, '0');
  const year = s.slice(0,4);
  const month = s.slice(4,6);
  const day = s.slice(6,8);
  const hour = s.slice(8,10);
  const min = s.slice(10,12);
  const sec = s.slice(12,14);
  const iso = `${year}-${month}-${day}T${hour}:${min}:${sec}.000Z`;
  return dayjs(iso).isValid() ? iso : null;
}

export async function createCaseController(req, res, next) {
  try {
    const result = await createCaseService({
      profileId: req.user?.profileId,
      difficulty: req.body?.difficulty ?? 'EASY'
    });

    res.status(201).json({ ok: true, case: result });
  } catch (err) {
    next(err);
  }
}

export async function getActiveCaseController(req, res, next) {
  try {
    const result = await getActiveCaseService(req.user?.profileId);
    // Anexar resumo temporal ISO UTC
    let timeSummary = null;
    if (result?.id) {
      try { timeSummary = await getCaseTimeSummary({ caseId: result.id }); } catch {}
    }
    res.json({ ok: true, case: result, timeState: timeSummary });
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
    const startISO = parseNumericStartToISO(result.start_time);
    let timeSummary = null;
    try { timeSummary = await getCaseTimeSummary({ caseId }); } catch {}
    res.json({ ok: true, case: { ...result, start_time_iso: startISO }, timeState: timeSummary });
  } catch (err) {
    next(err);
  }
}
