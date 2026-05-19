# Phase 7.7 — Fragrance URL Discovery Seeder

## Discovery philosophy
- Discovery is **candidate generation**, not truth.
- Review-first by default (`status: candidate_only`, `curationState: needs_review`).
- Deterministic/idempotent seed processing and URL normalization.
- Low-noise, low-impact request policy (HEAD, explicit user-agent, short timeout, delay, graceful failures).

## Safe architecture
1. Read seed file (`.txt` or `.json`).
2. Generate deterministic candidates from adapter modules.
3. Validate lightweight accessibility (single request per candidate, no crawling).
4. Score confidence (`high|medium|low`) using match quality, URL cleanliness, source reputation, and validation result.
5. Persist output + snapshot artifacts.

## Source reputation
- Internal tiers: `trusted`, `acceptable`, `weak`, `noisy`.
- Reputation influences ranking and confidence.
- Reputation remains internal-only and does not auto-approve records.

## Offline fallback behavior
If discovery is blocked or produces no reliable candidate:
- Preserve original seed.
- Emit `no_url_found: true`.
- Emit fallback skeleton (`semantic_only`, `needs_review`, `knowledgeConfidence: incomplete`).
- Keep missing factual fields explicit.

## Graph-aware strategy
Discovery can prioritize weak graph regions (low density, missing wardrobe coverage, underrepresented accords, low-confidence areas) to gradually improve semantic coverage quality.

## Snapshot storage
- `data/imports/raw/discovered-fragrance-urls.json`: normalized candidate outputs.
- `data/imports/raw/discovery-snapshots.json`: raw attempts, rejected, blocked, and normalized candidates for debugging/tuning.

## Pipeline integration
- `npm run discover:fragrances`
- `npm run discover:fragrances -- <seed-file>`
- `npm run discover:fragrances -- --run-next-step` (invokes `extract:facts` with discovery output)

Discovery does **not** bypass anti-bot protections and does **not** crawl domains recursively.
