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

const SUSPECT_COUNT = 6;

// quantos valores distintos mínimos por atributo
const DIVERSITY_RULES = {
  sex_id: 2,
  hair_id: 3,
  hobby_id: 3,
  vehicle_id: 2,
  feature_id: 2,
};

async function generateAttributePool(table, count) {
  const pool = new Set();
  while (pool.size < count) {
    pool.add(await getRandomAttribute(table));
  }
  return Array.from(pool);
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
  const culprit = {};
  for (const key in pools) {
    culprit[key] = pools[key][0];
  }

  const culpritId = uuid();
  const culpritName = await generateSuspectName(0);

  await insertSuspect({
    id: culpritId,
    case_id: caseId,
    name: culpritName,
    ...culprit,
    is_culprit: true,
  });

  // 3️⃣ Criar inocentes
  for (let i = 1; i < SUSPECT_COUNT; i++) {
    const decoy = {};

    for (const key in pools) {
      // distribui valores do pool ciclicamente
      decoy[key] = pools[key][i % pools[key].length];
    }

    const decoyId = uuid();
    const decoyName = await generateSuspectName(i);

    await insertSuspect({
      id: decoyId,
      case_id: caseId,
      name: decoyName,
      ...decoy,
      is_culprit: false,
    });
  }
}
