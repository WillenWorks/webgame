process.env.AI_ENABLED = 'false'; // geração determinística nos testes

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { dbAvailable, createCaseForTest, prisma } from '../helpers/testDb.js';
import { localitiesFor, routeOptionsFor } from '../../src/config/game.rules.js';
import { regionsAreAdjacent } from '../../src/domain/route.rules.js';

const available = await dbAvailable();
const skip = available
  ? false
  : 'PostgreSQL indisponível — rode `docker compose up -d && npm run db:seed`';

const DIFFICULTIES = ['EASY', 'HARD', 'EXTREME'];

describe('Geração de caso — dados corretos por dificuldade', { skip }, () => {
  const cases = {}; // difficulty -> { caseId, cleanup, route, suspects, culprit, villainClues, places }

  before(async () => {
    for (const d of DIFFICULTIES) {
      const c = await createCaseForTest(d);
      const route = await prisma.caseRoute.findMany({
        where: { activeCaseId: c.caseId },
        orderBy: { stepOrder: 'asc' },
        include: { city: { include: { country: { include: { region: true } } } } },
      });
      const suspects = await prisma.caseSuspect.findMany({ where: { caseId: c.caseId } });
      const culprit = suspects.find((s) => s.isCulprit);
      const villainClues = await prisma.caseVillainClue.findMany({ where: { activeCaseId: c.caseId } });
      const places = await prisma.caseCityPlace.findMany({ where: { caseId: c.caseId } });
      cases[d] = { ...c, route, suspects, culprit, villainClues, places };
    }
  });

  after(async () => {
    for (const d of DIFFICULTIES) await cases[d]?.cleanup?.();
  });

  for (const d of DIFFICULTIES) {
    describe(`[${d}]`, () => {
      it('rota: 5 cidades distintas, sem país consecutivo repetido', () => {
        const { route } = cases[d];
        assert.equal(route.length, 5);
        assert.equal(new Set(route.map((r) => r.cityId)).size, 5);
        for (let i = 1; i < route.length; i++) {
          assert.notEqual(route[i].city.countryId, route[i - 1].city.countryId);
        }
      });

      it('rota: no máximo 1 salto entre regiões não-adjacentes', () => {
        const { route } = cases[d];
        let long = 0;
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1].city.country.region?.name;
          const b = route[i].city.country.region?.name;
          if (!regionsAreAdjacent(a, b)) long++;
        }
        assert.ok(long <= 1, `saltos longos: ${long}`);
      });

      it('opções de destino: quantidade por dificuldade, primary = próxima cidade, decoys fora da rota', () => {
        const { route } = cases[d];
        const routeIds = new Set(route.map((r) => r.cityId));
        const minOpts = routeOptionsFor(d);
        for (let i = 0; i < route.length - 1; i++) {
          const opts = route[i].cluesGeneratedJson;
          assert.ok(opts && Array.isArray(opts.options), `passo ${i + 1} sem opções`);
          assert.ok(opts.options.length >= minOpts && opts.options.length <= minOpts + 1);
          assert.equal(opts.primary, route[i + 1].cityId);
          for (const id of opts.options) {
            if (id === opts.primary) continue;
            assert.ok(!routeIds.has(id), 'decoy é cidade da rota');
          }
        }
        assert.equal(route[route.length - 1].cluesGeneratedJson, null);
      });

      it('suspeitos: 12 no total, exatamente 1 culpado', () => {
        const { suspects } = cases[d];
        assert.equal(suspects.length, 12);
        assert.equal(suspects.filter((s) => s.isCulprit).length, 1);
      });

      it('dossiê é solucionável: filtro pelos 5 atributos do culpado → só o culpado', async () => {
        const { caseId, culprit } = cases[d];
        const matches = await prisma.caseSuspect.findMany({
          where: {
            caseId,
            sexId: culprit.sexId,
            hairId: culprit.hairId,
            hobbyId: culprit.hobbyId,
            vehicleId: culprit.vehicleId,
            featureId: culprit.featureId,
          },
        });
        assert.equal(matches.length, 1);
        assert.equal(matches[0].id, culprit.id);
      });

      it('pistas do vilão: uma por atributo do culpado, valores coerentes', async () => {
        const { caseId, culprit, villainClues } = cases[d];
        assert.ok(villainClues.length >= 4 && villainClues.length <= 5);
        const [sex, hair, hobby, vehicle, feature] = await Promise.all([
          prisma.attrSex.findUnique({ where: { id: culprit.sexId } }),
          prisma.attrHair.findUnique({ where: { id: culprit.hairId } }),
          prisma.attrHobby.findUnique({ where: { id: culprit.hobbyId } }),
          prisma.attrVehicle.findUnique({ where: { id: culprit.vehicleId } }),
          prisma.attrFeature.findUnique({ where: { id: culprit.featureId } }),
        ]);
        const expected = { sex: sex.name, hair: hair.name, hobby: hobby.name, vehicle: vehicle.name, feature: feature.name };
        for (const vc of villainClues) {
          assert.equal(vc.attributeValue, expected[vc.attributeType], `pista de ${vc.attributeType} não bate com o culpado`);
        }
      });

      it('localidades da cidade inicial: quantidade e mix conforme a dificuldade', () => {
        const { route, places } = cases[d];
        const mix = localitiesFor(d);
        const startCityId = route[0].cityId;
        const startPlaces = places.filter((p) => p.cityId === startCityId);
        assert.equal(startPlaces.length, mix.length);
        const nextLoc = startPlaces.filter((p) => p.clueType === 'NEXT_LOCATION').length;
        const villain = startPlaces.filter((p) => p.clueType === 'VILLAIN').length;
        assert.equal(nextLoc, mix.filter((c) => c === 'NEXT_LOCATION').length);
        assert.equal(villain, mix.filter((c) => c === 'VILLAIN').length);
      });

      it('exatamente 1 ponto de captura, na cidade final da rota', () => {
        const { route, places } = cases[d];
        const finalCityId = route[route.length - 1].cityId;
        const captures = places.filter((p) => p.isCaptureLocation);
        assert.equal(captures.length, 1);
        assert.equal(captures[0].cityId, finalCityId);
      });
    });
  }
});
