import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildSuspectAttributeSets, culpritIsUnique, ATTR_KEYS } from '../src/domain/suspect.rules.js';

function pool(n) {
  return Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
}

// Diversidade igual à do gerador real.
const POOLS = {
  sex_id: pool(2),
  hair_id: pool(5),
  hobby_id: pool(5),
  vehicle_id: pool(4),
  feature_id: pool(4),
};

describe('buildSuspectAttributeSets — culpado sempre único', () => {
  it('gera 12 conjuntos, índice 0 = culpado, unicamente identificável pelos 5 atributos', () => {
    const sets = buildSuspectAttributeSets(POOLS, 12);
    assert.equal(sets.length, 12);
    assert.ok(culpritIsUnique(sets), 'a combinação completa do culpado deve ser única na pool');
  });

  it('mantém unicidade em várias sementes (pools pequenas incluídas)', () => {
    const tight = { sex_id: pool(2), hair_id: pool(3), hobby_id: pool(3), vehicle_id: pool(2), feature_id: pool(2) };
    for (let seed = 0; seed < 20; seed++) {
      let s = seed + 1;
      const rand = () => ((s = (s * 1103515245 + 12345) >>> 0) / 0x100000000);
      const sets = buildSuspectAttributeSets(tight, 12, rand);
      assert.ok(culpritIsUnique(sets), `colisão de culpado na semente ${seed}`);
    }
  });

  it('todo conjunto tem os 5 atributos definidos', () => {
    const sets = buildSuspectAttributeSets(POOLS, 12);
    for (const s of sets) {
      for (const k of ATTR_KEYS) assert.ok(Number.isInteger(s[k]), `faltou ${k}`);
    }
  });

  it('rejeita pool vazio', () => {
    assert.throws(() => buildSuspectAttributeSets({ ...POOLS, hair_id: [] }, 12));
  });
});
