/**
 * Sistema de fallbacks diegéticos.
 *
 * Sempre que a IA atingir timeout, erro de rede ou devolver algo inválido,
 * estes textos entram instantaneamente — mantendo tom, imersão e coerência
 * cultural sem revelar mecânicas de jogo.
 *
 * Nada aqui inventa destinos: as falas são genéricas o suficiente para nunca
 * contradizer a verdade canônica injetada pelo backend.
 */

const REPUTATION_TONE = {
  ALTA: {
    // NPC reconhece e admira o detetive.
    NEXT_LOCATION: [
      'É uma honra falar com a ACME! O suspeito comentou que precisava trocar dinheiro antes de "seguir viagem para longe". Não ouvi o destino, perdão.',
      'Fico feliz em ajudar, Agente. Ele estudava um mapa e falava de carimbos no passaporte. Parecia com pressa de cruzar a fronteira.',
      'Pela ACME, faço o que puder! Ele perguntou sobre voos internacionais e reclamou que o clima lá seria "bem diferente daqui".',
    ],
    VILLAIN_ATTRIBUTE: [
      'Sempre admirei o trabalho de vocês. Reparei numa pessoa estranha por aqui, mas só de relance — algo no jeito de andar chamou atenção.',
      'Que bom que a ACME está no caso! Vi alguém apressado, bem cuidado com a aparência. Não cheguei perto o bastante.',
    ],
    WARNING: [
      'Com todo respeito ao seu distintivo, Agente: acho que ninguém suspeito passou por aqui. Talvez seja melhor procurar em outro lugar.',
      'Admiro o seu trabalho, mas juro que este lugar esteve calmo o dia inteiro. Você pode estar seguindo uma pista falsa.',
    ],
    CAPTURE: [
      'AGENTE! É ELE! Correu para ali agora mesmo! Rápido!',
      'Graças a Deus a ACME chegou! O ladrão está bem ali — não deixe escapar!',
    ],
    DEFAULT: [
      'É sempre um prazer ajudar a ACME. Infelizmente hoje não vi nada fora do comum por aqui.',
    ],
  },

  NEUTRA: {
    NEXT_LOCATION: [
      'Vi um sujeito apressado mais cedo. Ficava olhando o relógio e falando em "pegar a conexão a tempo".',
      'Teve alguém aqui comprando lembrancinhas e trocando moeda. Comentou que no próximo lugar fazia muito mais frio.',
      'Uma pessoa estranha perguntou como chegar ao aeroporto. Levava pouca bagagem e muita pressa.',
    ],
    VILLAIN_ATTRIBUTE: [
      'Passou alguém por aqui, sim. Reparei pouco — só que cuidava bem da própria aparência.',
      'Vi uma pessoa apressada. Havia algo distinto no visual dela, mas não sei dizer o quê ao certo.',
    ],
    WARNING: [
      'Não vi ninguém estranho hoje. O movimento por aqui foi normal.',
      'Acho que você se enganou de lugar. Aqui não passou nada de diferente.',
    ],
    CAPTURE: [
      'Ei! Aquela pessoa ali — foi correndo pra aquele lado agora!',
      'Olha lá! Peguem essa pessoa, ela saiu correndo!',
    ],
    DEFAULT: [
      'Dia parado por aqui. Não reparei em ninguém fora do comum.',
    ],
  },

  BAIXA: {
    NEXT_LOCATION: [
      'Não tenho muito tempo pra você. Só ouvi alguém resmungando que ia "pra um lugar bem mais frio" e trocando dinheiro.',
      'Olha, eu vi alguém apressado, tá? Falava de passaporte e conexão de voo. É só o que vou dizer.',
    ],
    VILLAIN_ATTRIBUTE: [
      'Passou gente, passou. Alguém bem arrumado, cheio de pressa. Agora me deixa em paz.',
      'Vi uma pessoa esquisita, sim. Chamava atenção pela aparência. Não pergunte mais nada.',
    ],
    WARNING: [
      'Você não devia estar aqui. Não vi nada e não quero problema.',
      'Some daqui. Ninguém suspeito passou por este lugar.',
    ],
    CAPTURE: [
      'Tá lá! Correu pra ali! Agora não me envolva nisso.',
      'É aquele ali! Foi pra aquele lado. Já falei demais.',
    ],
    DEFAULT: [
      'Não tenho nada pra falar com você. Circulando.',
    ],
  },
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function normalizeReputation(reputation) {
  const r = String(reputation || '').toUpperCase();
  if (r.startsWith('ALTA') || r === 'HIGH') return 'ALTA';
  if (r.startsWith('BAIXA') || r === 'LOW') return 'BAIXA';
  return 'NEUTRA';
}

/**
 * Fallback diegético para uma fala de testemunha.
 * @param {{ reputation?: string, clueType?: string }} params
 * @returns {string}
 */
export function clueFallback({ reputation, clueType } = {}) {
  const tone = REPUTATION_TONE[normalizeReputation(reputation)];
  const key = String(clueType || 'DEFAULT').toUpperCase();
  const bucket = tone[key] || tone.DEFAULT;
  return pick(bucket);
}

// ── Briefings de caso por região (quando o gerador de casos falha) ───────
const REGION_BRIEFINGS = [
  {
    match: /brasil|argentina|peru|chile|colômbia|colombia|méxico|mexico|estados unidos|canadá|canada|américa|america/i,
    object: 'um artefato pré-colombiano de valor incalculável',
  },
  {
    match: /frança|franca|itália|italia|alemanha|espanha|portugal|reino unido|inglaterra|grécia|grecia|rússia|russia|europa/i,
    object: 'uma relíquia do acervo de um museu nacional',
  },
  {
    match: /japão|japao|china|índia|india|tailândia|tailandia|coreia|vietnã|vietna|indonésia|indonesia|ásia|asia/i,
    object: 'um tesouro imperial de valor histórico imenso',
  },
  {
    match: /egito|marrocos|áfrica do sul|africa do sul|quênia|quenia|nigéria|nigeria|etiópia|etiopia|áfrica|africa/i,
    object: 'uma peça arqueológica milenar recém-descoberta',
  },
  {
    match: /austrália|australia|nova zelândia|nova zelandia|oceania|fiji/i,
    object: 'um artefato sagrado de povos originários',
  },
];

/**
 * Fallback para metadados de caso quando o gerador de IA falha.
 * @param {{ cityName?: string, country?: string }} params
 */
export function caseFallback({ cityName = 'a cidade', country = '' } = {}) {
  const haystack = `${cityName} ${country}`;
  const region = REGION_BRIEFINGS.find((r) => r.match.test(haystack));
  const stolenObject = region
    ? `${region.object[0].toUpperCase()}${region.object.slice(1)}`
    : 'Um artefato cultural de valor incalculável';

  return {
    stolenObject,
    introText:
      `ATENÇÃO, AGENTE. ${stolenObject} desapareceu de um cofre em ${cityName}` +
      `${country ? `, ${country}` : ''} nesta madrugada. A ACME acredita que o ladrão ` +
      'já está em fuga e cada minuto conta. Vasculhe os pontos-chave da cidade, ' +
      'interrogue as testemunhas e siga o rastro antes que ele esfrie.',
    stolenObjectImage: '/images/artifact-placeholder.png',
  };
}

export default { clueFallback, caseFallback };
