// services/api.js
// Camada de serviço para centralizar chamadas ao backend do Operação Monaco

const API_URL = "http://localhost:3333/api"

// Função genérica para GET
export async function apiGet(endpoint) {
  try {
    const response = await fetch(API_URL + endpoint)

    if (!response.ok) {
      console.error("Erro na resposta da API:", response.status, response.statusText)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Erro ao conectar com o backend:", error)
    return null
  }
}

// frontend/services/api.js
const API_BASE_URL = "http://localhost:3333"

async function handleResponse(response) {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Erro HTTP ${response.status}`)
  }
  return response.json()
}

// ---------------------------
// Endpoints já existentes
// (ajuste se teus nomes forem outros)
// ---------------------------
export async function pingBackend() {
  const res = await fetch(`${API_BASE_URL}/ping`)
  return handleResponse(res)
}

export async function getCase () {
  const res = await fetch(`${API_BASE_URL}/api/case`)
  return handleResponse(res)
}

export async function getCities() {
  const res = await fetch(`${API_BASE_URL}/api/cities`)
  return handleResponse(res)
}

export async function getSuspect() {
  const res = await fetch(`${API_BASE_URL}/api/suspect`)
  return handleResponse(res)
}

// ---------------------------
// NOVOS ENDPOINTS – GAMEPLAY
// ---------------------------

export async function startGame() {
  const res = await fetch(`${API_BASE_URL}/api/game/start`)
  return handleResponse(res)
}

export async function investigate(step, clueIndex) {
  const params = new URLSearchParams({
    step: String(step),
    clueIndex: String(clueIndex),
  })

  const res = await fetch(
    `${API_BASE_URL}/api/game/investigate?${params.toString()}`
  )
  return handleResponse(res)
}

export async function getConnections(step) {
  const params = new URLSearchParams({
    step: String(step),
  })

  const res = await fetch(
    `${API_BASE_URL}/api/game/connections?${params.toString()}`
  )
  return handleResponse(res)
}

export async function travel(step, chosenCityId) {
  const res = await fetch(`${API_BASE_URL}/api/game/travel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      step,
      chosenCityId,
    }),
  })

  return handleResponse(res)
}
