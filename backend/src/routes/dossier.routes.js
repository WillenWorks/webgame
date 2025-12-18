import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { z } from 'zod';
import { setDossierNotesService, getDossierNotesService, clearDossierFieldService, clearDossierNotesService } from '../services/dossier.service.js';

const router = Router();

// GET notas salvas
router.get('/:caseId/dossier', async (req, res, next) => {
  try {
    const notes = await getDossierNotesService(req.params.caseId, req.user.profileId);
    res.json({ ok: true, notes });
  } catch (err) { next(err); }
});

// PUT notas (inserir/atualizar características anotadas)
const notesSchema = z.object({
  sex_id: z.string().optional(),
  hair_id: z.string().optional(),
  hobby_id: z.string().optional(),
  vehicle_id: z.string().optional(),
  feature_id: z.string().optional(),
});
router.put('/:caseId/dossier', validate(notesSchema), async (req, res, next) => {
  try {
    const saved = await setDossierNotesService(req.params.caseId, req.user.profileId, req.validated);
    res.json({ ok: true, notes: saved });
  } catch (err) { next(err); }
});

// DELETE um campo específico
router.delete('/:caseId/dossier/:field', async (req, res, next) => {
  try {
    const notes = await clearDossierFieldService(req.params.caseId, req.user.profileId, req.params.field);
    res.json({ ok: true, notes });
  } catch (err) { next(err); }
});

// DELETE todos os campos
router.delete('/:caseId/dossier', async (req, res, next) => {
  try {
    await clearDossierNotesService(req.params.caseId, req.user.profileId);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
