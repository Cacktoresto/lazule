import { runIngestionPipeline } from '../../src/ai/knowledgeIngestionPipeline.js';
const inputPath = process.argv[2] ?? 'data/knowledge/raw/fragrances.ndjson';
const format = process.argv[3] ?? (inputPath.endsWith('.csv') ? 'csv' : inputPath.endsWith('.json') ? 'json' : 'ndjson');
runIngestionPipeline({ inputPath, format, outDir: 'data/knowledge/staged' });
console.log(`Ingestion complete from ${inputPath} (${format}).`);
