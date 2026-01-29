import pool from '../config/database.js';

export async function getCityById(cityId) {
  const [rows] = await pool.query(
    'SELECT c.id, ST_Y(c.geo_coordinates) AS lat, ST_X(c.geo_coordinates) AS lng, c.country_id, c.name as city, c.description_prompt, c.image_url, co.name as county FROM cities as c INNER JOIN countries as co ON c.country_id = co.id WHERE c.id = ? LIMIT 1',
    [cityId]
  );
  return rows[0] || null;
}
