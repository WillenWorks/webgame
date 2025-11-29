// src/routes/caseApiV1Routes.js
import { Router } from "express"

const router = Router()

router.get("/cases/available", (req, res) => {
  res.json({ status: "pending-implementation", data: [] })
})

router.post("/cases/:id/start", (req, res) => {
  res.json({ status: "pending-implementation", caseId: req.params.id })
})

router.post("/cases/:id/step/:stepId", (req, res) => {
  res.json({
    status: "pending-implementation",
    caseId: req.params.id,
    stepId: req.params.stepId,
  })
})

router.post("/cases/:id/warrant", (req, res) => {
  res.json({
    status: "pending-implementation",
    caseId: req.params.id,
    payload: req.body || null,
  })
})

export default router
