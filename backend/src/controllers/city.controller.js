// controllers/city.controller.js
import { getCityByIdService } from '../services/city.service.js';

export async function getCityByIdController(req, res) {
  try {
    const { cityId } = req.params;

    const city = await getCityByIdService(cityId);

    return res.json({
      ok: true,
      city: {
        id: city.id,
        lat: city.lat,
        lon: city.lng,
        country_id: city.country_id,
        description_prompt: city.description_prompt,
        image_url: city.image_url
      },
    });
  } catch (err) {
    console.error('[CITY] erro ao buscar cidade', err);

    return res.status(400).json({
      ok: false,
      error: err.message,
    });
  }
}
