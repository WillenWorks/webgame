import pool from '../src/config/database.js';

async function migrate() {
  console.log('Iniciando migração...');
  
  try {
    // Adicionar coluna intro_text na tabela active_cases
    await pool.query(`
      ALTER TABLE active_cases
      ADD COLUMN intro_text TEXT NULL;
    `);
    console.log('Coluna intro_text adicionada com sucesso.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Coluna intro_text já existe.');
    } else {
      console.error('Erro ao adicionar coluna:', err);
    }
  }

  process.exit(0);
}

migrate();
