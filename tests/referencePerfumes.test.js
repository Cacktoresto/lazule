import assert from 'node:assert/strict';
import test from 'node:test';

import { enrichedReferencePerfumes } from '../src/data/enrichedReferencePerfumes.js';
import { referencePerfumes } from '../src/data/referencePerfumes.js';
import { createEditorialDescription, enrichReferencePerfumes, validateReferencePerfumes } from '../src/data/referencePerfumeEnrichment.js';
import { loadRecommendationKnowledgeBase, loadReferencePerfumes } from '../src/data/referenceCatalog.js';
import { generatePerfumeDNA } from '../src/ai/perfumeDNA.js';
import { getOlfactiveRecommendations } from '../src/utils/olfactiveAssistant.js';
import { getCommercialStatusMeta } from '../src/utils/commercialStatus.js';
import { createProductWhatsAppMessage } from '../src/utils/whatsapp.js';

const sample = {
  name: 'Teste Azul',
  brand: 'LAZULE Lab',
  status: 'reference_only',
  catalogType: 'Referência',
  gender: 'Unissex',
  concentration: 'EDP',
  notes: ['bergamota', 'cedro'],
  accords: ['fresco', 'amadeirado'],
  family: 'amadeirado fresco',
  similarTo: ['Bleu de Chanel'],
  inspirations: ['azul limpo'],
  vibeTags: ['elegante', 'seguro'],
  occasionTags: ['trabalho'],
  weatherTags: ['calor'],
  performanceLabel: 'moderada',
  projectionLabel: 'moderada',
  popularityTier: 'média',
  image: null,
};

test('reference perfume seed starts expanded and validates enriched output', () => {
  assert.ok(referencePerfumes.length >= 50);
  assert.ok(referencePerfumes.length <= 300);
  const validation = validateReferencePerfumes(enrichedReferencePerfumes);
  assert.equal(validation.ok, true, validation.errors.join('\n'));
});

test('enrichment generates slug, editorial description, AI summary and DNA', () => {
  const [enriched] = enrichReferencePerfumes([sample]);

  assert.equal(enriched.status, 'reference_only');
  assert.ok(enriched.productSlug.includes('teste-azul'));
  assert.match(enriched.description_editorial, /fragrância/i);
  assert.match(enriched.ai_summary, /status Referência olfativa/);
  assert.ok(enriched.dna_vector.fresh > 0);
  assert.ok(enriched.dna_vector.woody > 0);
  assert.ok(enriched.dominantDNA.length > 0);
  assert.ok(enriched.recommendationHints.some((hint) => /consulta/i.test(hint)));
});

test('editorial descriptions are generated from structured data without copied fields', () => {
  const description = createEditorialDescription(sample);

  assert.match(description, /fresco/);
  assert.match(description, /trabalho/);
  assert.doesNotMatch(description, /Fragrantica|Parfumo/i);
});

test('commercial status controls CTA semantics and WhatsApp consultation copy', () => {
  const requestProduct = { ...sample, status: 'on_request' };
  const referenceProduct = { ...sample, status: 'reference_only' };
  const stockProduct = { ...sample, status: 'in_stock', salePrice: 420 };

  assert.equal(getCommercialStatusMeta(stockProduct).canDirectBuy, true);
  assert.equal(getCommercialStatusMeta(requestProduct).ctaLabel, 'Consultar disponibilidade');
  assert.equal(getCommercialStatusMeta(referenceProduct).ctaLabel, 'Solicitar curadoria');
  assert.match(createProductWhatsAppMessage(requestProduct, null, 'https://lazule.test/p'), /Quero consultar disponibilidade e valor/);
  assert.doesNotMatch(createProductWhatsAppMessage(referenceProduct, null, 'https://lazule.test/p'), /comprar agora/i);
});

test('fallback visual contract uses image null for reference base', () => {
  assert.ok(enrichedReferencePerfumes.some((perfume) => perfume.image === null || perfume.image === ''));
});

test('AI can recommend a reference-only perfume through the expanded base', () => {
  const result = getOlfactiveRecommendations('quero algo parecido com Baccarat Rouge doce mineral', enrichedReferencePerfumes, { limit: 3 });

  assert.ok(result.recommendations.length > 0);
  assert.ok(result.products.some((product) => product.name === 'Baccarat Rouge 540'));
  assert.equal(result.products.find((product) => product.name === 'Baccarat Rouge 540')?.status, 'reference_only');
});

test('search knowledge base lazy-loads reference perfumes without polluting caller catalog', async () => {
  const local = [{ id: 'stock', name: 'Produto Estoque', brand: 'LAZULE', status: 'in_stock', description: 'fresco', notes: ['bergamota'], accords: ['fresco'] }];
  const loaded = await loadReferencePerfumes();
  const knowledgeBase = await loadRecommendationKnowledgeBase(local);

  assert.equal(loaded.length, enrichedReferencePerfumes.length);
  assert.equal(local.length, 1);
  assert.ok(knowledgeBase.length > local.length);
  assert.ok(knowledgeBase.some((product) => product.status === 'reference_only'));
});

test('heuristic DNA remains valid for enriched references', () => {
  const baccarat = enrichedReferencePerfumes.find((perfume) => perfume.name === 'Baccarat Rouge 540');
  const dna = generatePerfumeDNA(baccarat);

  assert.ok(dna.sweet > 0);
  assert.ok(dna.luxury > 0);
});
