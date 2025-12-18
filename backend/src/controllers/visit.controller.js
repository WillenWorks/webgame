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


// export async function visitCityService(caseId, requestedCityId = null) {
//   if (!caseId) {
//     throw new Error("CaseId não informado");
//   }

//   // Cidade atual (primeiro passo não visitado)
//   const current = await getCurrentCityByCase(caseId);
//   if (!current) {
//     throw new Error("Cidade atual não encontrada");
//   }

//   let targetCityId = current.city_id;

//   // Se o usuário especificou uma cidade, validar que ela pertence às opções do step atual
//   if (requestedCityId) {
//     const optionsMeta = await getStepOptions(caseId, current.step_order);
//     const allowed = Array.isArray(optionsMeta?.options)
//       ? optionsMeta.options
//       : [];
//     if (!allowed.includes(requestedCityId)) {
//       throw new Error("Cidade inválida para visita neste passo");
//     }
//     targetCityId = requestedCityId;
//   }

//   // Garantir que existem locais para a cidade alvo
//   const existingPlaces = await getCityPlaces(caseId, targetCityId);
//   if (existingPlaces.length === 0) {
//     // Se não foram semeados previamente (edge cases), criar 3 locais com place_types aleatórios
//     const [placeTypes] = await pool.execute(
//       `SELECT id, name, interaction_style FROM place_types ORDER BY RAND()`
//     );
//     const chosen = placeTypes.slice(0, 3);
//     const clueTypes = ["VILLAIN", "VILLAIN", "VILLAIN"]; // cidades decoy não oferecem NEXT_LOCATION
//     for (let i = 0; i < chosen.length; i++) {
//       await insertCityPlace({
//         id: uuid(),
//         caseId,
//         cityId: targetCityId,
//         placeTypeId: chosen[i].id,
//         clueType: clueTypes[i] || "VILLAIN",
//       });
//     }
//   }

//   const places = await getCityPlaces(caseId, targetCityId);

//   return {
//     city: {
//       step_order: current.step_order,
//       city_id: targetCityId,
//     },
//     places,
//   };
// }
