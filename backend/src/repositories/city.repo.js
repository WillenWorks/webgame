import pool from '../config/database.js';

export async function getCityById(cityId) {
  const [rows] = await pool.query(
    'SELECT id, ST_Y(geo_coordinates) AS lat, ST_X(geo_coordinates) AS lng, country_id FROM cities WHERE id = ? LIMIT 1',
    [cityId]
  );
  return rows[0] || null;
}
