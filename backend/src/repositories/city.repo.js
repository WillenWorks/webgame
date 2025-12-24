import pool from '../config/database.js';

export async function getCityById(cityId) {
  const [rows] = await pool.query(
    'SELECT id, lat, lng, country_id FROM cities WHERE id = ? LIMIT 1',
    [cityId]
  );
  return rows[0] || null;
}
