import { getCaseById, getSuspectById, markWarrant } from "../repositories/warrant.repo.js";

/**
 * Emite mandado de prisão contra um suspectId.
 *
 * A regra "só emitir com 1 suspeito na pool" é aplicada no frontend: as notas
 * do dossiê são JSON livre e não chegam ao backend, então aqui só validamos
 * que o caso está ativo, sem mandado, e que o suspeito existe.
 */
export async function issueWarrantService({ caseId, suspectId }) {
  const gameCase = await getCaseById(caseId);
  if (!gameCase) throw new Error("Caso não encontrado");
  if (gameCase.status !== "ACTIVE") throw new Error("Caso não está ativo");
  if (gameCase.warrant_suspect_id) throw new Error("Mandado já emitido para este caso");

  const suspectExists = await getSuspectById(caseId, suspectId);
  if (!suspectExists) throw new Error("Suspeito inválido");

  await markWarrant(caseId, suspectId);
  return { ok: true, result: "WARRANT_ISSUED", message: "Mandado emitido." };
}
