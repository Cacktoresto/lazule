import test from 'node:test';
import assert from 'node:assert/strict';

import { extractFactsFromHtml } from '../scripts/ingestion/extractFragranceFacts.js';
import { normalizeFragranceEntry } from '../src/ai/knowledgeIngestionPipeline.js';

const MOCK_HTML = `
<html><head>
<meta property="og:title" content="Noir Legacy by Maison A" />
<script type="application/ld+json">{"@type":"Product","name":"Noir Legacy","brand":{"name":"Maison A"}}</script>
</head><body>
<p>Notes: bergamot, cedar, amber</p>
<p>Accords: woody, amber, citrus</p>
<p>Family: Woody Amber</p>
<p>Concentration: Eau de Parfum</p>
<p>Gender: Unisex</p>
<p>Release year: 2020</p>
<p>Perfumer: Alice Doe</p>
<p>This is a very long editorial text that should never be captured as factual fields because extractor is fact-only and constrained.</p>
<img src="perfume.jpg" alt="image"/>
</body></html>`;

test('extracts only factual fields from mocked HTML', () => {
  const { blocked, record } = extractFactsFromHtml(MOCK_HTML, 'https://example.com/p/noir-legacy');
  assert.equal(blocked, false);
  assert.equal(record.name, 'Noir Legacy');
  assert.equal(record.brand, 'Maison A');
  assert.deepEqual(record.notes, ['bergamot', 'cedar', 'amber']);
  assert.deepEqual(record.accords, ['woody', 'amber', 'citrus']);
});

test('does not capture editorial paragraphs or image URLs', () => {
  const { record } = extractFactsFromHtml(MOCK_HTML, 'https://example.com/p/noir-legacy');
  const serialized = JSON.stringify(record);
  assert.equal(serialized.includes('very long editorial text'), false);
  assert.equal(serialized.includes('perfume.jpg'), false);
});

test('fallback returns blocked when anti-bot page is detected', () => {
  const { blocked } = extractFactsFromHtml('<html><body>Attention Required! Cloudflare</body></html>', 'https://blocked.example.com');
  assert.equal(blocked, true);
});

test('output enforces semantic_only + needs_review + internal visibility', () => {
  const { record } = extractFactsFromHtml(MOCK_HTML, 'https://example.com/p/noir-legacy');
  assert.equal(record.status, 'semantic_only');
  assert.equal(record.curationState, 'needs_review');
  assert.equal(record.knowledgeVisibility, 'internal');
  assert.equal(record.requiresReview, true);
});

test('integration with ingestion normalization preserves safe curation gate', () => {
  const { record } = extractFactsFromHtml(MOCK_HTML, 'https://example.com/p/noir-legacy');
  const normalized = normalizeFragranceEntry(record);
  assert.equal(normalized.curationState, 'needs_review');
  assert.equal(normalized.status, 'semantic_only');
  assert.equal(normalized.knowledgeVisibility, 'internal');
});
