import fs from 'node:fs';
import { products } from '../src/data/products.js';
import { createProductSlug } from '../src/utils/productRouting.js';
import { OLFACTIVE_SEMANTIC_ENRICHMENT } from '../src/data/generated/olfactiveSemanticEnrichment.js';
import { similarPerfumes } from '../src/data/generated/similarPerfumes.js';
import { OLFATIVE_EMBEDDING_INDEX } from '../src/data/generated/olfactiveEmbeddingIndex.js';

const errors = [];
const slugs = new Set(products.map((p) => p.productSlug || createProductSlug(p.name || p.id || '')));

function ensureNoPrivateLeak(value, context) {
  const text = JSON.stringify(value).toLowerCase();
  ['sourceurl', 'supplierurl', 'rawextraction', 'crawler', 'provenance', 'http://', 'https://'].forEach((token) => {
    if (text.includes(token)) errors.push(`${context}: potencial dado privado (${token})`);
  });
}

for (const [slug, groups] of Object.entries(similarPerfumes || {})) {
  if (!slugs.has(slug)) errors.push(`similarPerfumes slug órfão ${slug}`);
  for (const rec of Object.values(groups || {}).flat()) {
    if (rec.slug === slug) errors.push(`self reference em ${slug}`);
    if (rec?.slug && !slugs.has(rec.slug)) errors.push(`recomendação órfã ${slug} -> ${rec.slug}`);
  }
}

const seen = new Set();
for (const item of OLFACTIVE_SEMANTIC_ENRICHMENT) {
  if (seen.has(item.slug)) errors.push(`enrichment slug duplicado ${item.slug}`);
  seen.add(item.slug);
  if (!slugs.has(item.slug)) continue;
  if (!Array.isArray(item.semanticDescriptors) || item.semanticDescriptors.length === 0) errors.push(`enrichment vazio ${item.slug}`);
}

for (const item of (OLFATIVE_EMBEDDING_INDEX.documents || [])) {
  if (!slugs.has(item.slug)) errors.push(`embedding slug órfão ${item.slug}`);
}

ensureNoPrivateLeak(OLFACTIVE_SEMANTIC_ENRICHMENT, 'olfactiveSemanticEnrichment');
const size = fs.statSync(new URL('../src/data/generated/olfactiveSemanticEnrichment.js', import.meta.url)).size;
if (size > 900_000) errors.push(`olfactiveSemanticEnrichment.js excede limite de 900KB (${size})`);

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Generated artifacts validation passed');
