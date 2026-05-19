# Phase 7 — Olfactive Knowledge Expansion + Semantic Knowledge Graph

## Philosophy
LAZULE agora trata fragrâncias como nós de uma malha semântica olfativa, e não apenas itens de catálogo. A camada de conhecimento é majoritariamente invisível e serve recomendação, continuidade olfativa e inteligência de guarda-roupa.

## semantic_only architecture
- Novo status interno: `semantic_only`.
- Não aparece no catálogo principal.
- Não recebe CTA comercial nem preço obrigatório.
- Pode ser usado em busca semântica, relacionamento e balanceamento de coleção.

## Deterministic enrichment pipeline
- Normalização estruturada (`notes`, `accords`, `vibes`, `occasions`, `weather`).
- Geração determinística de DNA, tags semânticas e cluster olfativo.
- Geração autoral de descrição editorial e hints.
- Checagens anti-cópia e saneamento de campos proibidos.

## Clustering and relationship depth
- Introduzido `olfactiveKnowledgeGraph` com:
  - clusterização determinística
  - score composto (DNA + acordes + vibes + ocasião + clima)
  - arestas top-k por nó
- Camadas de confiança internas:
  - `highly_validated`
  - `inferred`
  - `experimental`
  - `incomplete`

## Quality & scale strategy
- Deduplicação por slug/id.
- Normalização semântica de tags.
- Estrutura pronta para lazy loading e hidratação progressiva da base expandida.
- Preparado para futura integração com embeddings/pgvector sem quebrar o modelo atual.

## Invisible intelligence principles
Usuário final sente melhoria em descoberta, coesão e recomendação sem navegar por um “mega catálogo” público.
