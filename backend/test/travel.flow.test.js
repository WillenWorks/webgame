process.env.AI_ENABLED = 'false'; // geração determinística nos testes

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { dbAvailable, createCaseForTest, prisma } from './helpers/testDb.js';
import { visitCurrentCityService } from '../src/services/visit.service.js';
import { investigateService } from '../src/services/investigate.service.js';
import { travelService } from '../src/services/travel.service.js';
import { getStepOptions } from '../src/repositories/route.repo.js';

const available = await dbAvailable();
const skip = available
  ? false
  : 'PostgreSQL indisponível — rode `docker compose up -d && npm run db:seed`';

describe('Fluxo de Investigação, Decoys e Desbloqueio do Mapa', { skip }, () => {
  let testCase;

  before(async () => {
    testCase = await createCaseForTest('EASY');
  });

  after(async () => {
    await testCase?.cleanup?.();
  });

  it('1. Cidade inicial inicia com mapa fechado (sem opções de viagem)', async () => {
    const visit = await visitCurrentCityService(testCase.caseId);
    assert.equal(visit.city.step_order, 1);
    assert.equal(visit.places.length, 3, 'EASY deve ter 3 localidades');
    assert.equal(visit.travelOptions.length, 0, 'Mapa deve estar fechado antes de coletar pistas');

    // Tentar viajar antes de investigar deve lançar erro
    const stepOptions = await getStepOptions(testCase.caseId, 1);
    const target = stepOptions.primary;
    await assert.rejects(
      async () => travelService(testCase.caseId, target),
      /Você precisa de ao menos uma pista antes de viajar/
    );
  });

  it('2. Investigar 1 localidade desbloqueia o mapa com ao menos 3 destinos', async () => {
    const initialVisit = await visitCurrentCityService(testCase.caseId);
    const firstPlace = initialVisit.places[0];

    const inv = await investigateService(testCase.caseId, firstPlace.id);
    assert.ok(inv.text, 'Investigação gerou texto da testemunha');

    const visitAfterClue = await visitCurrentCityService(testCase.caseId);
    assert.equal(visitAfterClue.travelOptions.length, 3, 'Deve liberar 3 destinos após 1 pista');
    assert.equal(visitAfterClue.isDecoy, false, 'Ainda está na cidade primária');
  });

  it('3. Viajar para destino incorreto (decoy) avisa erro de rota e mantém mapa aberto com outros destinos', async () => {
    const stepOptions = await getStepOptions(testCase.caseId, 1);
    const primaryId = stepOptions.primary;
    const decoyId = stepOptions.options.find((id) => id !== primaryId);

    // Viaja para o decoy
    const travelResult = await travelService(testCase.caseId, decoyId);
    assert.equal(travelResult.success, false, 'Viagem para decoy não é sucesso');
    assert.match(travelResult.message, /caminho errado/i);

    // Visita a cidade decoy
    const decoyVisit = await visitCurrentCityService(testCase.caseId);
    assert.equal(decoyVisit.city.city_id, decoyId, 'Jogador está na cidade decoy');
    assert.equal(decoyVisit.city.step_order, 1, 'Passo ainda é o passo 1');
    assert.equal(decoyVisit.isDecoy, true, 'isDecoy deve ser true');

    // No decoy, as opções de viagem disponíveis devem ser as outras opções (excluindo a própria cidade decoy)
    assert.equal(decoyVisit.travelOptions.length, 2, 'Deve mostrar as outras 2 opções');
    assert.ok(!decoyVisit.travelOptions.some((o) => o.id === decoyId), 'Decoy atual não deve estar nas opções');
    assert.ok(decoyVisit.travelOptions.some((o) => o.id === primaryId), 'Destino correto deve estar disponível');
  });

  it('4. Viajar do decoy para o destino correto avança de fase e fecha o mapa na nova cidade', async () => {
    const stepOptions = await getStepOptions(testCase.caseId, 1);
    const primaryId = stepOptions.primary;

    // Viaja diretamente do decoy para a cidade correta (sem precisar de pistas no decoy)
    const travelCorrect = await travelService(testCase.caseId, primaryId);
    assert.equal(travelCorrect.success, true, 'Viagem para destino correto é sucesso');

    // Visita a nova cidade (Passo 2)
    const newStepVisit = await visitCurrentCityService(testCase.caseId);
    assert.equal(newStepVisit.city.step_order, 2, 'Avançou para o passo 2');
    assert.equal(newStepVisit.city.city_id, primaryId, 'Jogador está na cidade primária do passo 2');
    assert.equal(newStepVisit.isDecoy, false);

    // Regra 5: O mapa na nova cidade inicia fechado até que se investigue nesta nova cidade!
    assert.equal(newStepVisit.travelOptions.length, 0, 'Mapa no passo 2 deve iniciar fechado até nova investigação');

    // Tentar viajar sem investigar no passo 2 deve ser rejeitado
    const step2Options = await getStepOptions(testCase.caseId, 2);
    if (step2Options) {
      await assert.rejects(
        async () => travelService(testCase.caseId, step2Options.primary),
        /Você precisa de ao menos uma pista antes de viajar/
      );
    }

    // Investigar no passo 2 deve reabrir o mapa para o passo 3
    const placeInStep2 = newStepVisit.places[0];
    await investigateService(testCase.caseId, placeInStep2.id);

    const visitAfterStep2Clue = await visitCurrentCityService(testCase.caseId);
    assert.equal(visitAfterStep2Clue.travelOptions.length, 3, 'Mapa do passo 2 abre após investigar');
  });
});
