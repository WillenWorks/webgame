import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  extractFacts,
  buildNextLocationClue,
  buildVillainAttributeClue,
  CLUE_TOPICS,
} from '../src/domain/clue.rules.js';

// Amostra fiel ao seed (backend/prisma/seed.js).
const PARIS = {
  cityName: 'Paris',
  countryName: 'França',
  descriptionPrompt:
    'A Torre Eiffel iluminada, os croissants amanteigados, o euro e as galerias infinitas do Louvre.',
  culturalInfo: 'A Torre Eiffel, o euro (EUR), o croissant e o Museu do Louvre.',
};
const RIO = {
  cityName: 'Rio de Janeiro',
  countryName: 'Brasil',
  descriptionPrompt:
    'O Cristo Redentor de braços abertos, o Pão de Açúcar, a feijoada de sábado e o real trocado na praia.',
  culturalInfo: 'O Cristo Redentor, o real (BRL), o samba, a feijoada e o Carnaval.',
};

const rand0 = () => 0; // determinístico: sempre o primeiro item

describe('extractFacts — fragmentos utilizáveis a partir do seed', () => {
  it('nunca contém o nome da cidade nem do país alvo', () => {
    const facts = extractFacts(PARIS);
    assert.ok(facts.length > 0);
    for (const f of facts) {
      assert.ok(!/paris/i.test(f), `fragmento vazou o nome da cidade: "${f}"`);
      assert.ok(!/frança/i.test(f), `fragmento vazou o nome do país: "${f}"`);
    }
  });

  it('mantém marcos/moeda/culinária reais', () => {
    const facts = extractFacts(PARIS).join(' | ').toLowerCase();
    assert.ok(/torre eiffel/.test(facts));
    assert.ok(/louvre/.test(facts));
    assert.ok(/euro/.test(facts));
  });
});

describe('buildNextLocationClue — pista determinística e validada', () => {
  it('a pista nunca cita o nome da cidade-alvo diretamente', () => {
    for (const topic of CLUE_TOPICS) {
      for (const rep of ['ALTA', 'NEUTRA', 'BAIXA']) {
        const clue = buildNextLocationClue({ ...RIO, topicCategory: topic, reputation: rep, rand: rand0 });
        assert.ok(!/rio de janeiro/i.test(clue), `pista vazou a cidade (${topic}/${rep}): "${clue}"`);
        assert.ok(!/\bbrasil\b/i.test(clue), `pista vazou o país (${topic}/${rep}): "${clue}"`);
        assert.ok(clue.length > 20);
      }
    }
  });

  it('cita um fato realmente presente no texto cultural de origem', () => {
    const clue = buildNextLocationClue({ ...PARIS, topicCategory: 'Economia', reputation: 'NEUTRA', rand: rand0 });
    assert.ok(/euro/i.test(clue), `pista de Economia deveria citar a moeda: "${clue}"`);
  });

  it('degrada com segurança quando não há dados culturais', () => {
    const clue = buildNextLocationClue({
      cityName: 'X', countryName: 'Y', culturalInfo: '', descriptionPrompt: '', reputation: 'NEUTRA', rand: rand0,
    });
    assert.ok(typeof clue === 'string' && clue.length > 10);
  });
});

describe('buildVillainAttributeClue — revela só o atributo fornecido', () => {
  it('inclui o valor do atributo e nada inventado', () => {
    const clue = buildVillainAttributeClue({ attributeType: 'hair', attributeValue: 'Ruivo', reputation: 'NEUTRA' });
    assert.ok(/ruivo/i.test(clue));
  });
});
