import { getProfileSummary } from '../services/profile_summary.service.js';

export async function getProfileSummaryController(req, res, next) {
  try {
    const { profileId } = req.params;
    const summary = await getProfileSummary({ profileId });
    if (!summary?.profile) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Perfil não encontrado' } });
    }
    res.json({ ok: true, summary });
  } catch (err) {
    next(err);
  }
}
