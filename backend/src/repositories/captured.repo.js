import pool from '../config/database.js';

export async function insertCapturedVillainLog({ id, profileId, caseId, villainName, attributesSnapshot, finalDialogue }) {
  const sql = `
    INSERT INTO captured_villains_log
      (id, profile_id, case_id, villain_name, attributes_snapshot, final_dialogue)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, profileId, caseId || null, villainName, JSON.stringify(attributesSnapshot || null), finalDialogue || null]);
}
