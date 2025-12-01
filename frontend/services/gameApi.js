// services/gameApi.js
import axios from "axios"

const API_BASE_URL =
  process.env.NUXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:3333/api/v1"

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

function handleError(error) {
  console.error("[gameApi] erro na requisição:", error)
  if (error.response?.data) {
    throw error.response.data
  }
  throw { status: "error", message: "Erro de comunicação com o servidor." }
}

export async function getAvailableCases(agentId = 1) {
  try {
    const res = await api.get("/cases/available", {
      params: { agentId },
    })
    return res.data.data // array de casos
  } catch (err) {
    handleError(err)
  }
}

export async function startCase(caseId, agentId = 1) {
  try {
    const res = await api.post(`/cases/${caseId}/start`, { agentId })
    return res.data.data // { case, currentStep, progress, suspects }
  } catch (err) {
    handleError(err)
  }
}

export async function getCaseStatus(caseId, agentId = 1) {
  try {
    const res = await api.get(`/cases/${caseId}/status`, {
      params: { agentId },
    })
    return res.data.data // { case, currentStep, progress, clues, suspects, canIssueWarrant }
  } catch (err) {
    handleError(err)
  }
}

export async function getCurrentStep(caseId, agentId = 1) {
  try {
    const res = await api.get(`/cases/${caseId}/step/current`, {
      params: { agentId },
    })
    return res.data.data // { case, currentStep, progress, clues, canIssueWarrant }
  } catch (err) {
    handleError(err)
  }
}

export async function nextStep(caseId, agentId = 1) {
  try {
    const res = await api.post(`/cases/${caseId}/step/next`, { agentId })
    return res.data.data // { case, currentStep, progress, clues, suspects, canIssueWarrant, reachedEnd }
  } catch (err) {
    handleError(err)
  }
}

export async function issueWarrant(caseId, suspectId, agentId = 1) {
  try {
    const res = await api.post(`/cases/${caseId}/warrant`, {
      agentId,
      suspectId,
    })
    return res.data // { status, result, caseStatus, selectedSuspect, message }
  } catch (err) {
    handleError(err)
  }
}
