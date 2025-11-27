// --------------------------
// Dados do Caso Piloto
// --------------------------

const caseData = {
  caseId: "case_001",
  title: "O Roubo do Meridiano Zero",
  description:
    "O artefato histórico Relógio do Meridiano Zero foi roubado no Observatório de Greenwich. O suspeito deixou pistas culturais durante a fuga.",
  villainId: "suspect_carlos_monaco",
  startCityId: "london",
  route: ["london", "paris", "rome", "cairo", "tokyo"],
}

// --------------------------
// Dados das Cidades
// --------------------------

const cities = [
  {
    cityId: "london",
    name: "Londres",
    country: "Reino Unido",
    language: "Inglês",
    currency: "Libra Esterlina",
    landmarks: ["Big Ben", "London Eye", "Rio Tâmisa"],
  },
  {
    cityId: "paris",
    name: "Paris",
    country: "França",
    language: "Francês",
    currency: "Euro",
    landmarks: ["Torre Eiffel", "Louvre", "Rio Sena"],
  },
  {
    cityId: "rome",
    name: "Roma",
    country: "Itália",
    language: "Italiano",
    currency: "Euro",
    landmarks: ["Coliseu", "Fórum Romano", "Fontana di Trevi"],
  },
  {
    cityId: "cairo",
    name: "Cairo",
    country: "Egito",
    language: "Árabe",
    currency: "Libra Egípcia",
    landmarks: ["Pirâmides de Gizé", "Rio Nilo", "Esfinge"],
  },
  {
    cityId: "tokyo",
    name: "Tóquio",
    country: "Japão",
    language: "Japonês",
    currency: "Iene",
    landmarks: ["Shibuya", "Tokyo Tower", "Palácio Imperial"],
  },
]

// --------------------------
// Dados das Pistas
// --------------------------

const clues = [
  {
    clueId: "clue_london_to_paris",
    fromCityId: "london",
    toCityId: "paris",
    text:
      "A testemunha ouviu o suspeito mencionar uma torre de ferro próximo a um rio famoso.",
    type: "cultural",
  },
  {
    clueId: "clue_paris_to_rome",
    fromCityId: "paris",
    toCityId: "rome",
    text:
      "O criminoso comentou sobre ruínas antigas e gladiadores. Parece que ele curte história romana.",
    type: "histórica",
  },
  {
    clueId: "clue_rome_to_cairo",
    fromCityId: "rome",
    toCityId: "cairo",
    text:
      "Uma pista fala sobre desertos, pirâmides e um rio que corta um império antigo.",
    type: "geográfica",
  },
  {
    clueId: "clue_cairo_to_tokyo",
    fromCityId: "cairo",
    toCityId: "tokyo",
    text:
      "A última pista menciona templos, tecnologia, e uma cidade onde cruzamentos viram mar de pessoas.",
    type: "cultural",
  },
]

// --------------------------
// Dados do Suspeito
// --------------------------

const suspect = {
  suspectId: "suspect_carlos_monaco",
  name: 'Carlos "Monaco" Navarro',
  description:
    "Ladrão internacional de arte e relíquias. Sofisticado, provocador e sempre deixa pistas culturais.",
  traits: {
    height: "alto",
    hair: "castanho escuro",
    style: "terno elegante e relógio de bolso",
    languages: ["Inglês", "Francês", "Italiano"],
    signature: "Sempre deixa pistas relacionadas a tempo e fronteiras.",
  },
}

// --------------------------
// Exportações
// --------------------------

module.exports = {
  caseData,
  cities,
  clues,
  suspect,
}
