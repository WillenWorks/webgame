// frontend/services/gameApi.js
import axios from "axios"

const API_BASE_URL =
  process.env.NUXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3333/api/v1"

function unwrap(response) {
  // Backend responde no formato { status: "ok", data: ... }
  if (response && response.data && response.data.status === "ok") {
    return response.data.data
  }
  // Em caso de erro padronizado
  if (response && response.data && response.data.message) {
    throw new Error(response.data.message)
  }
  return response.data
}

/**
 * Perfil do agente (cargo, xp, reputação, casos resolvidos/falhos)
 */
export async function getAgentProfile(agentId = 1) {
  const res = await axios.get(`${API_BASE_URL}/agents/${agentId}/profile`)
  return unwrap(res)
}

/**
 * Casos disponíveis para o agente.
 * Backend já aplica a regra de:
 *  - trainee / field_agent -> 1 caso designado
 *  - senior+ -> lista de casos
 */
export async function getAvailableCases(agentId = 1) {
  const res = await axios.get(`${API_BASE_URL}/cases/available`, {
    params: { agentId },
  })
  return unwrap(res)
}

/**
 * Inicia ou retoma um caso.
 */
export async function startCase(caseId, agentId = 1) {
  const res = await axios.post(`${API_BASE_URL}/cases/${caseId}/start`, {
    agentId,
  })
  return unwrap(res)
}

/**
 * Status completo da investigação de um caso.
 */
export async function getCaseStatus(caseId, agentId = 1) {
  const res = await axios.get(`${API_BASE_URL}/cases/${caseId}/status`, {
    params: { agentId },
  })
  return unwrap(res)
}

/**
 * Avança a etapa da investigação.
 */
export async function nextStep(caseId, agentId = 1) {
  const res = await axios.post(
    `${API_BASE_URL}/cases/${caseId}/step/next`,
    {
      agentId,
    },
  )
  return unwrap(res)
}

/**
 * Emite mandado de prisão para um suspeito.
 */
export async function issueWarrant(caseId, suspectId, agentId = 1) {
  const res = await axios.post(
    `${API_BASE_URL}/cases/${caseId}/warrant`,
    {
      agentId,
      suspectId,
    },
  )
  return unwrap(res)
}
