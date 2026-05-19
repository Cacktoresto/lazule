import fs from 'node:fs';
import { validateKnowledgeEntries } from '../../src/ai/knowledgeIngestionPipeline.js';
const items = JSON.parse(fs.readFileSync('data/knowledge/staged/enriched.json', 'utf8'));
const result = validateKnowledgeEntries(items);
if (!result.ok) {
  console.error(result.errors.join('\n'));
  process.exit(1);
}
console.log(`Validation passed for ${items.length} entries.`);
