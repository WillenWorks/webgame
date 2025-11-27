const express = require("express")
const router = express.Router()

const {
  caseData,
  cities,
  clues,
  suspect,
} = require("../data/gameData")

// --------------------------
// ROTAS PRINCIPAIS DO MVP
// --------------------------

// Rota do caso piloto
router.get("/case", (req, res) => {
  res.json(caseData)
})

// Lista de cidades
router.get("/cities", (req, res) => {
  res.json(cities)
})

// Lista de pistas
router.get("/clues", (req, res) => {
  res.json(clues)
})

// Dados do suspeito principal
router.get("/suspect", (req, res) => {
  res.json(suspect)
})

// --------------------------
// ROTAS OPCIONAIS PARA EXPANSÃO
// --------------------------

// Buscar cidade por ID
router.get("/cities/:id", (req, res) => {
  const city = cities.find((c) => c.cityId === req.params.id)
  if (!city) return res.status(404).json({ error: "Cidade não encontrada." })
  res.json(city)
})

// Buscar pistas a partir de uma cidade
router.get("/clues/from/:cityId", (req, res) => {
  const filtered = clues.filter((c) => c.fromCityId === req.params.cityId)
  res.json(filtered)
})

module.exports = router
