import { visitCurrentCityService } from "../services/visit.service.js";

// Controller atualizado: NÃO depende mais de cityId na query.
// A cidade retornada é determinada pela visão persistida (case_current_view)
// e pela lógica de getCurrentCityByCase no visit.repo.js.
export async function visitCurrentCityController(req, res, next) {
  try {
    const caseId = req.params.caseId;

    const result = await visitCurrentCityService(caseId);

    res.json({
      ok: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}
