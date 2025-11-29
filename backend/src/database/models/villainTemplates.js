// src/database/models/villainTemplates.js
import { getDbPool } from "../database.js"

export async function findAllVillainTemplates() {
  const pool = getDbPool()
  const [rows] = await pool.query(
    "SELECT * FROM villain_templates WHERE active = 1",
  )
  return rows
}

export async function findVillainTemplateById(id) {
  const pool = getDbPool()
  const [rows] = await pool.query(
    "SELECT * FROM villain_templates WHERE id = ?",
    [id],
  )
  return rows[0] || null
}

export async function createVillainTemplate(data) {
  const pool = getDbPool()
  const {
    code,
    name,
    sex,
    occupation,
    hobby,
    hair_color,
    vehicle,
    feature,
    other,
    danger_level,
  } = data

  const [result] = await pool.query(
    `INSERT INTO villain_templates 
    (code, name, sex, occupation, hobby, hair_color, vehicle, feature, other, danger_level) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      code,
      name,
      sex || null,
      occupation || null,
      hobby || null,
      hair_color || null,
      vehicle || null,
      feature || null,
      other || null,
      danger_level || 1,
    ],
  )

  return result.insertId
}
