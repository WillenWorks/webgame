import express from 'express'
import { getCityById } from '../repositories/city.repo.js'

const router = express.Router()

router.get('/:id', async (req, res) => {
  try {
    const city = await getCityById(req.params.id)

    if (!city) {
      return res.status(404).json({ ok: false, message: 'City not found' })
    }

    res.json({
      ok: true,
      city
    })
  } catch (e) {
    console.error('[CITY ROUTE]', e)
    res.status(500).json({ ok: false })
  }
})

export default router
