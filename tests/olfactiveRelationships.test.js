import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRelationshipExplanation,
  createUnavailableDiscoveryConversion,
  exploreOlfactiveTerm,
  generateOlfactiveRelationships,
  getAvailableAlternatives,
  getExplorableOlfactiveTerms,
  scoreOlfactiveRelationship,
} from '../src/ai/olfactiveRelationships.js';
import { getOlfactiveRecommendations } from '../src/utils/olfactiveAssistant.js';

const grandSoir = {
  id: 'grand-soir',
  name: 'Grand Soir',
  brand: 'Maison Francis Kurkdjian',
  status: 'reference_only',
  commercialStatus: 'reference_only',
  available: false,
  catalogType: 'Nicho',
  gender: 'Unissex',
  family: 'âmbar oriental',
  accords: ['âmbar', 'resinoso', 'baunilha', 'quente'],
  notes: ['âmbar', 'benjoim', 'baunilha', 'tonka'],
  vibeTags: ['elegante', 'noturno', 'envolvente'],
  occasionTags: ['jantar', 'encontros'],
  weatherTags: ['frio', 'ameno'],
  performanceLabel: 'alta',
  popularityTier: 'alta',
};

const khamrah = {
  id: 'khamrah',
  name: 'Khamrah',
  brand: 'Lattafa',
  status: 'in_stock',
  available: true,
  salePrice: 289,
  catalogType: 'Árabe',
  gender: 'Unissex',
  family: 'oriental gourmand',
  accords: ['âmbar', 'doce', 'baunilha', 'especiado'],
  notes: ['baunilha', 'tonka', 'canela'],
  vibeTags: ['noturno', 'envolvente'],
  occasionTags: ['jantar', 'encontros'],
  weatherTags: ['frio'],
  performanceLabel: 'alta',
  popularityTier: 'alta',
};

const amberOud = {
  id: 'amber-oud',
  name: 'Amber Oud',
  brand: 'Al Haramain',
  status: 'in_stock',
  available: true,
  salePrice: 495,
  catalogType: 'Árabe',
  gender: 'Unissex',
  family: 'âmbar amadeirado',
  accords: ['âmbar', 'madeiras', 'resinoso'],
  notes: ['âmbar', 'cedro', 'benjoim'],
  vibeTags: ['elegante', 'intenso'],
  occasionTags: ['social', 'jantar'],
  weatherTags: ['frio', 'ameno'],
  performanceLabel: 'alta',
  popularityTier: 'média',
};

const blueFresh = {
  id: 'blue-fresh',
  name: 'Blue Fresh',
  brand: 'Afnan',
  status: 'in_stock',
  available: true,
  salePrice: 300,
  catalogType: 'Árabe',
  gender: 'Masculino',
  family: 'amadeirado aromático',
  accords: ['azul', 'fresco', 'cítrico', 'limpo'],
  notes: ['bergamota', 'gengibre', 'cedro'],
  vibeTags: ['versátil', 'seguro'],
  occasionTags: ['trabalho'],
  weatherTags: ['calor'],
  performanceLabel: 'moderada',
};

const whiteFloral = {
  id: 'white-floral',
  name: 'White Floral',
  brand: 'Maison Test',
  status: 'on_request',
  available: false,
  catalogType: 'Importado',
  gender: 'Feminino',
  family: 'floral',
  accords: ['floral', 'atalcado'],
  notes: ['jasmim', 'rosa'],
  vibeTags: ['romântico'],
  occasionTags: ['dia'],
  weatherTags: ['primavera'],
};

const catalog = [grandSoir, khamrah, amberOud, blueFresh, whiteFloral];

test('relationship scoring rewards accord, note, vibe and DNA overlap deterministically', () => {
  const first = scoreOlfactiveRelationship(grandSoir, khamrah, { preferInStock: true });
  const second = scoreOlfactiveRelationship(grandSoir, khamrah, { preferInStock: true });
  const distant = scoreOlfactiveRelationship(grandSoir, blueFresh, { preferInStock: true });

  assert.deepEqual(first, second);
  assert.ok(first.score > distant.score);
  assert.ok(first.overlaps.accords.includes('âmbar'));
  assert.ok(first.overlaps.notes.includes('baunilha'));
  assert.match(first.explanation, /ambarado|noturna|baunilha|direção/i);
});

test('available alternatives prioritize in-stock products for unavailable references without clone language', () => {
  const alternatives = getAvailableAlternatives(grandSoir, catalog, { limit: 3 });

  assert.ok(alternatives.length >= 2);
  assert.ok(alternatives.every((item) => item.product.status === 'in_stock'));
  assert.equal(alternatives[0].product.id, 'khamrah');
  assert.doesNotMatch(alternatives.map((item) => item.explanation).join(' '), /clone|contratipo/i);
});

test('relationship sections include available conversion and diverse olfactive blocks', () => {
  const sections = generateOlfactiveRelationships(grandSoir, catalog, { limit: 3, disableCache: true });
  const sectionIds = sections.map((section) => section.id);

  assert.ok(sectionIds.includes('available_alternatives'));
  assert.ok(sectionIds.includes('shared_signature'));
  assert.ok(sections.every((section) => section.items.length <= 3));
  assert.ok(new Set(sections.flatMap((section) => section.items.map((item) => item.product.brand))).size >= 2);
});

test('accord and note exploration exposes lightweight contextual discovery', () => {
  const terms = getExplorableOlfactiveTerms(grandSoir);
  const explored = exploreOlfactiveTerm('âmbar', catalog, { limit: 4 });

  assert.ok(terms.some((term) => term.type === 'accord' && term.term === 'âmbar'));
  assert.ok(terms.some((term) => term.type === 'note' && term.term === 'baunilha'));
  assert.ok(explored.some((item) => item.product.id === 'amber-oud'));
  assert.ok(explored.every((item) => item.explanation.includes('âmbar')));
});

test('unavailable perfume conversion preserves original context and offers in-stock commerce path', () => {
  const conversion = createUnavailableDiscoveryConversion(grandSoir, catalog, { limit: 2 });

  assert.equal(conversion.original.id, 'grand-soir');
  assert.equal(conversion.conversionType, 'unavailable_to_in_stock');
  assert.match(conversion.message, /Grand Soir/);
  assert.match(conversion.message, /sem tratar como clones|mesma direção olfativa/);
  assert.ok(conversion.alternatives.every((item) => item.product.status === 'in_stock'));
});

test('relationship explanations remain deterministic and premium', () => {
  const explanation = createRelationshipExplanation({ overlaps: { accords: ['fresco'], notes: [], vibes: [], occasions: [], weather: [] }, dnaSimilarity: 0.9 });

  assert.equal(explanation, 'Segue uma assinatura fresco e sofisticada.');
});


test('olfactive assistant adds relationship reasoning and unavailable-to-stock context', () => {
  const result = getOlfactiveRecommendations('quero algo parecido com Grand Soir âmbar elegante', catalog, { limit: 3 });

  assert.equal(result.relationshipContext.product_name, 'Grand Soir');
  assert.equal(result.discoveryConversion.conversionType, 'unavailable_to_in_stock');
  assert.ok(result.recommendations.some((recommendation) => /Compartilha|direção|Preserva|Conecta|Mantém|Segue/.test(recommendation.reason)));
});
