// services/city.service.js
import { getCityById } from '../repositories/city.repo.js';
import { getEntityImage } from './image.generator.service.js';

export async function getCityByIdService(cityId) {
  if (!cityId) {
    throw new Error('cityId não informado');
  }

  const city = await getCityById(cityId);
  if (!city) {
    throw new Error('Cidade não encontrada');
  }

  // Attach Image
  // Using name + country as unique identifier/description
  const description = `${city.city}, ${city.county || 'Unknown Country'}. Famous landmark or cityscape.`;
  const imageUrl = await getEntityImage('city', city.id, description);

  return {
    ...city,
    imageUrl
  };
}
