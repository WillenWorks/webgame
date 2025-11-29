// src/database/database.js
import mysql from "mysql2/promise"
import dotenv from "dotenv"

dotenv.config()

let pool

export function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    })
  }
  return pool
}

// helper simples para testar conexão
export async function testDbConnection() {
  const pool = getDbPool()
  const conn = await pool.getConnection()
  await conn.ping()
  conn.release()
}
