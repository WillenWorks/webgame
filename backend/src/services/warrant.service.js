import { getCaseById, getSuspectById, markWarrant } from "../repositories/warrant.repo.js";

/**
 * Emite mandado de prisão com base apenas em suspectId.
 * Pré-condição: o usuário já filtrou e encontrou um único suspeito via /suspects/filter.
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
