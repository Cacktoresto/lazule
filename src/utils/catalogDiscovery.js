import { buildSemanticRelationships } from '../ai/semanticIntelligenceLayer.js';
const DISCOVERY_CHIPS = [
  { id: 'amadeirado', label: 'Amadeirado', terms: ['amadeirado', 'woody', 'wood'], occasion: ['noite'], intensity: ['forte'] },
  { id: 'doce', label: 'Doce', terms: ['doce', 'adocicado', 'baunilha', 'vanilla'], weather: ['inverno'] },
  { id: 'fresco', label: 'Fresco', terms: ['fresco', 'fresh', 'citrico', 'cítrico', 'aquatico'], weather: ['verao'] },
  { id: 'noite', label: 'Noite', terms: ['noite', 'night', 'intenso'], occasion: ['noite'], intensity: ['forte'] },
  { id: 'assinatura', label: 'Assinatura', terms: ['assinatura', 'signature', 'versatil', 'versátil'] },
  { id: 'sedutor', label: 'Sedutor', terms: ['sedutor', 'sensual', 'atraente'] },
  { id: 'luxuoso', label: 'Luxuoso', terms: ['luxuoso', 'luxury', 'nicho', 'premium'] },
  { id: 'arabe', label: 'Árabe', terms: ['arabe', 'árabe', 'middle east'], type: ['arabe'] },
  { id: 'importado', label: 'Importado', terms: ['importado', 'designer'], type: ['importado'] },
  { id: 'verao', label: 'Verão', terms: ['verao', 'verão', 'calor', 'summer'], weather: ['verao'] },
  { id: 'inverno', label: 'Inverno', terms: ['inverno', 'frio', 'winter'], weather: ['inverno'] },
  { id: 'forte', label: 'Forte', terms: ['forte', 'intenso', 'potente'], intensity: ['forte'] },
  { id: 'elegante', label: 'Elegante', terms: ['elegante', 'sofisticado', 'refinado'] },
];

function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function productText(product) {
  return normalize([
    product.name,
    product.brand,
    product.category,
    product.catalogType,
    product.description,
    product.olfactoryReference,
    ...(product.accords || []),
    ...(product.notes || []),
    ...(product.similarTo || []),
    ...(product.vibeTags || []),
    ...(product.occasionTags || []),
    ...(product.weatherTags || []),
    ...(product.badges || []),
  ].join(' '));
}

export function getDiscoveryChips() {
  return DISCOVERY_CHIPS;
}

export function matchDiscoveryTags(product, activeChipIds = []) {
  if (!activeChipIds.length) return true;
  const text = productText(product);
  const activeChips = DISCOVERY_CHIPS.filter((chip) => activeChipIds.includes(chip.id));
  return activeChips.every((chip) => chip.terms.some((term) => text.includes(normalize(term))));
}

export function classifyDiscoveryVibe(product) {
  const text = productText(product);
  const matches = DISCOVERY_CHIPS.filter((chip) => chip.terms.some((term) => text.includes(normalize(term)))).map((chip) => chip.id);
  const vibe = matches[0] ?? 'assinatura';
  const intensity = matches.includes('forte') || matches.includes('noite') ? 'intenso' : 'equilibrado';
  return { vibe, intensity, tags: matches };
}

export function buildDiscoveryGroups(products = [], activeChipIds = []) {
  const pool = products.filter((product) => matchDiscoveryTags(product, activeChipIds));
  const groups = [
    { id: 'arabes', title: 'Perfumes árabes mais procurados', chips: ['arabe', 'luxuoso'] },
    { id: 'noite', title: 'Perfumes intensos para noite', chips: ['noite', 'forte'] },
    { id: 'assinaturas', title: 'Assinaturas elegantes', chips: ['assinatura', 'elegante'] },
    { id: 'frescos', title: 'Perfumes frescos para calor', chips: ['fresco', 'verao'] },
  ];

  return groups
    .map((group) => ({
      ...group,
      products: pool.filter((product) => group.chips.every((chipId) => matchDiscoveryTags(product, [chipId]))).slice(0, 6),
    }))
    .filter((group) => group.products.length >= 2);
}

export function getContextualRecommendations({ catalogProducts = [], filteredProducts = [], searchTerm = '', activeChipIds = [] }) {
  const normalizedSearch = normalize(searchTerm);
  const basePool = filteredProducts.length > 0 ? filteredProducts : catalogProducts.filter((product) => matchDiscoveryTags(product, activeChipIds));

  const scored = basePool
    .map((product) => {
      const semantic = buildSemanticRelationships(product, basePool, { limit: 4 });
      const text = productText(product);
      const vibe = classifyDiscoveryVibe(product);
      let score = 0;
      if (normalizedSearch && text.includes(normalizedSearch)) score += 4;
      if (activeChipIds.some((chipId) => vibe.tags.includes(chipId))) score += 3;
      if (vibe.intensity === 'intenso' && /elixir|intenso|parfum/.test(text)) score += 1;
      if (product.popularityTier === 'high') score += 2;
      if (product.featured) score += 1;
      score += semantic.relationshipConfidence;
      if (semantic.facets.includes('seductive_dense') && /noite|date/.test(normalizedSearch)) score += 1.5;
      return { product, score, semantic };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.product);

  return scored.slice(0, 8);
}
