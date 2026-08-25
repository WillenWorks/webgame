import pool from '../config/database.js';

export async function ensureExpandedAttributes() {
  const hobbies = [
    'Tênis', 'Croquet', 'Paraquedismo', 'Mergulho', 'Xadrez', 
    'Jardinagem', 'Yoga', 'Pintura', 'Astronomia', 'Volêi', 'História',
    'Arqueologia', 'Colecionismo', 'Críquete', 'Polo', 'Esgrima'
  ];
  
  const hair = [
    'Loiro', 'Ruivo', 'Preto', 'Castanho', 'Grisalho', 'Careca', 'Colorido',
    'Trançado', 'Longo', 'Curto', 'Encaracolado'
  ];

  const vehicles = [
    'Limusine', 'Moto Esportiva', 'Conversível', 'Jato Privado', 'Iate', 
    'Bicicleta', 'Tuk-tuk', 'Caminhão', 'Helicóptero', 'Carro Antigo',
    'Hovercraft', 'Dirigível', 'Veleiro'
  ];

  const features = [
    'Tatuagem', 'Cicatriz', 'Óculos', 'Chapéu', 'Joia Exótica', 
    'Anel de Rubi', 'Colar de Pérolas', 'Bengala', 'Luvas', 'Sarda',
    'Marca de Nascença', 'Monóculo', 'Relógio de Bolso'
  ];

  const sexes = [
    'Masculino', 'Feminino'
  ];

  async function insert(table, values) {
    for (const val of values) {
      const [rows] = await pool.query(`SELECT id FROM ${table} WHERE name = ?`, [val]);
      if (rows.length === 0) {
        await pool.query(`INSERT INTO ${table} (name) VALUES (?)`, [val]);
        console.log(`[seed] Inserted ${val} into ${table}`);
      }
    }
  }

  try {
      console.log('[seed] Verifying attributes...');
      await insert('attr_hobby', hobbies);
      await insert('attr_hair', hair);
      await insert('attr_vehicle', vehicles);
      await insert('attr_feature', features);
      await insert('attr_sex', sexes);
  } catch (e) {
      console.error('[seed] Error expanding attributes:', e.message);
  }
}
