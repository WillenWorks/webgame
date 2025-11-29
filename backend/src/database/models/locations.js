// src/database/models/locations.js
import { getDbPool } from "../database.js"

export async function findAllLocations() {
  const pool = getDbPool()
  const [rows] = await pool.query("SELECT * FROM locations")
  return rows
}

export async function findLocationByCode(code) {
  const pool = getDbPool()
  const [rows] = await pool.query("SELECT * FROM locations WHERE code = ?", [
    code,
  ])
  return rows[0] || null
}

export async function createLocation(data) {
  const pool = getDbPool()
  const { code, name, type, country, region, description } = data
  const [result] = await pool.query(
    `INSERT INTO locations (code, name, type, country, region, description) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      code,
      name,
      type || "city",
      country || null,
      region || null,
      description || null,
    ],
  )
  return result.insertId
}
