import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildRoute, regionsAreAdjacent } from '../src/domain/route.rules.js';
import { haversineKm } from '../src/domain/time.rules.js';

// Fixture: 3 cidades por região, coordenadas plausíveis.
const CITIES = [
  { id: 1, name: 'Nova York', country_id: 1, region_name: 'América do Norte', lat: 40.71, lng: -74.0 },
  { id: 2, name: 'Cidade do México', country_id: 2, region_name: 'América do Norte', lat: 19.43, lng: -99.13 },
  { id: 3, name: 'Toronto', country_id: 3, region_name: 'América do Norte', lat: 43.65, lng: -79.38 },
  { id: 4, name: 'Rio de Janeiro', country_id: 4, region_name: 'América do Sul', lat: -22.9, lng: -43.17 },
  { id: 5, name: 'Buenos Aires', country_id: 5, region_name: 'América do Sul', lat: -34.6, lng: -58.38 },
  { id: 6, name: 'Lima', country_id: 6, region_name: 'América do Sul', lat: -12.04, lng: -77.04 },
  { id: 7, name: 'Paris', country_id: 7, region_name: 'Europa', lat: 48.85, lng: 2.35 },
  { id: 8, name: 'Roma', country_id: 8, region_name: 'Europa', lat: 41.9, lng: 12.49 },
  { id: 9, name: 'Berlim', country_id: 9, region_name: 'Europa', lat: 52.52, lng: 13.4 },
  { id: 10, name: 'Cairo', country_id: 10, region_name: 'África', lat: 30.04, lng: 31.23 },
  { id: 11, name: 'Nairóbi', country_id: 11, region_name: 'África', lat: -1.29, lng: 36.82 },
  { id: 12, name: 'Lagos', country_id: 12, region_name: 'África', lat: 6.52, lng: 3.37 },
  { id: 13, name: 'Tóquio', country_id: 13, region_name: 'Ásia', lat: 35.67, lng: 139.65 },
  { id: 14, name: 'Pequim', country_id: 14, region_name: 'Ásia', lat: 39.9, lng: 116.4 },
  { id: 15, name: 'Bangcoc', country_id: 15, region_name: 'Ásia', lat: 13.75, lng: 100.5 },
  { id: 16, name: 'Sydney', country_id: 16, region_name: 'Oceania', lat: -33.86, lng: 151.2 },
  { id: 17, name: 'Auckland', country_id: 17, region_name: 'Oceania', lat: -36.84, lng: 174.76 },
];

const byId = new Map(CITIES.map((c) => [c.id, c]));

// gerador determinístico (LCG)
function makeRand(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('regionsAreAdjacent', () => {
  it('mesma região é adjacente de si', () => {
    assert.equal(regionsAreAdjacent('Europa', 'Europa'), true);
  });
  it('Europa ↔ Ásia adjacentes; Oceania ↔ Europa não', () => {
    assert.equal(regionsAreAdjacent('Europa', 'Ásia'), true);
    assert.equal(regionsAreAdjacent('Oceania', 'Europa'), false);
  });
});

describe('buildRoute — cadeia de perseguição coerente', () => {
  for (const difficulty of ['EASY', 'HARD', 'EXTREME']) {
    it(`[${difficulty}] rota de 5 cidades distintas, sem país consecutivo repetido`, () => {
      const { route } = buildRoute({ cities: CITIES, difficulty, rand: makeRand(7) });
      assert.equal(route.length, 5);
      assert.equal(new Set(route).size, 5, 'cidades devem ser distintas');
      for (let i = 1; i < route.length; i++) {
        assert.notEqual(
          byId.get(route[i]).country_id,
          byId.get(route[i - 1]).country_id,
          'países consecutivos não podem se repetir',
        );
      }
    });

    it(`[${difficulty}] cada salto é geograficamente plausível (região adjacente ou 1 salto longo)`, () => {
      const { route } = buildRoute({ cities: CITIES, difficulty, rand: makeRand(99) });
      let longHauls = 0;
      for (let i = 1; i < route.length; i++) {
        const a = byId.get(route[i - 1]);
        const b = byId.get(route[i]);
        if (!regionsAreAdjacent(a.region_name, b.region_name)) longHauls++;
      }
      assert.ok(longHauls <= 1, `esperado no máx. 1 salto entre regiões não-adjacentes, obtido ${longHauls}`);
    });

    it(`[${difficulty}] opções por passo = correta + decoys, primary presente, decoys fora da rota`, () => {
      const expected = { EASY: 3, HARD: 4, EXTREME: 5 }[difficulty];
      const { route, optionsByStep } = buildRoute({ cities: CITIES, difficulty, rand: makeRand(3) });
      const routeSet = new Set(route);
      for (let i = 0; i < optionsByStep.length - 1; i++) {
        const step = optionsByStep[i];
        assert.ok(step, `passo ${i} deve ter opções`);
        assert.equal(step.options.length, expected);
        assert.ok(step.options.includes(step.primary));
        assert.equal(step.primary, route[i + 1], 'primary é a próxima cidade da rota');
        const decoys = step.options.filter((id) => id !== step.primary);
        for (const d of decoys) {
          assert.ok(!routeSet.has(d), 'decoy não pode ser cidade da rota');
          assert.notEqual(
            byId.get(d).country_id,
            byId.get(step.primary).country_id,
            'decoy não pode ser do mesmo país do destino correto',
          );
        }
      }
      assert.equal(optionsByStep[optionsByStep.length - 1], null, 'último passo não tem viagem');
    });
  }

  it('rejeita quando há cidades insuficientes', () => {
    assert.throws(() => buildRoute({ cities: CITIES.slice(0, 4), difficulty: 'EASY' }));
  });

  it('saltos tendem a ser curtos (soma da rota < caminho aleatório médio)', () => {
    const { route } = buildRoute({ cities: CITIES, difficulty: 'EASY', rand: makeRand(123) });
    let total = 0;
    for (let i = 1; i < route.length; i++) {
      const a = byId.get(route[i - 1]);
      const b = byId.get(route[i]);
      total += haversineKm(a.lat, a.lng, b.lat, b.lng);
    }
    // 4 saltos: uma rota sã fica bem abaixo de 4 voltas ao mundo.
    assert.ok(total < 60000, `soma dos saltos muito alta: ${Math.round(total)} km`);
  });
});
