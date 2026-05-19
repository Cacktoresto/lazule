import fs from 'node:fs';
import { parseInputRecords, normalizeFragranceEntry } from '../../src/ai/knowledgeIngestionPipeline.js';
const inputPath = process.argv[2] ?? 'data/knowledge/raw/fragrances.ndjson';
const format = process.argv[3] ?? (inputPath.endsWith('.csv') ? 'csv' : inputPath.endsWith('.json') ? 'json' : 'ndjson');
const records = parseInputRecords(fs.readFileSync(inputPath, 'utf8'), format).map(normalizeFragranceEntry);
fs.writeFileSync('data/knowledge/staged/normalized.json', JSON.stringify(records, null, 2));
console.log(`Normalized ${records.length} entries.`);
