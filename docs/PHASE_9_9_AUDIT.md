# PHASE 9.9 — Full Architecture Audit, Hardening and Loose-End Cleanup

## Scope audited
- Catalog and normalization: `src/data/products.js`, `src/domain/product.js`, `src/data/generated/*`.
- AI/runtime layers: `src/ai/*`, `src/components/*`, `src/utils/*`.
- Data pipelines: `scripts/*`, `scripts/ingestion/*`, `tools/browserExtractor.js`.
- Artifact boundaries: `data/imports/raw/*`, `supplier-refresh-report.json`.
- Quality matrix: tests, validations and build scripts in `package.json`.

## Issues found
1. Public sanitization logic was duplicated between ingestion import script and domain normalization, risking drift.
2. Validation suite had no dedicated generated-artifact boundary check and no standalone public-boundary validator.
3. Repo had accidental terminal artifact: `terminal-log.txt`.
4. Script matrix was missing explicit commands for `validate:generated-artifacts`, `validate:public-boundary`, and `validate:embedding-index`.
5. Build still reports a large main chunk warning (runtime risk); not treated as feature work in this phase.

## Fixes applied
1. Added shared sanitizer utility (`src/data/publicProductSanitizer.js`) and reused it in:
   - `src/domain/product.js`
   - `scripts/importSupplierJson.js`
2. Added generated artifact validator (`scripts/validateGeneratedArtifacts.js`) to enforce:
   - orphan/self-reference checks
   - duplicate enrichment slug checks
   - semantic descriptor presence
   - private token leakage scan
   - enrichment payload size budget guard
3. Added public boundary validator (`scripts/validatePublicBoundary.js`) to block private keys and raw HTML leakage.
4. Updated `package.json` command matrix with:
   - `validate:generated-artifacts`
   - `validate:public-boundary`
   - `validate:embedding-index`
5. Removed `terminal-log.txt` from repo root.

## Deferred (intentional)
- Main application chunk still exceeds warning threshold (~1.17 MB raw). Recommended next phase: deeper route-level code splitting of semantic/recommendation heavy rails.
- `src/data/generated/olfactiveSemanticEnrichment.js` remains large but within current phase guardrail (now validated with size cap).

## Risk areas (current)
- Runtime bundle size in primary chunk.
- Long-term drift risk in generated artifacts if generation scripts are changed without re-running validators.
- Catalog image completeness warnings (fallback currently handles presentation).

## Current command workflow
1. `npm run validate:products`
2. `npm run validate:recommendations`
3. `npm run validate:olfactive-enrichment`
4. `npm run validate:generated-artifacts`
5. `npm run validate:public-boundary`
6. `npm run build:embedding-index`
7. `npm run build`

## Artifact boundary map
- Public runtime artifacts:
  - `src/data/products.js`
  - `src/data/generated/similarPerfumes.js`
  - `src/data/generated/semanticVocabulary.js`
  - `src/data/generated/olfactiveEmbeddingDocuments.js`
  - `src/data/generated/olfactiveEmbeddingIndex.js`
  - `src/data/generated/olfactiveSemanticEnrichment.js`
- Internal/raw artifacts:
  - `data/imports/raw/supplier-refresh-internal.json`
  - `data/imports/raw/olfactive-enrichment-provenance.json`
  - `supplier-refresh-report.json`

## Public vs internal data map
- Public allowed shape (enforced by sanitizer): catalog identity, display fields, public semantic/recommendation metadata, availability/status.
- Internal-only: supplier URLs, source traces, raw extraction payloads, provenance/debug metadata and wholesale/cost-like fields.

## Recommended next phases
1. Phase 10.0: bundle partitioning and lazy-loading for semantic assistant and recommendation panels.
2. Phase 10.1: generated artifact compression/normalization (dictionary compaction, sparse vectors, optional runtime fetch).
3. Phase 10.2: ingestion failure recovery hardening with stronger checkpoint/rollback strategy per category.
