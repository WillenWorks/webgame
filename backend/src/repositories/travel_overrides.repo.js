import pool from '../config/database.js';

export async function getTravelOverrideMinutes(fromCityId, toCityId) {
  const [rows] = await pool.query(
    'SELECT minutes FROM travel_time_overrides WHERE from_city_id = ? AND to_city_id = ? LIMIT 1',
    [fromCityId, toCityId]
  );
  if (rows[0] && rows[0].minutes != null) return rows[0].minutes;
  return null;
}
