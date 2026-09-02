import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  makeCacheKey,
  getCached,
  setCached,
  clearCache,
  cacheStats,
  __configureCacheForTests,
} from '../src/ai/ai.cache.js';

const BASE = {
  provider: 'gemini',
  model: 'gemini-3.6-flash',
  system: 'Você é um informante nervoso.',
  user: 'Reescreva: a moeda de lá é o iene.',
  schema: null,
};

beforeEach(() => {
  clearCache();
  __configureCacheForTests({ enabled: true, ttlMs: 60_000, max: 500 });
});

describe('makeCacheKey — chave determinística', () => {
  it('é estável para entradas idênticas', () => {
    assert.equal(makeCacheKey(BASE), makeCacheKey({ ...BASE }));
  });

  it('muda quando qualquer dimensão semântica muda', () => {
    const k = makeCacheKey(BASE);
    assert.notEqual(k, makeCacheKey({ ...BASE, provider: 'claude' }));
    assert.notEqual(k, makeCacheKey({ ...BASE, model: 'gemini-flash-latest' }));
    assert.notEqual(k, makeCacheKey({ ...BASE, system: 'Você é um guia calmo.' }));
    assert.notEqual(k, makeCacheKey({ ...BASE, user: 'outra pergunta' }));
    assert.notEqual(k, makeCacheKey({ ...BASE, schema: { type: 'object' } }));
  });
});

describe('get/set — ciclo de vida', () => {
  it('devolve o valor guardado', () => {
    const key = makeCacheKey(BASE);
    setCached(key, 'Ele murmurou algo sobre trocar dinheiro antes do voo.');
    assert.equal(getCached(key), 'Ele murmurou algo sobre trocar dinheiro antes do voo.');
  });

  it('miss retorna null', () => {
    assert.equal(getCached(makeCacheKey(BASE)), null);
  });

  it('não guarda valores vazios ou não-string', () => {
    const key = makeCacheKey(BASE);
    setCached(key, '');
    setCached(key, '   ');
    setCached(key, 42);
    setCached(key, null);
    assert.equal(getCached(key), null);
  });

  it('expira após o TTL', async () => {
    __configureCacheForTests({ ttlMs: 10 });
    const key = makeCacheKey(BASE);
    setCached(key, 'efêmero');
    assert.equal(getCached(key), 'efêmero');
    await new Promise((r) => setTimeout(r, 25));
    assert.equal(getCached(key), null);
  });
});

describe('eviction — teto de entradas (LRU)', () => {
  it('descarta a entrada mais antiga ao ultrapassar o máximo', () => {
    __configureCacheForTests({ max: 3 });
    for (const n of [1, 2, 3, 4]) setCached(`k${n}`, `v${n}`);

    assert.equal(cacheStats().size, 3);
    assert.equal(getCached('k1'), null); // a mais antiga saiu
    assert.equal(getCached('k4'), 'v4');
  });

  it('o acerto renova a recência e protege a entrada da eviction', () => {
    __configureCacheForTests({ max: 3 });
    setCached('k1', 'v1');
    setCached('k2', 'v2');
    setCached('k3', 'v3');
    getCached('k1'); // k1 volta a ser a mais recente
    setCached('k4', 'v4'); // agora k2 é a mais antiga

    assert.equal(getCached('k2'), null);
    assert.equal(getCached('k1'), 'v1');
  });
});

describe('desligado por config', () => {
  it('get sempre null e set é no-op quando enabled=false', () => {
    __configureCacheForTests({ enabled: false });
    const key = makeCacheKey(BASE);
    setCached(key, 'não deveria guardar');
    assert.equal(getCached(key), null);

    __configureCacheForTests({ enabled: true });
    assert.equal(getCached(key), null);
  });
});
