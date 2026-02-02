// services/city.service.js
import { getCityById } from '../repositories/city.repo.js';

export async function getCityByIdService(cityId) {
  if (!cityId) {
    throw new Error('cityId não informado');
  }

  const city = await getCityById(cityId);
  if (!city) {
    throw new Error('Cidade não encontrada');
  }

  // Image generation disabled
  // Using static placeholder
  const imageUrl = '/images/city-placeholder.png';

  return {
    ...city,
    imageUrl
  };
}
