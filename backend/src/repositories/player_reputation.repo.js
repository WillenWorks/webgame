import pool from '../config/database.js';

export async function ensurePlayerReputationHistorical() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS player_reputation (
      id CHAR(36) PRIMARY KEY,
      player_id CHAR(36) NOT NULL,
      case_id CHAR(36) NULL,
      reputation_score INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_player (player_id),
      INDEX idx_player_case (player_id, case_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

// Última reputação conhecida do jogador
export async function getPlayerReputationLatestByPlayer(playerId) {
  const [rows] = await pool.query(
    'SELECT player_id, case_id, reputation_score, created_at FROM player_reputation WHERE player_id = ? ORDER BY created_at DESC LIMIT 1',
    [playerId]
  );
  return rows[0] || null;
}

// Compat: retorna a entrada mais recente
export async function getPlayerReputation(playerId) {
  return await getPlayerReputationLatestByPlayer(playerId);
}

// Insere uma entrada histórica por caso
export async function insertPlayerReputationEntry({ id, playerId, caseId, reputationScore }) {
  await ensurePlayerReputationHistorical();
  const sql = `
    INSERT INTO player_reputation (id, player_id, case_id, reputation_score)
    VALUES (?, ?, ?, ?)
  `;
  await pool.execute(sql, [id, playerId, caseId, reputationScore]);
}

// Compat: insere nova entrada (não sobrescreve)
export async function upsertPlayerReputation({ playerId, reputationScore, caseId = null }) {
  await ensurePlayerReputationHistorical();
  const sql = `
    INSERT INTO player_reputation (id, player_id, case_id, reputation_score)
    VALUES (UUID(), ?, ?, ?)
  `;
  await pool.execute(sql, [playerId, caseId, reputationScore]);
  return true;
}
