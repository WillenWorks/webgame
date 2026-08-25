import pool from '../src/config/database.js';

export async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS case_villain_clues (
      id CHAR(36) PRIMARY KEY,
      active_case_id CHAR(36) NOT NULL,
      attribute_type VARCHAR(50) NOT NULL,
      attribute_value VARCHAR(255) NOT NULL,
      target_ref_id CHAR(36),
      is_revealed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (active_case_id) REFERENCES active_cases(id) ON DELETE CASCADE
    );
  `;
  
  try {
      await pool.query(sql);
      console.log('Table case_villain_clues created/verified.');
  } catch (e) {
      console.error(e);
  }
}
