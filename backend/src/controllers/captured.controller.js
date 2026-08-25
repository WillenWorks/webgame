import { Router } from 'express';
import { getCapturedVillains } from '../repositories/captured.repo.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const profileId = req.user.profileId;
    if (!profileId) return res.status(400).json({ ok: false, message: 'Profile required' });
    
    const captures = await getCapturedVillains(profileId);
    return res.json({ ok: true, captures });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, message: err.message });
  }
});

export default router;
