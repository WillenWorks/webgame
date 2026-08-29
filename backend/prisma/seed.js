// ─────────────────────────────────────────────────────────────────────────────
// Operação Mundo — Seed base (idempotente)
//
//   npx prisma db seed            # via config "prisma.seed" no package.json
//   node prisma/seed.js
//
// Popula os dados de referência do jogo:
//   - Regiões, países e cidades mundiais (com coordenadas e dicas culturais)
//   - Vizinhança entre países (usada no cálculo de tempo de viagem)
//   - Tipos de local e pools de atributos de suspeitos
//   - Dificuldades, regras de XP e de reputação
//   - Patentes (Recruta da ACME → Diretor da ACME)
//
// Todas as operações são upsert / find-or-create: rodar novamente não duplica.
// ─────────────────────────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Regiões ──────────────────────────────────────────────────────────────────

const REGIONS = [
  'África',
  'América do Norte',
  'América do Sul',
  'Ásia',
  'Europa',
  'Oceania',
];

// ── Países (nome → região + nota cultural) ───────────────────────────────────

const COUNTRIES = [
  { name: 'Egito', region: 'África', cultural: 'Pirâmides de Gizé, o rio Nilo, a libra egípcia (EGP), ful medames e o hieróglifo.' },
  { name: 'Marrocos', region: 'África', cultural: 'Medinas labirínticas, o dirham marroquino (MAD), tagine e chá de hortelã.' },
  { name: 'África do Sul', region: 'África', cultural: 'Table Mountain, o rand (ZAR), o braai e onze idiomas oficiais.' },
  { name: 'Quênia', region: 'África', cultural: 'Safáris no Masai Mara, o xelim queniano (KES), ugali e a Grande Migração.' },
  { name: 'Nigéria', region: 'África', cultural: 'O Afrobeat, a naira (NGN), o jollof rice e Nollywood.' },
  { name: 'Etiópia', region: 'África', cultural: 'Berço do café, a injera, o birr (ETB) e um calendário próprio de 13 meses.' },

  { name: 'Estados Unidos', region: 'América do Norte', cultural: 'A Estátua da Liberdade, o dólar (USD), o beisebol e as estradas sem fim.' },
  { name: 'México', region: 'América do Norte', cultural: 'O Templo Mayor asteca, o peso mexicano (MXN), tacos e o Dia dos Mortos.' },
  { name: 'Canadá', region: 'América do Norte', cultural: 'A folha de bordo, o dólar canadense (CAD), a poutine e o hóquei no gelo.' },
  { name: 'Cuba', region: 'América do Norte', cultural: 'Carros clássicos, o peso cubano (CUP), o son, o rum e os charutos.' },
  { name: 'Guatemala', region: 'América do Norte', cultural: 'As ruínas maias de Tikal, o quetzal (GTQ) e os tecidos multicoloridos.' },

  { name: 'Brasil', region: 'América do Sul', cultural: 'O Cristo Redentor, o real (BRL), o samba, a feijoada e o Carnaval.' },
  { name: 'Argentina', region: 'América do Sul', cultural: 'O tango, o peso argentino (ARS), o bife de chorizo, o mate e a Patagônia.' },
  { name: 'Peru', region: 'América do Sul', cultural: 'Machu Picchu, o sol (PEN), o ceviche e a herança do Império Inca.' },
  { name: 'Colômbia', region: 'América do Sul', cultural: 'O Museu do Ouro, o peso colombiano (COP), o café e a cumbia.' },
  { name: 'Chile', region: 'América do Sul', cultural: 'A Cordilheira dos Andes, o peso chileno (CLP), o vinho e o deserto do Atacama.' },
  { name: 'Bolívia', region: 'América do Sul', cultural: 'O Salar de Uyuni, o boliviano (BOB), o altiplano e as cholitas.' },

  { name: 'Japão', region: 'Ásia', cultural: 'Templos e arranha-céus, o iene (JPY), o sushi e os trens-bala.' },
  { name: 'China', region: 'Ásia', cultural: 'A Cidade Proibida, o yuan / renminbi (CNY), a Grande Muralha e o dim sum.' },
  { name: 'Índia', region: 'Ásia', cultural: 'O Taj Mahal, a rúpia indiana (INR), o curry e o festival de Holi.' },
  { name: 'Tailândia', region: 'Ásia', cultural: 'Templos budistas dourados, o baht (THB), o pad thai e os mercados flutuantes.' },
  { name: 'Emirados Árabes Unidos', region: 'Ásia', cultural: 'O Burj Khalifa, o dirham dos Emirados (AED), o deserto e os souks de ouro.' },
  { name: 'Turquia', region: 'Ásia', cultural: 'A Hagia Sophia, a lira turca (TRY), o kebab e o Bósforo entre dois continentes.' },

  { name: 'França', region: 'Europa', cultural: 'A Torre Eiffel, o euro (EUR), o croissant e o Museu do Louvre.' },
  { name: 'Reino Unido', region: 'Europa', cultural: 'O Big Ben, a libra esterlina (GBP), o chá das cinco e os ônibus vermelhos de dois andares.' },
  { name: 'Itália', region: 'Europa', cultural: 'O Coliseu, o euro (EUR), a massa, o gelato e a Cidade do Vaticano.' },
  { name: 'Alemanha', region: 'Europa', cultural: 'O Portão de Brandemburgo, o euro (EUR), as salsichas e os vestígios do Muro.' },
  { name: 'Espanha', region: 'Europa', cultural: 'O Museu do Prado, o euro (EUR), as tapas e o flamenco.' },
  { name: 'Grécia', region: 'Europa', cultural: 'A Acrópole e o Partenon, o euro (EUR), a moussaka e a mitologia olímpica.' },
  { name: 'Rússia', region: 'Europa', cultural: 'A Praça Vermelha, o rublo (RUB), as matrioscas e a Catedral de São Basílio.' },

  { name: 'Austrália', region: 'Oceania', cultural: 'A Opera House de Sydney, o dólar australiano (AUD), os cangurus e o outback.' },
  { name: 'Nova Zelândia', region: 'Oceania', cultural: 'As colinas verdes, o dólar neozelandês (NZD), a haka Maori e o rúgbi.' },
  { name: 'Fiji', region: 'Oceania', cultural: 'As ilhas do Pacífico Sul, o dólar fijiano (FJD), a cerimônia da kava e os recifes de coral.' },
  { name: 'Papua-Nova Guiné', region: 'Oceania', cultural: 'A kina (PGK), as centenas de línguas tribais e a floresta tropical das terras altas.' },
];

// ── Cidades (nome, país, coordenadas, dica cultural) ─────────────────────────

const CITIES = [
  // África
  { name: 'Cairo', country: 'Egito', lat: 30.0444, lng: 31.2357, desc: 'À sombra das pirâmides de Gizé e às margens do Nilo; full medames no café da manhã, libras egípcias no bolso.' },
  { name: 'Marrakech', country: 'Marrocos', lat: 31.6295, lng: -7.9811, desc: 'A praça Jemaa el-Fna, os souks de especiarias, o tagine fumegante e o chá de hortelã servido bem alto.' },
  { name: 'Cidade do Cabo', country: 'África do Sul', lat: -33.9249, lng: 18.4241, desc: 'A Table Mountain recortando o céu, o braai no fim de tarde e o encontro de dois oceanos.' },
  { name: 'Nairóbi', country: 'Quênia', lat: -1.2921, lng: 36.8219, desc: 'Portão de entrada dos safáris, o xelim queniano, o ugali no prato e girafas nos arredores da cidade.' },
  { name: 'Lagos', country: 'Nigéria', lat: 6.5244, lng: 3.3792, desc: 'O batuque do Afrobeat, o mercado de Balogun, o jollof rice disputado e a naira trocada nas esquinas.' },
  { name: 'Adis Abeba', country: 'Etiópia', lat: 9.0300, lng: 38.7469, desc: 'A cerimônia do café que dura horas, a injera compartilhada e um calendário que marca outro ano.' },

  // América do Norte
  { name: 'Nova York', country: 'Estados Unidos', lat: 40.7128, lng: -74.006, desc: 'A Estátua da Liberdade na baía, os cachorros-quente de carrinho, os táxis amarelos e a Broadway acesa.' },
  { name: 'São Francisco', country: 'Estados Unidos', lat: 37.7749, lng: -122.4194, desc: 'A ponte Golden Gate na névoa, os bondes que sobem ladeiras e a baía gelada de Alcatraz.' },
  { name: 'Cidade do México', country: 'México', lat: 19.4326, lng: -99.1332, desc: 'O Templo Mayor asteca sob o centro histórico, os tacos al pastor e o mariachi na praça Garibaldi.' },
  { name: 'Toronto', country: 'Canadá', lat: 43.6532, lng: -79.3832, desc: 'A CN Tower espetando as nuvens, a poutine encharcada de molho e o dólar com a folha de bordo.' },
  { name: 'Havana', country: 'Cuba', lat: 23.1136, lng: -82.3666, desc: 'Os Chevrolets dos anos 50, o malecón batido pelo mar, o son nas esquinas e a fumaça dos charutos.' },
  { name: 'Cidade da Guatemala', country: 'Guatemala', lat: 14.6349, lng: -90.5069, desc: 'A porta de entrada para Tikal, o quetzal na cédula e no céu, e os huipiles tecidos à mão.' },

  // América do Sul
  { name: 'Rio de Janeiro', country: 'Brasil', lat: -22.9068, lng: -43.1729, desc: 'O Cristo Redentor de braços abertos, o Pão de Açúcar, a feijoada de sábado e o real trocado na praia.' },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816, desc: 'O tango no bairro de La Boca, o bife de chorizo, o mate passando de mão em mão e os pesos aos maços.' },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428, desc: 'O ceviche fresquíssimo, o sol na carteira, a garoa costeira e os caminhos que levam a Machu Picchu.' },
  { name: 'Bogotá', country: 'Colômbia', lat: 4.711, lng: -74.0721, desc: 'O Museu do Ouro repleto de peças pré-colombianas, o café das montanhas e a cumbia no rádio.' },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693, desc: 'A parede dos Andes ao fundo, as empanadas de pino, o vinho do valle e o peso chileno de muitos zeros.' },
  { name: 'La Paz', country: 'Bolívia', lat: -16.5, lng: -68.15, desc: 'A cidade mais alta do mundo, os teleféricos cruzando o céu, as cholitas de chapéu-coco e o boliviano.' },

  // Ásia
  { name: 'Tóquio', country: 'Japão', lat: 35.6762, lng: 139.6503, desc: 'Templos silenciosos entre arranha-céus, o sushi no balcão, o iene e o Shinkansen pontual ao segundo.' },
  { name: 'Pequim', country: 'China', lat: 39.9042, lng: 116.4074, desc: 'A Cidade Proibida, a Grande Muralha serpenteando as colinas, o dim sum no vapor e o yuan (renminbi).' },
  { name: 'Nova Délhi', country: 'Índia', lat: 28.6139, lng: 77.209, desc: 'O Portão da Índia, o curry perfumado, a rúpia e o Taj Mahal a poucas horas de trem, em Agra.' },
  { name: 'Bangcoc', country: 'Tailândia', lat: 13.7563, lng: 100.5018, desc: 'Os templos dourados, o pad thai na banca, os mercados flutuantes e o baht com a imagem do rei.' },
  { name: 'Dubai', country: 'Emirados Árabes Unidos', lat: 25.2048, lng: 55.2708, desc: 'O Burj Khalifa furando o céu do deserto, o souk do ouro e o dirham dos Emirados.' },
  { name: 'Istambul', country: 'Turquia', lat: 41.0082, lng: 28.9784, desc: 'A Hagia Sophia, o Grande Bazar, o kebab na brasa, a lira turca e o Bósforo separando dois continentes.' },

  // Europa
  { name: 'Paris', country: 'França', lat: 48.8566, lng: 2.3522, desc: 'A Torre Eiffel iluminada, os croissants amanteigados, o euro e as galerias infinitas do Louvre.' },
  { name: 'Londres', country: 'Reino Unido', lat: 51.5074, lng: -0.1278, desc: 'O Big Ben marcando as horas, o chá das cinco, a libra esterlina e os ônibus vermelhos de dois andares.' },
  { name: 'Roma', country: 'Itália', lat: 41.9028, lng: 12.4964, desc: 'O Coliseu, a massa al dente, o gelato ao entardecer, o euro e a Cidade do Vaticano encravada no centro.' },
  { name: 'Berlim', country: 'Alemanha', lat: 52.52, lng: 13.405, desc: 'O Portão de Brandemburgo, os pedaços preservados do Muro, a currywurst e o euro.' },
  { name: 'Madri', country: 'Espanha', lat: 40.4168, lng: -3.7038, desc: 'O Museu do Prado, as tapas de balcão em balcão, o flamenco à noite e o euro.' },
  { name: 'Atenas', country: 'Grécia', lat: 37.9838, lng: 23.7275, desc: 'A Acrópole coroada pelo Partenon, a moussaka, o euro e os mitos gravados em cada pedra.' },
  { name: 'Moscou', country: 'Rússia', lat: 55.7558, lng: 37.6173, desc: 'A Praça Vermelha, as cúpulas coloridas de São Basílio, as matrioscas e o rublo.' },

  // Oceania
  { name: 'Sydney', country: 'Austrália', lat: -33.8688, lng: 151.2093, desc: 'As velas brancas da Opera House, a Harbour Bridge, o dólar australiano e cangurus a uma curta viagem.' },
  { name: 'Melbourne', country: 'Austrália', lat: -37.8136, lng: 144.9631, desc: 'Os bondes históricos, os becos de café, o críquete no MCG e o dólar australiano.' },
  { name: 'Wellington', country: 'Nova Zelândia', lat: -41.2865, lng: 174.7762, desc: 'As colinas verdes sobre o porto, a haka Maori, o dólar neozelandês e os estúdios de cinema.' },
  { name: 'Auckland', country: 'Nova Zelândia', lat: -36.8485, lng: 174.7633, desc: 'A cidade das velas entre vulcões adormecidos, a cultura polinésia e o dólar neozelandês.' },
  { name: 'Suva', country: 'Fiji', lat: -18.1416, lng: 178.4419, desc: 'A capital do Pacífico Sul, a cerimônia da kava, o dólar fijiano e os recifes de coral ao redor.' },
  { name: 'Port Moresby', country: 'Papua-Nova Guiné', lat: -9.4438, lng: 147.1803, desc: 'A kina na carteira, as máscaras cerimoniais das terras altas e a floresta tropical logo além da cidade.' },
];

// ── Vizinhança entre países (fronteiras terrestres relevantes) ───────────────

const NEIGHBORS = [
  ['Estados Unidos', 'México'],
  ['Estados Unidos', 'Canadá'],
  ['México', 'Guatemala'],
  ['Brasil', 'Argentina'],
  ['Brasil', 'Peru'],
  ['Brasil', 'Colômbia'],
  ['Brasil', 'Bolívia'],
  ['Argentina', 'Chile'],
  ['Argentina', 'Bolívia'],
  ['Peru', 'Chile'],
  ['Peru', 'Bolívia'],
  ['Peru', 'Colômbia'],
  ['França', 'Itália'],
  ['França', 'Alemanha'],
  ['França', 'Espanha'],
  ['Egito', 'Marrocos'], // não fazem fronteira, mas rota costeira norte-africana usada como "vizinha" p/ viagem
  ['Nigéria', 'Quênia'],
];

// ── Tipos de local (com arquétipo de NPC para a IA) ──────────────────────────

const PLACE_TYPES = [
  { name: 'Aeroporto Internacional', interactionStyle: 'Funcionário apressado do balcão de informações, sempre de olho no relógio.' },
  { name: 'Mercado Central', interactionStyle: 'Comerciante tagarela que conhece todo mundo do bairro.' },
  { name: 'Museu Nacional', interactionStyle: 'Curador erudito e formal, que fala como se estivesse dando uma palestra.' },
  { name: 'Estação Ferroviária', interactionStyle: 'Bilheteiro mal-humorado e lacônico, cansado de responder as mesmas perguntas.' },
  { name: 'Hotel de Luxo', interactionStyle: 'Concierge diplomático e discreto, que nunca revela mais do que o necessário.' },
  { name: 'Banco Central', interactionStyle: 'Gerente desconfiado que pesa cada palavra antes de falar.' },
  { name: 'Porto', interactionStyle: 'Estivador rústico e direto, com histórias de embarcações estranhas.' },
  { name: 'Universidade', interactionStyle: 'Professora distraída que se perde em tangentes acadêmicas.' },
  { name: 'Delegacia de Polícia', interactionStyle: 'Detetive local cético, que já ouviu todas as desculpas do mundo.' },
  { name: 'Restaurante Típico', interactionStyle: 'Chef orgulhoso da cozinha regional, que descreve tudo em termos de comida.' },
  { name: 'Embaixada', interactionStyle: 'Adido cultural cauteloso, treinado para não se comprometer.' },
  { name: 'Feira de Antiguidades', interactionStyle: 'Antiquário astuto que avalia as pessoas como avalia relíquias.' },
];

// ── Pools de atributos de suspeitos ─────────────────────────────────────────

const ATTRIBUTES = {
  attrSex: ['Masculino', 'Feminino'],
  attrHair: ['Loiro', 'Ruivo', 'Preto', 'Castanho', 'Grisalho', 'Careca', 'Colorido', 'Trançado', 'Longo', 'Curto', 'Encaracolado'],
  attrHobby: ['Tênis', 'Croquet', 'Paraquedismo', 'Mergulho', 'Xadrez', 'Jardinagem', 'Yoga', 'Pintura', 'Astronomia', 'Vôlei', 'História', 'Arqueologia', 'Colecionismo', 'Críquete', 'Polo', 'Esgrima'],
  attrVehicle: ['Limusine', 'Moto Esportiva', 'Conversível', 'Jato Privado', 'Iate', 'Bicicleta', 'Tuk-tuk', 'Caminhão', 'Helicóptero', 'Carro Antigo', 'Hovercraft', 'Dirigível', 'Veleiro'],
  attrFeature: ['Tatuagem', 'Cicatriz', 'Óculos', 'Chapéu', 'Joia Exótica', 'Anel de Rubi', 'Colar de Pérolas', 'Bengala', 'Luvas', 'Sarda', 'Marca de Nascença', 'Monóculo', 'Relógio de Bolso'],
};

// ── Dificuldades + regras de XP e reputação ─────────────────────────────────

const DIFFICULTIES = [
  { code: 'EASY', maxFailsAllowed: 3, visitsBuffer: 5, xp: { xpBase: 200, bonusTimeFactor: 0.8, bonusPrecision: 50, debuffFailureFactor: 0.4 } },
  { code: 'HARD', maxFailsAllowed: 0, visitsBuffer: 1, xp: { xpBase: 400, bonusTimeFactor: 0.9, bonusPrecision: 90, debuffFailureFactor: 0.3 } },
  { code: 'EXTREME', maxFailsAllowed: 0, visitsBuffer: 0, xp: { xpBase: 600, bonusTimeFactor: 1.0, bonusPrecision: 130, debuffFailureFactor: 0.2 } },
];

const REPUTATION_RULES = [
  { minRep: -100000, maxRep: -50, debuffBaseFactor: 0.5, bonusMultiplier: 0.85 },
  { minRep: -49, maxRep: -1, debuffBaseFactor: 0.75, bonusMultiplier: 0.95 },
  { minRep: 0, maxRep: 49, debuffBaseFactor: 1.0, bonusMultiplier: 1.0 },
  { minRep: 50, maxRep: 999, debuffBaseFactor: 1.0, bonusMultiplier: 1.1 },
  { minRep: 1000, maxRep: 100000, debuffBaseFactor: 1.0, bonusMultiplier: 1.25 },
];

// ── Patentes (Recruta da ACME → Diretor da ACME) ────────────────────────────

const RANKS = [
  { id: 1, title: 'Recruta da ACME', minXp: 0, maxXp: 999, missionSelectUnlocked: false, difficultyModifier: 1.0 },
  { id: 2, title: 'Agente de Campo', minXp: 1000, maxXp: 4999, missionSelectUnlocked: false, difficultyModifier: 1.1 },
  { id: 3, title: 'Investigador Sênior', minXp: 5000, maxXp: 14999, missionSelectUnlocked: true, difficultyModifier: 1.2 },
  { id: 4, title: 'Detetive-Chefe', minXp: 15000, maxXp: 39999, missionSelectUnlocked: true, difficultyModifier: 1.3 },
  { id: 5, title: 'Superintendente', minXp: 40000, maxXp: 99999, missionSelectUnlocked: true, difficultyModifier: 1.4 },
  { id: 6, title: 'Diretor da ACME', minXp: 100000, maxXp: null, missionSelectUnlocked: true, difficultyModifier: 1.5 },
];

// ─────────────────────────────────────────────────────────────────────────────

async function seedRegions() {
  const map = {};
  for (const name of REGIONS) {
    const row = await prisma.region.upsert({ where: { name }, update: {}, create: { name } });
    map[name] = row.id;
  }
  return map;
}

async function seedCountries(regionMap) {
  const map = {};
  for (const c of COUNTRIES) {
    const row = await prisma.country.upsert({
      where: { name: c.name },
      update: { regionId: regionMap[c.region], culturalInfo: c.cultural },
      create: { name: c.name, regionId: regionMap[c.region], culturalInfo: c.cultural },
    });
    map[c.name] = row.id;
  }
  return map;
}

async function seedCities(countryMap) {
  for (const c of CITIES) {
    const countryId = countryMap[c.country];
    if (!countryId) throw new Error(`Seed: país desconhecido para a cidade ${c.name}: ${c.country}`);
    const data = {
      name: c.name,
      countryId,
      latitude: c.lat,
      longitude: c.lng,
      descriptionPrompt: c.desc,
      imageUrl: '/images/city-placeholder.png',
    };
    const existing = await prisma.city.findFirst({ where: { name: c.name, countryId } });
    if (existing) {
      await prisma.city.update({ where: { id: existing.id }, data });
    } else {
      await prisma.city.create({ data });
    }
  }
}

async function seedNeighbors(countryMap) {
  for (const [a, b] of NEIGHBORS) {
    const ca = countryMap[a];
    const cb = countryMap[b];
    if (!ca || !cb) continue;
    // Bidirecional: o cálculo de viagem consulta a vizinhança em um sentido só.
    for (const [countryId, neighborCountryId] of [[ca, cb], [cb, ca]]) {
      await prisma.countryNeighbor.upsert({
        where: { countryId_neighborCountryId: { countryId, neighborCountryId } },
        update: {},
        create: { countryId, neighborCountryId },
      });
    }
  }
}

async function seedPlaceTypes() {
  for (const pt of PLACE_TYPES) {
    const existing = await prisma.placeType.findFirst({ where: { name: pt.name } });
    if (existing) {
      await prisma.placeType.update({ where: { id: existing.id }, data: { interactionStyle: pt.interactionStyle } });
    } else {
      await prisma.placeType.create({ data: pt });
    }
  }
}

async function seedAttributes() {
  const models = {
    attrSex: prisma.attrSex,
    attrHair: prisma.attrHair,
    attrHobby: prisma.attrHobby,
    attrVehicle: prisma.attrVehicle,
    attrFeature: prisma.attrFeature,
  };
  for (const [key, values] of Object.entries(ATTRIBUTES)) {
    for (const name of values) {
      await models[key].upsert({ where: { name }, update: {}, create: { name } });
    }
  }
}

async function seedDifficultiesAndRules() {
  for (const d of DIFFICULTIES) {
    const diff = await prisma.gameDifficulty.upsert({
      where: { code: d.code },
      update: { maxFailsAllowed: d.maxFailsAllowed, visitsBuffer: d.visitsBuffer },
      create: { code: d.code, maxFailsAllowed: d.maxFailsAllowed, visitsBuffer: d.visitsBuffer },
    });
    await prisma.xpRule.upsert({
      where: { difficultyId: diff.id },
      update: d.xp,
      create: { difficultyId: diff.id, ...d.xp },
    });
  }

  // Regras de reputação: sem chave natural — recria o conjunto inteiro.
  await prisma.reputationRule.deleteMany({});
  await prisma.reputationRule.createMany({ data: REPUTATION_RULES });
}

async function seedRanks() {
  for (const r of RANKS) {
    await prisma.rank.upsert({ where: { id: r.id }, update: r, create: r });
  }
}

async function main() {
  console.log('[seed] Iniciando seed de Operação Mundo…');

  const regionMap = await seedRegions();
  console.log(`[seed] Regiões: ${Object.keys(regionMap).length}`);

  const countryMap = await seedCountries(regionMap);
  console.log(`[seed] Países: ${Object.keys(countryMap).length}`);

  await seedCities(countryMap);
  console.log(`[seed] Cidades: ${CITIES.length}`);

  await seedNeighbors(countryMap);
  console.log(`[seed] Vizinhanças: ${NEIGHBORS.length} pares (bidirecionais)`);

  await seedPlaceTypes();
  console.log(`[seed] Tipos de local: ${PLACE_TYPES.length}`);

  await seedAttributes();
  const attrTotal = Object.values(ATTRIBUTES).reduce((n, a) => n + a.length, 0);
  console.log(`[seed] Atributos de suspeito: ${attrTotal}`);

  await seedDifficultiesAndRules();
  console.log(`[seed] Dificuldades + regras de XP: ${DIFFICULTIES.length} | regras de reputação: ${REPUTATION_RULES.length}`);

  await seedRanks();
  console.log(`[seed] Patentes: ${RANKS.length}`);

  console.log('[seed] Concluído com sucesso.');
}

main()
  .catch((err) => {
    console.error('[seed] Falhou:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
