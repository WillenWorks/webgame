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

// Funções específicas do MVP
export function getCase() {
  return apiGet("/case")
}

export function getCities() {
  return apiGet("/cities")
}

export function getClues() {
  return apiGet("/clues")
}

export function getSuspect() {
  return apiGet("/suspect")
}
