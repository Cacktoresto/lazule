import { products } from '../src/data/products.js';
import { SEMANTIC_ATMOSPHERE_GRAPH, SEMANTIC_HUMAN_TERMS, SEMANTIC_PHRASES, SEMANTIC_VOCABULARY } from '../src/data/generated/semanticVocabulary.js';
import { buildSemanticSearchDocument } from '../src/ai/olfactiveEmbeddingAdapter.js';

const docs = products.map((p) => buildSemanticSearchDocument(p)).filter(Boolean);
const lexicon = new Set(docs.flatMap((doc) => doc.split(' ').filter(Boolean)));
const deadZones = Object.keys(SEMANTIC_VOCABULARY).filter((key) => !docs.some((doc) => doc.includes(key)));
const graphEdges = Object.values(SEMANTIC_ATMOSPHERE_GRAPH).reduce((sum, edges) => sum + edges.length, 0);
const negativeRelationships = Object.values(SEMANTIC_VOCABULARY).reduce((sum, sem) => sum + (sem.negatives?.length ?? 0), 0);

const report = {
  semanticVocabularySize: Object.keys(SEMANTIC_VOCABULARY).length,
  humanTermCount: SEMANTIC_HUMAN_TERMS.length,
  semanticPhraseCount: Object.keys(SEMANTIC_PHRASES).length,
  atmosphereNodes: Object.keys(SEMANTIC_ATMOSPHERE_GRAPH).length,
  atmosphereEdges: graphEdges,
  negativeRelationships,
  lexicalDensity: Number((lexicon.size / Math.max(docs.length, 1)).toFixed(2)),
  embeddingPreparationCoverage: Number((docs.filter((doc) => doc.split(' ').length > 15).length / Math.max(docs.length, 1)).toFixed(3)),
  supportedQueriesSample: Object.keys(SEMANTIC_PHRASES).slice(0, 20),
  semanticDeadZones: deadZones.slice(0, 20),
  overmatchingRisk: negativeRelationships < 5 ? 'high' : 'controlled',
};

console.log(JSON.stringify(report, null, 2));
