import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { routeLabel, UNMATCHED_ROUTE } from '../src/middlewares/metrics.middleware.js';

describe('routeLabel — rótulo de rota para métricas', () => {
  it('usa o padrão casado pelo Express, juntando baseUrl + route.path', () => {
    assert.equal(
      routeLabel({ baseUrl: '/api/v1/cases', route: { path: '/:caseId/investigate' } }),
      '/api/v1/cases/:caseId/investigate',
    );
  });

  it('mantém múltiplos placeholders do padrão', () => {
    assert.equal(
      routeLabel({ baseUrl: '/api/v1/cases', route: { path: '/:caseId/dossier/:field' } }),
      '/api/v1/cases/:caseId/dossier/:field',
    );
  });

  it('lida com route.path "/" (raiz do router montado)', () => {
    assert.equal(routeLabel({ baseUrl: '/api/v1/profiles', route: { path: '/' } }), '/api/v1/profiles');
  });

  it('lida com router sem baseUrl (montado em "/")', () => {
    assert.equal(routeLabel({ baseUrl: '', route: { path: '/ping' } }), '/ping');
  });

  it('colapsa em <unmatched> quando não há rota casada (404 / rejeição por middleware)', () => {
    assert.equal(routeLabel({ path: '/api/v1/cases/8b1f.../lixo' }), UNMATCHED_ROUTE);
    assert.equal(routeLabel({ originalUrl: '/nao-existe-1788314572?x=1' }), UNMATCHED_ROUTE);
    assert.equal(routeLabel({}), UNMATCHED_ROUTE);
  });

  it('ignora route.path que não seja string', () => {
    assert.equal(routeLabel({ baseUrl: '/api/v1', route: { path: /regex/ } }), UNMATCHED_ROUTE);
  });
});
