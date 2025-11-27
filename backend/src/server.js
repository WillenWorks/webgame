const express = require("express")
const cors = require("cors")

const app = express()
const PORT = 3333

app.use(cors())
app.use(express.json())

// Importar rotas
const caseRoutes = require("./routes/caseRoutes")

// Registrar rotas na API
app.use("/api", caseRoutes)

// Rota básica
app.get("/ping", (req, res) => {
  res.json({ ok: true, message: "Operação Monaco backend online" })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚔 Backend Operação Monaco rodando em http://localhost:${PORT}`)
})
