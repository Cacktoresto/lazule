# Semantic Olfactive Search (Phase 3)

## Overview
LAZULE now supports deterministic semantic olfactive search layered on top of existing DNA + relationship engines.

## Semantic intent system
- Natural language is normalized and mapped through a deterministic intent map.
- Archetype language such as `cheiro de CEO`, `old money`, and `vilão elegante` maps to reusable themes.
- No embeddings, no external LLM inference, no vector DB.

## Vibe taxonomy
Core reusable semantic dimensions:
- luxury
- clean
- seductive
- mysterious
- executive
- intimate
- winter

Each theme maps to signal groups: accords, vibes, occasions, weather, projection.

## Deterministic semantic scoring
`scoreSemanticMatch` computes weighted matches across:
- vibes
- accords/notes
- DNA
- occasion/weather
- projection cues

Outputs:
- score
- confidence
- theme contribution details

## Hybrid search behavior
Semantic interpretation augments existing heuristic search and relationship logic.
- exact name/reference handling remains active
- semantic explanation adds consultative olfactive copy
- recommendations are always constrained to existing catalog products

## Fallback behavior
If semantic confidence is weak:
- existing recommendation fallback remains active
- exploratory versatile picks continue to be returned
- no invented products or fabricated references

## Analytics and privacy
Only anonymized semantic signals are persisted:
- `semantic_tags`
- detected intents
- normalized DNA summary

Raw freeform query text is not stored in analytics payloads.

## Future migration path
Architecture now includes hooks for:
- future layering compatibility signals
- future preference memory (liked vibes, disliked accords, intensity, climate)
- eventual embeddings/pgvector adoption without replacing caller contracts
