import fs from 'node:fs';
import { buildKnowledgeGraphArtifacts } from '../../src/ai/knowledgeIngestionPipeline.js';
const items = JSON.parse(fs.readFileSync('data/knowledge/staged/enriched.json', 'utf8'));
const artifact = buildKnowledgeGraphArtifacts(items);
fs.writeFileSync('data/knowledge/artifacts/knowledge-graph.json', JSON.stringify(artifact, null, 2));
console.log(`Graph artifact generated with ${artifact.graph.totalNodes} nodes.`);
