// src/domain/clue.rules.js
// Construção PURA e determinística de pistas — sem acesso a banco e sem IA.
//
// Regra de ouro: a pista de próximo destino é montada EXCLUSIVAMENTE a partir
// dos dados culturais validados da própria cidade-alvo (seed). Por construção
// ela nunca cita outra cidade. O nome literal da cidade/país é removido para
// manter o indício indireto — o jogador deduz o destino pelos marcos, moeda,
// culinária, etc.

export const CLUE_TOPICS = [
  'História', 'Geografia', 'Economia', 'Culinária', 'Arte', 'Religião', 'Costumes', 'Bandeira',
];

const TOPIC_KEYWORDS = {
  'Economia': /moeda|c[âa]mbio|trocar dinheiro|\((?:[A-Z]{3})\)|euro|d[óo]lar|peso|real|iene|yuan|renminbi|libra|rublo|r[úu]pia|dirham|baht|rand|xelim|naira|birr|quetzal|boliviano|kina|lira|sol\b/i,
  'Culinária': /comida|prato|culin[áa]ria|caf[ée]|ch[áa]|feijoada|sushi|tacos|pad thai|kebab|injera|ceviche|tagine|poutine|jollof|ugali|gelato|croissant|dim sum|moussaka|empanada|ful medames|braai|mate\b|currywurst|tapas|pierogi|matrioscas/i,
  'Arte': /museu|louvre|prado|acervo|galeria|[óo]pera|opera house|teatro|broadway|ouro/i,
  'História': /pir[âa]mide|ru[íi]na|hist[óo]ria|imp[ée]rio|asteca|maia|inca|muralha|coliseu|acr[óo]pole|partenon|templo|cidade proibida|hagia sophia|forte|castelo|muro/i,
  'Geografia': /montanha|cordilheira|andes|rio\b|nilo|deserto|ilha|ba[íi]a|porto|ponte|vulc[ãa]o|oceano|fronteira|b[óo]sforo|colinas|altiplano/i,
  'Religião': /catedral|igreja|templo|mesquita|vaticano|budista|s[ãa]o basílio|monast[ée]rio/i,
  'Costumes': /carnaval|tango|samba|festival|holi|kava|haka|dia dos mortos|mercado|souk|bazar|feira/i,
  'Bandeira': /bandeira|folha de bordo|cangur|estrelas/i,
};

function stripNames(text, names) {
  let out = text;
  for (const n of names.filter(Boolean)) {
    out = out.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
  }
  return out;
}

/** Quebra o texto cultural em fragmentos utilizáveis como indício. */
export function extractFacts({ culturalInfo = '', descriptionPrompt = '', cityName = '', countryName = '' }) {
  const raw = `${descriptionPrompt} ${culturalInfo}`;
  const cleaned = stripNames(raw, [cityName, countryName]);
  return cleaned
    .split(/[,;.]/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .map((s) => s.replace(/^(a|o|as|os|um|uma|e|no|na|nos|nas|de|do|da)\s+/i, '').trim())
    .filter((s) => s.length >= 6 && /[a-zà-ú]/i.test(s))
    .filter((s) => !/^\(?[A-Z]{3}\)?$/.test(s));
}

function pickFact(facts, topicCategory, rand) {
  if (facts.length === 0) return null;
  const re = TOPIC_KEYWORDS[topicCategory];
  const matches = re ? facts.filter((f) => re.test(f)) : [];
  const pool = matches.length ? matches : facts;
  return pool[Math.floor(rand() * pool.length)];
}

function lowerFirst(s) {
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

function normalizeReputation(reputation) {
  const r = String(reputation || '').toUpperCase();
  if (r.startsWith('ALTA') || r === 'HIGH') return 'ALTA';
  if (r.startsWith('BAIXA') || r === 'LOW') return 'BAIXA';
  return 'NEUTRA';
}

const NEXT_LOCATION_TEMPLATES = {
  ALTA: [
    (f) => `É uma honra ajudar a ACME! O suspeito comentou que ia para um lugar famoso por ${f} e parecia com pressa de embarcar.`,
    (f) => `Fico feliz em colaborar, Agente. Ele falava empolgado sobre ${f} enquanto conferia o passaporte.`,
  ],
  NEUTRA: [
    (f) => `Um sujeito apressado passou por aqui mais cedo. Ficava falando de ${f} e olhando o relógio.`,
    (f) => `Teve alguém comprando passagem às pressas. Mencionou ${f} e que no destino o clima era bem diferente.`,
    (f) => `Vi uma pessoa de partida. Ela comentou algo sobre ${f} antes de correr para o embarque.`,
  ],
  BAIXA: [
    (f) => `Não tenho tempo pra você. Só ouvi alguém resmungar sobre ${f} antes de sumir.`,
    (f) => `Olha, passou um tipo estranho, tá? Falou de ${f} e foi embora. É só o que sei.`,
  ],
};

/**
 * Pista determinística de próximo destino a partir dos dados validados do alvo.
 * @returns {string}
 */
export function buildNextLocationClue({
  cityName, countryName, culturalInfo, descriptionPrompt,
  topicCategory = null, reputation = 'NEUTRA', rand = Math.random,
}) {
  const facts = extractFacts({ culturalInfo, descriptionPrompt, cityName, countryName });
  const fact = pickFact(facts, topicCategory, rand);
  const tone = NEXT_LOCATION_TEMPLATES[normalizeReputation(reputation)];
  const tmpl = tone[Math.floor(rand() * tone.length)];

  if (!fact) {
    return 'Um sujeito apressado passou por aqui, falando em pegar a próxima conexão antes que fosse tarde.';
  }
  return tmpl(lowerFirst(fact));
}

const ATTR_LABEL = {
  vehicle: 'o veículo em que fugiu',
  hobby: 'um passatempo que comentava sem parar',
  hair: 'o cabelo',
  feature: 'um detalhe marcante na aparência',
  sex: 'quem eu vi',
};

const VILLAIN_ATTR_TEMPLATES = {
  ALTA: (label, value) => `Que bom que a ACME assumiu o caso! Sobre ${label}: reparei claramente — ${value}.`,
  NEUTRA: (label, value) => `Passou alguém apressado por aqui. Sobre ${label}, o que me chamou atenção foi: ${value}.`,
  BAIXA: (label, value) => `Vi a pessoa, sim. ${label[0].toUpperCase()}${label.slice(1)}: ${value}. Agora me deixe em paz.`,
};

/**
 * Fala determinística que revela UM atributo do vilão (usada quando a IA
 * está desligada ou falha). Nunca inventa outros atributos.
 * @returns {string}
 */
export function buildVillainAttributeClue({ attributeType, attributeValue, reputation = 'NEUTRA' }) {
  const label = ATTR_LABEL[attributeType] || 'a aparência';
  const value = String(attributeValue || '').trim() || 'algo difícil de descrever';
  const tmpl = VILLAIN_ATTR_TEMPLATES[normalizeReputation(reputation)] || VILLAIN_ATTR_TEMPLATES.NEUTRA;
  return tmpl(label, value.toLowerCase());
}
