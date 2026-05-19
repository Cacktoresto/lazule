import fs from 'node:fs';
import { enrichFragranceSemanticData, computeKnowledgeConfidence } from '../../src/ai/knowledgeIngestionPipeline.js';
const items = JSON.parse(fs.readFileSync('data/knowledge/staged/normalized.json', 'utf8'));
const enriched = items.map(enrichFragranceSemanticData).map((e) => ({ ...e, knowledgeConfidence: computeKnowledgeConfidence(e) }));
fs.writeFileSync('data/knowledge/staged/enriched.json', JSON.stringify(enriched, null, 2));
console.log(`Enriched ${enriched.length} entries.`);
