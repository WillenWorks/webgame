import pool from '../config/database.js';

export async function insertSuspect(suspect) {
  const sql = `
    INSERT INTO case_suspect_pool  (
      id,
      case_id,
      name,
      sex_id,
      hair_id,
      hobby_id,
      vehicle_id,
      feature_id,
      is_culprit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    suspect.id,
    suspect.case_id,
    suspect.name,
    suspect.sex_id,
    suspect.hair_id,
    suspect.hobby_id,
    suspect.vehicle_id,
    suspect.feature_id,
    suspect.is_culprit
  ];

  await pool.execute(sql, values);
}

export async function getSuspectsByCase(caseId) {
  const sql = `
    SELECT
      s.id,
      s.name,
      sx.label AS sex,
      h.label AS hair,
      hb.label AS hobby,
      v.label AS vehicle,
      f.label AS feature,
      s.is_culprit
    FROM case_suspect_pool s
    JOIN attr_sex sx ON sx.id = s.sex_id
    JOIN attr_hair h ON h.id = s.hair_id
    JOIN attr_hobby hb ON hb.id = s.hobby_id
    JOIN attr_vehicle v ON v.id = s.vehicle_id
    JOIN attr_feature f ON f.id = s.feature_id
    WHERE s.case_id = ?
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows;
}

export async function getCulpritByCase(caseId) {
  const sql = `
    SELECT
      s.id,
      s.name,
      s.sex_id,
      sx.label AS sex,
      s.hair_id,
      h.label AS hair,
      s.hobby_id,
      hb.label AS hobby,
      s.vehicle_id,
      v.label AS vehicle,
      s.feature_id,
      f.label AS feature
    FROM case_suspect_pool s
    JOIN attr_sex sx ON sx.id = s.sex_id
    JOIN attr_hair h ON h.id = s.hair_id
    JOIN attr_hobby hb ON hb.id = s.hobby_id
    JOIN attr_vehicle v ON v.id = s.vehicle_id
    JOIN attr_feature f ON f.id = s.feature_id
    WHERE s.case_id = ?
      AND s.is_culprit = 1
    LIMIT 1
  `;
  const [rows] = await pool.execute(sql, [caseId]);
  return rows[0];
}


export async function filterSuspects(caseId, filters) {
  const clauses = ['case_id = ?'];
  const params = [caseId];

  if (filters.sex_id) { clauses.push('sex_id = ?'); params.push(filters.sex_id); }
  if (filters.hair_id) { clauses.push('hair_id = ?'); params.push(filters.hair_id); }
  if (filters.hobby_id) { clauses.push('hobby_id = ?'); params.push(filters.hobby_id); }
  if (filters.vehicle_id) { clauses.push('vehicle_id = ?'); params.push(filters.vehicle_id); }
  if (filters.feature_id) { clauses.push('feature_id = ?'); params.push(filters.feature_id); }

  const where = clauses.join(' AND ');
  const sql = `
    SELECT id, name, sex_id, hair_id, hobby_id, vehicle_id, feature_id, is_culprit
    FROM case_suspect_pool
    WHERE ${where}
  `;

  const [rows] = await pool.execute(sql, params);
  return rows;
}