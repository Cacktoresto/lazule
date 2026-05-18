import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { referencePerfumes } from '../src/data/referencePerfumes.js';
import { enrichReferencePerfumes, validateReferencePerfumes } from '../src/data/referencePerfumeEnrichment.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'src/data/enrichedReferencePerfumes.js');

const enriched = enrichReferencePerfumes(referencePerfumes);
const validation = validateReferencePerfumes(enriched);

if (!validation.ok) {
  console.error(validation.errors.join('\n'));
  process.exit(1);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `// Arquivo gerado por scripts/enrichReferencePerfumes.js. Não editar manualmente.\nexport const enrichedReferencePerfumes = ${JSON.stringify(enriched, null, 2)};\n\nexport default enrichedReferencePerfumes;\n`,
);

console.log(`Base de referência enriquecida: ${enriched.length} perfumes em ${path.relative(repoRoot, outputPath)}`);
