import pool from '../config/database.js';

export async function getCaseTimeState(caseId) {
  const [rows] = await pool.query(
    'SELECT `case_id`, `start_time`, `deadline_time`, `current_time`, `timezone` FROM `case_time_state` WHERE `case_id` = ? LIMIT 1',
    [caseId]
  );
  return rows[0] || null;
}

export async function upsertCaseTimeState({ caseId, startTime, deadlineTime, currentTime, timezone }) {
  // Log para depuração
  console.log('upsertCaseTimeState params:', {
    caseId,
    startTime,
    deadlineTime,
    currentTime,
    timezone,
  });

  // Cenário A: inicialização completa (start/deadline/current definidos)
  if (startTime && deadlineTime && currentTime) {
    const sqlInit = `
      INSERT INTO \`case_time_state\` (\`case_id\`, \`start_time\`, \`deadline_time\`, \`current_time\`, \`timezone\`)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        \`start_time\` = VALUES(\`start_time\`),
        \`deadline_time\` = VALUES(\`deadline_time\`),
        \`current_time\` = VALUES(\`current_time\`),
        \`timezone\` = VALUES(\`timezone\`)
    `;
    const paramsInit = [
      caseId,
      startTime,
      deadlineTime,
      currentTime,
      timezone ?? 'UTC',
    ];
    const [result] = await pool.query(sqlInit, paramsInit);
    return result?.affectedRows > 0;
  }

  // Cenário B: atualização parcial (ex.: apenas current_time durante consumo de tempo)
  // Atualiza somente os campos fornecidos; não insere linha nova
  const fields = [];
  const values = [];
  if (currentTime) { fields.push('`current_time` = ?'); values.push(currentTime); }
  if (timezone) { fields.push('`timezone` = ?'); values.push(timezone); }
  if (startTime) { fields.push('`start_time` = ?'); values.push(startTime); }
  if (deadlineTime) { fields.push('`deadline_time` = ?'); values.push(deadlineTime); }

  if (fields.length === 0) {
    // nada a atualizar
    return false;
  }

  const sqlUpdate = `UPDATE \`case_time_state\` SET ${fields.join(', ')} WHERE \`case_id\` = ?`;
  values.push(caseId);
  const [result] = await pool.query(sqlUpdate, values);
  return result?.affectedRows > 0;
}
