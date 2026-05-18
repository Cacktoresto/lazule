import assert from 'node:assert/strict';
import test from 'node:test';

import {
  calculateDNASimilarity,
  generatePerfumeDNA,
  generateQueryDNA,
  generateRecommendationReason,
} from '../src/ai/perfumeDNA.js';
import { getRelatedProducts, scorePerfumeForQuery } from '../src/ai/recommendationEngine.js';

const night = {
  id: 'night',
  name: 'Amber Night Club',
  brand: 'Lattafa',
  category: 'Árabe',
  gender: 'Masculino',
  badges: ['Noite', 'Potente'],
  description: 'Doce, intenso, sedutor, oriental e com ótima projeção.',
  olfactoryReference: 'One Million',
  featured: true,
};

const fresh = {
  id: 'fresh',
  name: 'Blue Office',
  brand: 'Dior',
  category: 'Importado',
  gender: 'Masculino',
  badges: ['Fresco', 'Trabalho'],
  description: 'Cítrico, aquático, limpo, elegante e versátil para calor.',
  olfactoryReference: 'Sauvage',
};

const minimal = { id: 'minimal', name: 'Mystery Bottle' };

test('perfume DNA generation is deterministic and tolerates missing data', () => {
  assert.deepEqual(generatePerfumeDNA(night), generatePerfumeDNA(night));
  const dna = generatePerfumeDNA(minimal);

  assert.equal(typeof dna.sweet, 'number');
  assert.equal(dna.sweet >= 0 && dna.sweet <= 1, true);
  assert.equal(dna.fresh >= 0 && dna.fresh <= 1, true);
});

test('query DNA and vector scoring rank the closest olfactive profile', () => {
  const queryDNA = generateQueryDNA('doce sedutor para noite potente');
  const nightScore = scorePerfumeForQuery(night, { normalizedQuery: 'doce sedutor para noite potente', queryDNA }).score;
  const freshScore = scorePerfumeForQuery(fresh, { normalizedQuery: 'doce sedutor para noite potente', queryDNA }).score;

  assert.ok(nightScore > freshScore);
  assert.ok(calculateDNASimilarity(queryDNA, generatePerfumeDNA(night)) > calculateDNASimilarity(queryDNA, generatePerfumeDNA(fresh)));
});

test('recommendation reasons are explainable and non-empty', () => {
  const reason = generateRecommendationReason(night, { queryDNA: generateQueryDNA('doce para noite'), perfumeDNA: generatePerfumeDNA(night) });

  assert.match(reason, /(doce|noite|referência olfativa|árabe)/i);
});

test('related products prefer similar DNA over unrelated sparse products', () => {
  const related = getRelatedProducts(night, [night, fresh, minimal], { limit: 2 });

  assert.equal(related[0].id, 'fresh');
  assert.equal(related.some((product) => product.id === 'night'), false);
});
