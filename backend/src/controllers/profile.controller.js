import {
  createProfileService,
  listProfilesService,
  getProfileService
} from '../services/profile.service.js';

export async function createProfileController(req, res, next) {
  try {
    const result = await createProfileService({
      userId: req.userId,
      detectiveName: req.body.detective_name
    });

    res.status(201).json({ ok: true, profile: result });
  } catch (err) {
    next(err);
  }
}

export async function listProfilesController(req, res, next) {
  try {
    const profiles = await listProfilesService(req.userId);
    res.json({ ok: true, profiles });
  } catch (err) {
    next(err);
  }
}

export async function getProfileController(req, res, next) {
  try {
    const profile = await getProfileService(
      req.params.profileId,
      req.userId
    );

    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
}
