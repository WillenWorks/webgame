// src/domain/suspect.rules.js
// Geração PURA dos conjuntos de atributos dos suspeitos — sem acesso a banco.
// Garante que o culpado (índice 0) seja SEMPRE unicamente identificável pela
// combinação completa dos 5 atributos.

const ATTR_KEYS = ['sex_id', 'hair_id', 'hobby_id', 'vehicle_id', 'feature_id'];

function sameAllAttrs(a, b) {
  return ATTR_KEYS.every((k) => a[k] === b[k]);
}

/**
 * Determinístico por design (spread via `i % pool.length`) — casos são
 * reproduzíveis para debug e teste, sem RNG.
 *
 * @param {Record<string, Array<{id:number}>>} pools  pool de valores por atributo (>= 2 valores cada)
 * @param {number} count  total de suspeitos (culpado incluso)
 * @returns {Array<Record<string, number>>}  count conjuntos; índice 0 = culpado
 */
export function buildSuspectAttributeSets(pools, count) {
  for (const k of ATTR_KEYS) {
    if (!Array.isArray(pools[k]) || pools[k].length === 0) {
      throw new Error(`buildSuspectAttributeSets: pool vazio para ${k}`);
    }
  }

  const culprit = {};
  for (const k of ATTR_KEYS) culprit[k] = pools[k][0].id;

  const sets = [culprit];

  for (let i = 1; i < count; i++) {
    const set = {};
    for (const k of ATTR_KEYS) {
      const pool = pools[k];
      set[k] = pool[i % pool.length].id;
    }

    // Evita colisão total com o culpado: se este decoy bate em todos os 5
    // atributos, força pelo menos um atributo diferente.
    let guard = 0;
    while (sameAllAttrs(set, culprit) && guard < ATTR_KEYS.length * 2) {
      const k = ATTR_KEYS[guard % ATTR_KEYS.length];
      const pool = pools[k];
      if (pool.length > 1) {
        const alt = pool.find((v) => v.id !== culprit[k]);
        if (alt) set[k] = alt.id;
      }
      guard++;
    }

    sets.push(set);
  }

  return sets;
}

/**
 * Verifica se, dado o conjunto completo de atributos do culpado, existe
 * exatamente 1 suspeito compatível (o próprio culpado).
 */
export function culpritIsUnique(sets) {
  if (!sets.length) return false;
  const culprit = sets[0];
  return sets.filter((s) => sameAllAttrs(s, culprit)).length === 1;
}

export { ATTR_KEYS };
