import pool from '../config/database.js';

/**
 * Verifica e aplica migrações de esquema necessárias.
 * Chamado no startup do app.
 */
export async function runMigrations() {
  console.log('[db] Verificando migrações...');
  
  try {
    // Migração 1: intro_text em active_cases
    // Check if column exists
    const [cols] = await pool.query(`SHOW COLUMNS FROM active_cases LIKE 'intro_text'`);
    if (cols.length === 0) {
      console.log('[db] Aplicando migração: ADD intro_text em active_cases');
      await pool.query(`ALTER TABLE active_cases ADD COLUMN intro_text TEXT NULL`);
    } else {
      console.log('[db] Migração intro_text já aplicada.');
    }
    
    // Migração 2: context_message (alias ou nova coluna, caso precise)
    // O usuário pediu "mensagem de contexto do caso". Vamos garantir que seja consistente.
    
    console.log('[db] Migrações concluídas.');
  } catch (e) {
    console.error('[db] Falha ao rodar migrações:', e.message);
    // Não mata o processo, pois pode ser erro de permissão, mas loga.
  }
}
