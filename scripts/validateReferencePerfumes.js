import { enrichedReferencePerfumes } from '../src/data/enrichedReferencePerfumes.js';
import { validateReferencePerfumes } from '../src/data/referencePerfumeEnrichment.js';
import { getCommercialStatusMeta } from '../src/utils/commercialStatus.js';

const validation = validateReferencePerfumes(enrichedReferencePerfumes);
const ctaErrors = enrichedReferencePerfumes.flatMap((perfume) => {
  const meta = getCommercialStatusMeta(perfume);
  if (perfume.status === 'in_stock' && !meta.canDirectBuy) return [`${perfume.name}: in_stock sem compra direta.`];
  if (perfume.status !== 'in_stock' && meta.canDirectBuy) return [`${perfume.name}: consulta marcada como compra direta.`];
  return [];
});

const errors = [...validation.errors, ...ctaErrors];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Reference perfumes OK: ${enrichedReferencePerfumes.length} itens validados.`);
