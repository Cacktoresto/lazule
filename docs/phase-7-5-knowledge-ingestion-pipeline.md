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
