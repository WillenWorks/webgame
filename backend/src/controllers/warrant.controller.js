import { issueWarrantService } from "../services/warrant.service.js";

export async function issueWarrantController(req, res) {
  try {
    const { caseId } = req.params;
    const { suspectId } = req.body;
    const profileId = req.user.profileId;

    if (!suspectId) {
      return res.status(400).json({
        ok: false,
        message: "suspectId é obrigatório",
      });
    }

    const result = await issueWarrantService({
      caseId,
      suspectId,
      profileId,
    });

    return res.json({
      ok: result.result === "CAPTURED",
      ...result,
    });
  } catch (err) {
    return res.status(400).json({
      ok: false,
      message: err.message,
    });
  }
}
