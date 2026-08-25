import { v4 as uuid } from 'uuid';
import pool from '../config/database.js';
import { getCulpritByCase } from '../repositories/suspect.repo.js';

export async function populateVillainClues(caseId) {
  const culprit = await getCulpritByCase(caseId);
  if (!culprit) throw new Error('Culprit not found for case ' + caseId);

  const attributes = [
    { type: 'vehicle', value: culprit.vehicle, refId: culprit.vehicle_id },
    { type: 'hobby', value: culprit.hobby, refId: culprit.hobby_id },
    { type: 'hair', value: culprit.hair, refId: culprit.hair_id },
    { type: 'feature', value: culprit.feature, refId: culprit.feature_id },
    { type: 'sex', value: culprit.sex, refId: null }
  ];

  // Insert into DB
  for (const attr of attributes) {
    if (attr.value) { // Ensure value exists
        await pool.query(
        `INSERT INTO case_villain_clues (id, active_case_id, attribute_type, attribute_value, target_ref_id, is_revealed)
            VALUES (?, ?, ?, ?, ?, FALSE)`,
        [uuid(), caseId, attr.type, attr.value, attr.refId]
        );
    }
  }
  
  console.log(`[ClueManager] Populated ${attributes.length} clues for case ${caseId}`);
}

export async function pickNextVillainClue(caseId) {
    // Select a random unrevealed clue
    const [rows] = await pool.query(
        `SELECT * FROM case_villain_clues 
         WHERE active_case_id = ? AND is_revealed = FALSE 
         ORDER BY RAND() LIMIT 1`,
        [caseId]
    );

    if (rows.length === 0) {
        // Fallback: Pick any revealed one (repeat if necessary) or return null
        const [allRows] = await pool.query(
            `SELECT * FROM case_villain_clues 
             WHERE active_case_id = ? 
             ORDER BY RAND() LIMIT 1`,
            [caseId]
        );
        return allRows[0] || null;
    }

    // Mark as revealed IMMEDIATELY (Atomic consumption)
    // To prevent the player from getting the same clue from two different people in the same city if they click fast?
    // User logic: "Whenever a NEW villain clue is generated... mark from 0 to 1". 
    // Yes, consume it.
    
    const clue = rows[0];
    await pool.query(
        `UPDATE case_villain_clues SET is_revealed = TRUE WHERE id = ?`,
        [clue.id]
    );

    return clue;
}
