import {
  createProfileService,
  listProfilesService,
  getProfileService,
  updateProfileService,
  getProfileByNameService,
} from "../services/profile.service.js";

export async function createProfileController(req, res, next) {
  try {
    const result = await createProfileService({
      userId: req.user?.userId,
      detectiveName: req.body.detective_name,
    });

    res.status(201).json({ ok: true, profile: result });
  } catch (err) {
    next(err);
  }
}
export async function getProfileByNameController(req, res, next) {
  try {
    const profile = await getProfileByNameService(
      req.params.name,
      req.user?.userId
    );
    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
}

export async function listProfilesController(req, res, next) {
  try {
    const profiles = await listProfilesService(req.user?.userId);
    res.json({ ok: true, profiles });
  } catch (err) {
    next(err);
  }
}

export async function updateProfileController(req, res, next) {
  try {
    const updated = await updateProfileService({
      userId: req.user?.userId,
      profileId: req.params.profileId,
      detectiveName: req.body?.detective_name,
    });
    res.json({ ok: true, profile: updated });
  } catch (err) {
    next(err);
  }
}

export async function getProfileController(req, res, next) {
  try {
    const profile = await getProfileService(
      req.params.profileId,
      req.user?.userId
    );

    res.json({ ok: true, profile });
  } catch (err) {
    next(err);
  }
}
