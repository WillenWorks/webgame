import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeMiddleware } from '../src/middlewares/security.middleware.js';

const NUL = String.fromCharCode(0);
const run = (req) => new Promise((resolve) => sanitizeMiddleware(req, {}, resolve));

describe('sanitizeMiddleware — remoção de null bytes', () => {
  it('limpa strings no 1º nível', async () => {
    const req = { body: { name: `Ag${NUL}ente` }, query: {}, params: {} };
    await run(req);
    assert.equal(req.body.name, 'Agente');
  });

  it('limpa strings em objetos e arrays aninhados', async () => {
    const req = {
      body: { nested: { list: [`a${NUL}`, { deep: `b${NUL}c` }] } },
      query: {},
      params: {},
    };
    await run(req);
    assert.deepEqual(req.body.nested.list, ['a', { deep: 'bc' }]);
  });

  it('não quebra com body/query/params ausentes', async () => {
    const req = {};
    await run(req);
    assert.ok(true);
  });

  it('preserva valores não-string', async () => {
    const req = { body: { n: 42, b: true, z: null }, query: {}, params: {} };
    await run(req);
    assert.deepEqual(req.body, { n: 42, b: true, z: null });
  });

  it('chama next()', async () => {
    let called = false;
    sanitizeMiddleware({ body: {}, query: {}, params: {} }, {}, () => { called = true; });
    assert.equal(called, true);
  });
});
