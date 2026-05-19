import { createProductSlug } from '../../src/utils/productRouting.js';
import fs from 'node:fs';
import { products } from '../../src/data/products.js';
import { OLFACTIVE_SEMANTIC_ENRICHMENT } from '../../src/data/generated/olfactiveSemanticEnrichment.js';

const errs=[];
const slugs=new Set();
for (const item of OLFACTIVE_SEMANTIC_ENRICHMENT){
  if(slugs.has(item.slug)) errs.push(`duplicate slug ${item.slug}`); slugs.add(item.slug);
  if((item.searchPhrases||[]).some((p)=>p.length>120)) errs.push(`long phrase ${item.slug}`);
  if(new Set(item.semanticDescriptors||[]).size!==(item.semanticDescriptors||[]).length) errs.push(`duplicate descriptors ${item.slug}`);
  const emb=String(item.embeddingBoostText||''); if(emb.split(' ').length<8) errs.push(`weak embedding text ${item.slug}`);
  if((item.olfactiveFamilies||[]).includes('aquatic')&&(item.olfactiveFamilies||[]).includes('gourmand')&&!item.driftWarnings?.length) errs.push(`missing drift warning ${item.slug}`);
}
for (const p of products){ const slug=p.productSlug||createProductSlug(p.name||p.id||''); if(!OLFACTIVE_SEMANTIC_ENRICHMENT.find((x)=>x.slug===slug)) errs.push(`missing catalog enrichment ${slug}`); }
if(errs.length){console.error(errs.join('\n')); process.exit(1);}console.log(`Validated ${OLFACTIVE_SEMANTIC_ENRICHMENT.length} entries.`);
