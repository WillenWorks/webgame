import { v4 as uuid } from "uuid";
import { getRandomAttribute } from "../repositories/attributes.repo.js";
import { insertSuspect } from "../repositories/suspect.repo.js";
import { generateSuspectName } from "../ai/name.generator.js";

const ATTR_TABLES = {
  sex_id: "attr_sex",
  hair_id: "attr_hair",
  hobby_id: "attr_hobby",
  vehicle_id: "attr_vehicle",
  feature_id: "attr_feature",
};

const SUSPECT_COUNT = 12;

// quantos valores distintos mínimos por atributo
const DIVERSITY_RULES = {
  sex_id: 2,
  hair_id: 5,
  hobby_id: 5,
  vehicle_id: 4,
  feature_id: 4,
};

async function generateAttributePool(table, count) {
  const pool = [];
  const ids = new Set();
  let attempts = 0;
  
  while (pool.length < count && attempts < 30) {
    attempts++;
    const attr = await getRandomAttribute(table); // returns {id, name}
    if (!attr) continue;
    if (!ids.has(attr.id)) {
      ids.add(attr.id);
      pool.push(attr);
    }
  }
  
  // Fallback se faltar diversidade (duplicar existentes)
  while (pool.length < count && pool.length > 0) {
      pool.push(pool[0]); 
  }
  
  return pool;
}

export async function generateSuspectsForCase(caseId) {
  // 1️⃣ Criar pools de atributos
  const pools = {};
  for (const key of Object.keys(ATTR_TABLES)) {
    pools[key] = await generateAttributePool(
      ATTR_TABLES[key],
      DIVERSITY_RULES[key]
    );
  }

  // 2️⃣ Criar culpado usando o primeiro valor de cada pool
  const culpritAttrs = {};
  const culpritDb = {};
  
  for (const key in pools) {
    const obj = pools[key][0];
    culpritAttrs[key] = obj;
    culpritDb[key] = obj.id;
  }

  const culpritId = uuid();
  // Passar genero para gerador de nome
  const culpritSex = culpritAttrs['sex_id']?.name || 'Indefinido';
  const culpritName = await generateSuspectName(0, culpritSex);

  await insertSuspect({
    id: culpritId,
    case_id: caseId,
    name: culpritName,
    ...culpritDb,
    is_culprit: true,
  });

  // 3️⃣ Criar inocentes
  for (let i = 1; i < SUSPECT_COUNT; i++) {
    const decoyDb = {};
    const decoyAttrs = {};

    for (const key in pools) {
      // distribui valores do pool ciclicamente
      const obj = pools[key][i % pools[key].length];
      decoyAttrs[key] = obj;
      decoyDb[key] = obj.id;
    }

    const decoyId = uuid();
    const decoySex = decoyAttrs['sex_id']?.name || 'Indefinido';
    const decoyName = await generateSuspectName(i, decoySex);

    await insertSuspect({
      id: decoyId,
      case_id: caseId,
      name: decoyName,
      ...decoyDb,
      is_culprit: false,
    });
  }
}
