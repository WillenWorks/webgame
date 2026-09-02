import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ATTR_FIELDS,
  DOSSIER_FIELD_MAP,
  normalizeNotes,
  notesToPrismaWhere,
  suspectMatchesNotes,
  filterSuspectsByNotes,
  identifyVillain,
} from '../src/domain/dossier.rules.js';

const POOL = [
  { id: 'a', sex_id: 1, hair_id: 1, hobby_id: 1, vehicle_id: 1, feature_id: 1, is_culprit: false },
  { id: 'b', sex_id: 1, hair_id: 2, hobby_id: 1, vehicle_id: 1, feature_id: 1, is_culprit: true },
  { id: 'c', sex_id: 2, hair_id: 2, hobby_id: 3, vehicle_id: 2, feature_id: 2, is_culprit: false },
];

describe('normalizeNotes — saneamento das anotações do dossiê', () => {
  it('mantém apenas campos anotáveis com id numérico > 0', () => {
    const out = normalizeNotes({
      sex_id: '1',
      hair_id: 0,
      hobby_id: null,
      vehicle_id: undefined,
      feature_id: 3,
      lixo: 99,
    });
    assert.deepEqual(out, { sex_id: 1, feature_id: 3 });
  });

  it('entrada vazia / inválida → objeto vazio', () => {
    assert.deepEqual(normalizeNotes(null), {});
    assert.deepEqual(normalizeNotes({}), {});
    assert.deepEqual(normalizeNotes({ hair_id: 'abc' }), {});
  });

  it('todos os campos previstos estão no contrato', () => {
    assert.deepEqual(ATTR_FIELDS, ['sex_id', 'hair_id', 'hobby_id', 'vehicle_id', 'feature_id']);
  });
});

describe('notesToPrismaWhere — tradução snake_case → camelCase do Prisma', () => {
  it('mapeia e coage os ids', () => {
    assert.deepEqual(notesToPrismaWhere({ hair_id: '2', vehicle_id: 1 }), { hairId: 2, vehicleId: 1 });
  });

  it('ignora campos zerados/ausentes', () => {
    assert.deepEqual(notesToPrismaWhere({ sex_id: 0, feature_id: 5 }), { featureId: 5 });
  });

  it('DOSSIER_FIELD_MAP cobre todos os ATTR_FIELDS', () => {
    for (const f of ATTR_FIELDS) assert.ok(DOSSIER_FIELD_MAP[f], `faltou mapeamento para ${f}`);
  });
});

describe('suspectMatchesNotes — casamento de um suspeito com o dossiê', () => {
  it('true quando todos os atributos anotados batem', () => {
    assert.equal(suspectMatchesNotes(POOL[1], { hair_id: 2, hobby_id: 1 }), true);
  });

  it('false quando algum atributo diverge', () => {
    assert.equal(suspectMatchesNotes(POOL[0], { hair_id: 2 }), false);
  });

  it('dossiê vazio casa com qualquer suspeito', () => {
    assert.equal(suspectMatchesNotes(POOL[2], {}), true);
  });

  it('suspeito ausente → false', () => {
    assert.equal(suspectMatchesNotes(null, { hair_id: 2 }), false);
  });
});

describe('filterSuspectsByNotes / identifyVillain — identificação do vilão', () => {
  it('filtra a pool pelos atributos anotados', () => {
    const r = filterSuspectsByNotes(POOL, { sex_id: 1 });
    assert.deepEqual(r.map((s) => s.id), ['a', 'b']);
  });

  it('identifica um único vilão quando as pistas convergem', () => {
    const r = identifyVillain(POOL, { hair_id: 2, hobby_id: 1 });
    assert.equal(r.unique, true);
    assert.equal(r.remaining, 1);
    assert.equal(r.suspect.id, 'b');
    assert.equal(r.suspect.is_culprit, true);
  });

  it('não identifica quando ainda há ambiguidade', () => {
    const r = identifyVillain(POOL, { sex_id: 1 });
    assert.equal(r.unique, false);
    assert.equal(r.remaining, 2);
    assert.equal(r.suspect, null);
  });

  it('dossiê vazio → pool inteira em aberto', () => {
    const r = identifyVillain(POOL, {});
    assert.equal(r.remaining, 3);
    assert.equal(r.unique, false);
  });
});
