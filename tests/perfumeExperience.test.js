import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createIdealUsageProfile,
  createOlfactiveSignature,
  createPerfumeExperience,
  createPerformanceProfile,
  getDominantExperienceDimensions,
  getStatusExperienceCTA,
} from '../src/ai/perfumeExperience.js';

const amberReference = {
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
  dna_vector: {
    sweet: 0.72,
    fresh: 0.12,
    woody: 0.54,
    seductive: 0.64,
    elegant: 0.7,
    office: 0.18,
    nightlife: 0.82,
    projection: 0.78,
    versatility: 0.36,
    masculine: 0.22,
    feminine: 0.22,
    arabic: 0.68,
    designer: 0.1,
    luxury: 0.62,
    youthful: 0.18,
    mature: 0.46,
  },
};

const sparse = {
  id: 'mystery',
  name: 'Mystery Bottle',
  brand: 'LAZULE',
  status: 'on_request',
  category: 'Perfume',
};

test('selects 5-8 dominant dimensions for the visual DNA layer', () => {
  const dimensions = getDominantExperienceDimensions(amberReference);

  assert.ok(dimensions.length >= 5 && dimensions.length <= 8);
  assert.equal(dimensions[0].id, 'nightlife');
  assert.ok(dimensions.some((dimension) => dimension.label === 'Elegância'));
  assert.ok(dimensions.every((dimension) => typeof dimension.value === 'number' && dimension.value > 0 && dimension.value <= 1));
});

test('generates short human olfactive signature from available signals', () => {
  const signature = createOlfactiveSignature(amberReference);

  assert.equal(signature.inCuration, false);
  assert.match(signature.text, /Ambarado|presença|eleg/i);
  assert.ok(signature.text.length < 90);
});

test('ideal usage remains useful with incomplete data', () => {
  const usage = createIdealUsageProfile({ ...sparse, description: 'elegante versátil para trabalho' });

  assert.ok(usage.length > 0);
  assert.ok(usage.every((item) => item.label && item.type));
});

test('performance profile uses qualitative language without absolute promises', () => {
  const performance = createPerformanceProfile({ ...amberReference, performanceLabel: 'beast mode' });
  const serialized = JSON.stringify(performance).toLowerCase();

  assert.ok(performance.some((item) => ['marcante', 'intensa', 'beast mode'].includes(item.level)));
  assert.doesNotMatch(serialized, /\b\d+\s*h|horas garantidas|garantid/);
  assert.ok(performance.every((item) => item.promiseSafe));
});

test('status CTA copy matches commercial availability status', () => {
  assert.equal(getStatusExperienceCTA({ status: 'in_stock' }).supportingCopy, 'Disponível na curadoria LAZULE.');
  assert.equal(getStatusExperienceCTA({ status: 'on_request' }).ctaLabel, 'Consultar disponibilidade');
  assert.equal(getStatusExperienceCTA({ status: 'reference_only' }).ctaLabel, 'Solicitar curadoria');
});

test('fallback profile is elegant while perfume is in curation', () => {
  const signature = createOlfactiveSignature({ id: 'empty', name: '', brand: '', status: 'reference_only' });
  const experience = createPerfumeExperience({ id: 'empty', name: '', brand: '', status: 'reference_only' });

  assert.equal(signature.text, 'Perfil olfativo em curadoria.');
  assert.equal(signature.inCuration, true);
  assert.equal(experience.inCuration, true);
  assert.ok(experience.dimensions.length >= 5);
});

test('reference and on-request experiences expose consultation context without array overflow', () => {
  const referenceExperience = createPerfumeExperience({ ...amberReference, notes: [], accords: [], occasionTags: [], weatherTags: [] });
  const onRequestExperience = createPerfumeExperience({ ...sparse, status: 'on_request', notes: [], accords: [], vibeTags: [] });

  assert.equal(referenceExperience.status, 'reference_only');
  assert.match(referenceExperience.statusCta.supportingCopy, /base olfativa|alternativas/i);
  assert.equal(onRequestExperience.status, 'on_request');
  assert.ok(onRequestExperience.idealUsage.length > 0);
  assert.ok(onRequestExperience.dimensions.length <= 8);
});
