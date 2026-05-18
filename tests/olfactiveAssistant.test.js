import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createOlfactiveAssistantAnalyticsPayload,
  detectOlfactiveIntents,
  getOlfactiveRecommendations,
  normalizeOlfactiveQuery,
  sanitizeOlfactiveQuery,
} from '../src/utils/olfactiveAssistant.js';

const catalog = [
  {
    id: 'night-sweet',
    name: 'Amber Date Night',
    brand: 'LAZULE',
    gender: 'Masculino',
    catalogType: 'Importado',
    salePrice: 329,
    badges: ['Noite', 'Potente'],
    description: 'Perfume doce, sedutor, intenso e marcante para balada.',
    olfactoryReference: 'One Million',
    featured: true,
  },
  {
    id: 'fresh-work',
    name: 'Blue Office Fresh',
    brand: 'LAZULE',
    gender: 'Unissex',
    catalogType: 'Importado',
    salePrice: 289,
    badges: ['Fresco', 'Trabalho'],
    description: 'Cítrico, aquático, limpo, elegante e discreto para escritório no calor.',
    olfactoryReference: 'Dior Sauvage',
    featured: false,
  },
  {
    id: 'gift',
    name: 'Elegant Gift',
    brand: 'LAZULE',
    gender: 'Feminino',
    catalogType: 'Nicho',
    salePrice: 399,
    badges: ['Presente', 'Elegante'],
    description: 'Sofisticado, versátil e chique para presentear namorada.',
    olfactoryReference: 'Delina',
    featured: true,
  },
  {
    id: 'arab',
    name: 'Oud Power',
    brand: 'Lattafa',
    gender: 'Masculino',
    catalogType: 'Árabe',
    salePrice: 199,
    badges: ['Árabe', 'Potente'],
    description: 'Oriental amadeirado com oud, forte, intenso e excelente custo-benefício.',
    olfactoryReference: 'Baccarat Rouge',
    featured: false,
  },
];

test('olfactive assistant detects intentions from natural language', () => {
  const result = detectOlfactiveIntents('quero perfume masculino pra noite');

  assert.equal(result.primaryIntent, 'noite');
  assert.ok(result.detectedIntents.includes('masculino'));
  assert.ok(result.detectedIntents.includes('noite'));
});

test('olfactive assistant matches noite, doce, fresco, trabalho and presente intents', () => {
  assert.equal(getOlfactiveRecommendations('algo doce e sedutor pra noite', catalog, { limit: 1 }).products[0].id, 'night-sweet');
  assert.equal(getOlfactiveRecommendations('perfume fresco pro calor', catalog, { limit: 1 }).products[0].id, 'fresh-work');
  assert.equal(getOlfactiveRecommendations('perfume elegante pra trabalho', catalog, { limit: 1 }).products[0].id, 'fresh-work');
  assert.equal(getOlfactiveRecommendations('presente pra minha namorada', catalog, { limit: 1 }).products[0].id, 'gift');
});

test('olfactive assistant matches similar olfactory references', () => {
  const result = getOlfactiveRecommendations('parecido com sauvage', catalog, { limit: 1 });

  assert.equal(result.intent, 'parecido');
  assert.equal(result.products[0].id, 'fresh-work');
  assert.match(result.recommendations[0].reason, /referência olfativa/);
});

test('olfactive assistant returns versatile fallback when there are no direct matches', () => {
  const result = getOlfactiveRecommendations('mineral espacial impossível', catalog, { limit: 3 });

  assert.equal(result.fallbackUsed, true);
  assert.equal(result.recommendations.length, 3);
  assert.ok(result.recommendations.every((recommendation) => recommendation.reason));
});

test('olfactive assistant respects recommendation limit and empty catalog', () => {
  assert.equal(getOlfactiveRecommendations('árabe barato e potente', catalog, { limit: 2 }).recommendations.length, 2);

  const empty = getOlfactiveRecommendations('noite doce', [], { limit: 6 });
  assert.deepEqual(empty.products, []);
  assert.equal(empty.fallbackUsed, true);
});

test('olfactive assistant sanitizes and normalizes query without PII', () => {
  const sanitized = sanitizeOlfactiveQuery('  Doce <script> maria@email.com +55 21 99999-9999  ');

  assert.equal(sanitized.includes('maria@email.com'), false);
  assert.equal(sanitized.includes('99999'), false);
  assert.equal(normalizeOlfactiveQuery('Árabe potente'), 'arabe potente');
});

test('olfactive analytics payload avoids raw query text', () => {
  const result = getOlfactiveRecommendations('algo doce', catalog, { limit: 2 });
  const payload = createOlfactiveAssistantAnalyticsPayload(result, { query: 'algo doce com email@email.com', sourcePage: 'home', product: catalog[0] });

  assert.equal(payload.query_length, sanitizeOlfactiveQuery('algo doce com email@email.com').length);
  assert.ok(Array.isArray(payload.detected_intents));
  assert.equal(payload.result_count, 2);
  assert.equal(payload.product_slug, undefined);
  assert.equal(Object.values(payload).some((value) => String(value).includes('email@email.com')), false);
  assert.equal(Object.hasOwn(payload, 'query'), false);
  assert.equal(Object.hasOwn(payload, 'search_term'), false);
});
