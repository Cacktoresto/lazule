import { getLocalCatalogProducts } from '../src/data/localCatalogAdapter.js';
import { buildSemanticRelationships } from '../src/ai/semanticIntelligenceLayer.js';

const products = getLocalCatalogProducts();
const total = products.length;
const enriched = products.filter((p) => p.olfactiveProfile && p.semanticConfidence >= 0.66);
const fallback = products.filter((p) => p.semanticConfidence < 0.66);

const buckets = { low: 0, medium: 0, high: 0 };
for (const p of products) {
  const c = Number(p.semanticConfidence || 0);
  if (c < 0.66) buckets.low += 1;
  else if (c < 0.82) buckets.medium += 1;
  else buckets.high += 1;
}

const missingFields = ['olfactiveProfile','narrative','signature','personality','occasion','temperature','projection','semanticFacets','semanticReasons']
  .map((field) => ({ field, missing: products.filter((p) => !p[field] || (Array.isArray(p[field]) && !p[field].length)).length }))
  .sort((a,b)=>b.missing-a.missing);

const clusterCounts = products.reduce((acc, p) => {
  const key = p.semanticCluster || 'unknown';
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});

const sampleRelated = products.slice(0, 20).map((p) => {
  const rel = buildSemanticRelationships(p, products, { limit: 2 }).related[0];
  return rel ? { base: p.name, related: rel.product.name, reason: rel.semantic.reasons?.[0], score: rel.semantic.score } : null;
}).filter(Boolean).slice(0, 8);

const repeatedNarratives = Object.entries(products.reduce((acc,p)=>{
  const key = (p.narrative || '').trim();
  if (!key) return acc;
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {})).filter(([,count])=>count >= 5).sort((a,b)=>b[1]-a[1]).slice(0,8);

console.log('=== LAZULE Semantic Visibility Audit ===');
console.log(`Coverage enriquecido: ${enriched.length}/${total} (${((enriched.length/total)*100).toFixed(1)}%)`);
console.log(`Fallback em curadoria: ${fallback.length}/${total} (${((fallback.length/total)*100).toFixed(1)}%)`);
console.log('Confidence distribution:', buckets);
console.log('Campos mais ausentes:', missingFields.slice(0, 6));
console.log('Clusters mais comuns:', Object.entries(clusterCounts).sort((a,b)=>b[1]-a[1]).slice(0, 6));
console.log('Exemplos related + reason:', sampleRelated);
console.log('Narrativas repetitivas (dead zone):', repeatedNarratives);
