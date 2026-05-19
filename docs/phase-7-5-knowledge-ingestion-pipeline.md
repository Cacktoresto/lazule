# Phase 7.5 — Automated Olfactive Knowledge Ingestion Pipeline

## Philosophy
LAZULE ingestion in Phase 7.5 is deterministic, repeatable, and curation-aware. The objective is to transform structured upstream inputs (CSV/JSON/NDJSON/manual exports/supplier feeds) into a normalized knowledge layer that can safely enrich semantic intelligence without exposing noisy or unreviewed data in the storefront.

## Pipeline Stages
1. `ingestFragrances.js`: End-to-end staged ingestion into normalized + enriched + graph artifacts.
2. `normalizeFragranceData.js`: Canonical schema normalization with alias harmonization.
3. `enrichFragranceSemanticData.js`: Deterministic editorial language + semantic vectors metadata.
4. `validateKnowledgeEntries.js`: Quality gate against malformed or low-value nodes.
5. `buildKnowledgeGraphArtifacts.js`: Relationship expansion + split artifact payload for app-safe loading.

## Canonical Schema
Each record is normalized into a canonical shape with identity, olfactive semantics, wardrobe fields, confidence state, visibility state, curation state, and embedding-ready placeholders (`embeddingReady`).

## Human Curation Checkpoints
`curationState` supports `approved`, `needs_review`, and `rejected`.
- `needs_review` records stay staged.
- `rejected` records are blocked from graph publication.
- only `approved` records flow to approved artifacts.

## Semantic-only Strategy
`knowledgeVisibility=internal` and/or `status=semantic_only` keeps entries available for relationship depth and recommendation intelligence while excluding them from visible commerce/catalog IDs.

## Confidence & Quality
Confidence classes are generated internally (`highly_validated`, `inferred`, `experimental`, `incomplete`) and produced from structured completeness + enrichment completeness + curation status.

Validation rejects graph pollution for:
- missing critical fields
- malformed DNA vectors
- contradictory vibes
- weak semantic tagging
- duplicate nodes
- invalid visibility/curation states

## Artifact Strategy and Scale Safety
Artifacts are staged under `data/knowledge/artifacts` and include:
- graph structures
- relationship edges
- visibility partitions (`visibleCatalogIds`, `semanticOnlyIds`)
- metrics for future dashboarding (confidence/cluster distributions)

This split structure supports lazy loading and future embedding/ANN integration without requiring architecture rewrites.

## Phase 7.8 Additions

### Fragrance Seed Starter Generator
Use curated internal seed dictionaries (no scraping/fetching) to bootstrap categories:
- `npm run generate:fragrance-seeds -- --category designer_masculine --limit 100`
- outputs `data/imports/raw/fragrance-seeds-{category}.txt`
- deterministic, duplicate-resistant per category
- starter system only (not a complete perfume database)

### Recommended Full Flow
1. Generate seeds (`generate:fragrance-seeds`).
2. Discover URLs from seed list (manual/internal workflow).
3. Extract facts (`extract:facts`).
4. Ingest knowledge (`ingest:knowledge` + `normalize:knowledge`).
5. Enrich (`enrich:knowledge`).
6. Validate (`validate:knowledge`).
7. Build graph (`build:knowledge-graph`).

### Internal Source Reputation Layers
Source reliability is internally classified as:
- `trusted`
- `acceptable`
- `weak`
- `noisy`

Internal metrics tracked:
- source consistency
- extraction quality
- semantic reliability
- duplication frequency
- malformed extraction frequency

These metrics influence confidence, enrichment trust posture, and relationship safety scoring. Reputation remains internal-only.

### Raw Snapshot Preservation
The ingestion pipeline now stores non-destructive snapshots with:
- raw extraction
- normalized extraction
- enriched output
- validation output

This supports regeneration, enrichment evolution, rollback safety, and confidence recalculation.

### Graph Health Metrics (Internal)
Artifacts now include lightweight graph-health metrics:
- orphan fragrances
- low-relationship nodes
- overconnected semantic clusters
- duplicate semantic neighborhoods
- weak wardrobe balancing coverage
- low-confidence regions
