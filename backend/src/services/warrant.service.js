import { getCaseById, getSuspectById, markWarrant } from "../repositories/warrant.repo.js";
import { filterSuspects } from '../repositories/suspect.repo.js';

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

  // Verificar se o filtro resulta em APENAS UM suspeito (lógica de jogo)
  // Reconstruir os atributos do suspeito selecionado para filtrar
  const filters = {
      sex_id: suspectExists.sex_id,
      hair_id: suspectExists.hair_id,
      hobby_id: suspectExists.hobby_id,
      vehicle_id: suspectExists.vehicle_id,
      feature_id: suspectExists.feature_id
  };
  
  // Mas espera, o mandado é emitido contra um ID específico.
  // Se o frontend já selecionou um ID, é porque o usuário clicou nele.
  // A regra "só pode emitir se tiver 1 na pool" é visual ou lógica?
  // Se o usuário "adivinhou" o suspeito sem filtrar, ele pode emitir?
  // Geralmente não. Devemos verificar se com as pistas ATUAIS (ou filtros aplicados) resta apenas 1.
  // Mas o backend não sabe quais filtros o usuário aplicou na UI.
  // Vamos assumir que se o usuário envia um ID, ele está convicto.
  // Porém, o usuário pediu: "Mandado só pode ser gerado quando tiver apenas um suspeito na pool"
  // Isso implica que devemos checar se existem outros suspeitos com as MESMAS características? Não.
  // Implica que o usuário deve ter filtrado até sobrar 1.
  // Mas o estado do filtro está no frontend.
  // Vamos deixar essa validação no frontend OU verificar se o suspectId enviado é o único compatível com as notas do dossiê (se existissem estruturadas).
  // Como não temos as notas estruturadas no backend (são JSON livre), não podemos validar estritamente.
  // Vamos manter a validação simples de existência, mas confiar que o frontend só habilita o botão quando count == 1.
  // O usuário disse: "Mandado só pode ser gerado quando tiver apenas um suspeito na pool, independente dos atributos selecionados."
  // Isso sugere que a validação deve ser "Se eu tenho 6 suspeitos, e filtro, e sobram 2, não posso emitir".
  // Mas a emissão é por ID. Se eu clico no ID X, eu estou escolhendo um.
  // Se o botão "Emitir Mandado" fica na tela de detalhes ou na lista?
  // Fica na lista (pelo screenshot).
  // Ok, vamos deixar o frontend lidar com a UI, mas no backend, se quiser ser estrito:
  // Não temos como saber o "pool atual" do usuário.
  
  await markWarrant(caseId, suspectId);
  return { ok: true, result: "WARRANT_ISSUED", message: "Mandado emitido." };
}
