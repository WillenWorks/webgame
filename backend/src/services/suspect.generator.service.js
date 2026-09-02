import { v4 as uuid } from "uuid";
import { getRandomAttribute } from "../repositories/attributes.repo.js";
import { insertSuspect } from "../repositories/suspect.repo.js";
import { generateSuspectName } from "../ai/name.generator.js";
import { buildSuspectAttributeSets, culpritIsUnique, ATTR_KEYS } from "../domain/suspect.rules.js";

const ATTR_TABLES = {
  sex_id: "attr_sex",
  hair_id: "attr_hair",
  hobby_id: "attr_hobby",
  vehicle_id: "attr_vehicle",
  feature_id: "attr_feature",
};

const SUSPECT_COUNT = 12;

// Quantos valores distintos mínimos por atributo (diversidade da pool).
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

  while (pool.length < count && attempts < 40) {
    attempts++;
    const attr = await getRandomAttribute(table); // { id, name }
    if (!attr || ids.has(attr.id)) continue;
    ids.add(attr.id);
    pool.push(attr);
  }
  if (pool.length < 2) {
    throw new Error(`Pool de atributos insuficiente para ${table}`);
  }
  return pool;
}

export async function generateSuspectsForCase(caseId) {
  // 1️⃣ Pools de atributos
  const pools = {};
  for (const key of ATTR_KEYS) {
    pools[key] = await generateAttributePool(ATTR_TABLES[key], DIVERSITY_RULES[key]);
  }

  // 2️⃣ Conjuntos de atributos — índice 0 = culpado, unicidade garantida
  const sets = buildSuspectAttributeSets(pools, SUSPECT_COUNT);
  if (!culpritIsUnique(sets)) {
    throw new Error("Falha ao gerar pool de suspeitos com culpado único");
  }

  const nameById = {};
  for (const key of ATTR_KEYS) {
    for (const v of pools[key]) nameById[`${key}:${v.id}`] = v.name;
  }

  // 3️⃣ Inserir suspeitos
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    const sexName = nameById[`sex_id:${set.sex_id}`] || "Indefinido";
    const name = await generateSuspectName(i, sexName);

    await insertSuspect({
      id: uuid(),
      case_id: caseId,
      name,
      ...set,
      is_culprit: i === 0,
    });
  }
}
