import pool from '../config/database.js';

export async function insertCapturedVillainLog({ id, profileId, villainName, attributesSnapshot, finalDialogue }) {
  const sql = `
    INSERT INTO captured_villains_log
      (id, profile_id, villain_name, attributes_snapshot, final_dialogue)
    VALUES (?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, profileId, villainName, JSON.stringify(attributesSnapshot || null), finalDialogue || null]);
}
