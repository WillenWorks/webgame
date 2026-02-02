import { listSuspectsService } from '../services/suspect.service.js';

export async function listSuspectsController(req, res, next) {
  try {
    // Extract potential filter params from query string
    const { sex_id, hair_id, hobby_id, vehicle_id, feature_id } = req.query;
    
    // Construct filters object, ignoring undefined values
    const filters = {};
    if (sex_id) filters.sex_id = sex_id;
    if (hair_id) filters.hair_id = hair_id;
    if (hobby_id) filters.hobby_id = hobby_id;
    if (vehicle_id) filters.vehicle_id = vehicle_id;
    if (feature_id) filters.feature_id = feature_id;

    // Pass filters to the service
    const suspects = await listSuspectsService(req.params.caseId, filters);

    res.json({
      ok: true,
      suspects
    });
  } catch (err) {
    next(err);
  }
}
