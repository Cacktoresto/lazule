import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  formatSemanticLabel,
  formatSemanticLabels,
  humanizeFacet,
  humanizeCluster,
  humanizeSemanticTag,
  humanizeSignature,
} from '../src/utils/semanticPresentation.js';

test('semantic identifiers are converted into stable editorial labels', () => {
  assert.equal(formatSemanticLabel('modern_fresh'), 'Frescor moderno');
  assert.equal(humanizeFacet('clean_luxury'), 'Luxo clean');
  assert.equal(humanizeSignature('seductive_night'), 'Noite sedutora');
  assert.equal(humanizeCluster('executive_fresh'), 'Frescor executivo');
  assert.equal(humanizeSemanticTag('tropical_energy'), 'Energia tropical');
});

test('fallback formatter prevents technical leaks for unknown identifiers', () => {
  assert.equal(formatSemanticLabel('DEEP_DARK_AMBER'), 'Âmbar escuro intenso');
  assert.equal(formatSemanticLabel('new_experimental_tag'), 'New Experimental Tag');
  assert.equal(formatSemanticLabel('WARM_SPICY'), 'Quente especiado');
});

test('formatter keeps vocabulary consistent and deduplicated', () => {
  assert.deepEqual(
    formatSemanticLabels(['MODERN_FRESH', 'modern_fresh', 'clean_luxury', 'clean_luxury'], { limit: 3 }),
    ['Frescor moderno', 'Luxo clean'],
  );
});

test('public UI renders semantic labels through presentation formatter', () => {
  const productCard = fs.readFileSync(new URL('../src/components/ProductCard.jsx', import.meta.url), 'utf8');
  const productDetails = fs.readFileSync(new URL('../src/components/ProductDetails.jsx', import.meta.url), 'utf8');

  assert.match(productCard, /formatSemanticLabels\(/);
  assert.match(productDetails, /humanizeSignature\(/);
});
