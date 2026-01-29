/**
 * Base de dados de artefatos por região/país.
 * Quando a cidade não tiver match específico, usa 'General'.
 */
import { getEntityImage } from './image.generator.service.js';

const ARTIFACTS = {
  // Asia
  'Japan': ['Espada Katana de um Daimyo', 'Manuscrito antigo de Haiku', 'Vaso de Porcelana Imari', 'Máscara do Teatro Noh'],
  'China': ['Vaso da Dinastia Ming', 'Estátua de Buda de Jade', 'Pergaminho de Caligrafia Imperial', 'Selo de Ouro do Imperador'],
  'India': ['Diamante Koh-i-Noor (Réplica)', 'Estátua de Ganesha de Bronze', 'Tecido de Seda de Varanasi', 'Manuscrito Védico Antigo'],
  // Europe
  'France': ['Quadro do Louvre', 'Gárgula de Notre Dame', 'Receita Secreta de Queijo', 'Coroa de Napoleão'],
  'United Kingdom': ['Jóias da Coroa', 'Primeira Edição de Shakespeare', 'Pedra de Rosetta (Empréstimo)', 'Cetro Real'],
  'Italy': ['Máscara de Veneza', 'Esboço de Da Vinci', 'Fragmento do Coliseu', 'Anel Papal'],
  // Americas
  'Brazil': ['Troféu da Copa do Mundo', 'Cristal de Ametista Gigante', 'Pena de Tucano Dourada', 'Mapa Antigo da Amazônia'],
  'USA': ['Declaração de Independência', 'Sino da Liberdade', 'Guitarra de Elvis Presley', 'Traje Espacial da NASA'],
  // Africa
  'Egypt': ['Máscara de Tutankamon', 'Pergaminho do Livro dos Mortos', 'Escaravelho de Ouro', 'Busto de Nefertiti'],
  'Kenya': ['Lança Masai Cerimonial', 'Escultura de Ébano', 'Dente de Leão Ancestral'],
  // General fallback
  'General': ['Moeda Rara de Ouro', 'Documento Secreto', 'Chip de Computador Quântico', 'Mapa do Tesouro Perdido']
};

/**
 * Gera um objeto roubado e uma narrativa inicial baseada na cidade de partida.
 * Agora retorna também a URL da imagem do artefato (async).
 */
export async function generateCaseMetadata(city) {
  const country = city?.country_name || 'General';
  
  // Tenta encontrar artefatos do país, ou da região (se tivéssemos mapeamento), ou fallback
  let options = ARTIFACTS[country] || ARTIFACTS['General'];
  
  // Se o país não estiver na lista mas tivermos um "General"
  if (!options) options = ARTIFACTS['General'];

  const artifact = options[Math.floor(Math.random() * options.length)];
  
  const intros = [
    `URGENTE: O tesouro nacional "${artifact}" foi roubado hoje cedo em ${city.name}!`,
    `Atenção Detetive: Recebemos um alerta de que "${artifact}" desapareceu de um museu em ${city.name}.`,
    `A ACME precisa de você! O famoso "${artifact}" foi furtado em ${city.name} e o ladrão está em fuga.`,
    `Um crime audacioso ocorreu em ${city.name}: "${artifact}" foi levado e as autoridades estão confusas.`
  ];

  const intro = intros[Math.floor(Math.random() * intros.length)];
  
  // Generate Image for the artifact
  // Identifier = artifact name (normalized)
  const imageUrl = await getEntityImage('artifact', artifact, `Valuable artifact: ${artifact}`);

  return {
    stolenObject: artifact,
    introText: intro,
    stolenObjectImage: imageUrl
  };
}
