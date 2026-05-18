# LAZULE AI Commerce Intelligence

A segunda camada de IA da LAZULE transforma o Assistente Olfativo em um motor local-first de descoberta aromática. A implementação continua 100% heurística, determinística e sem OpenAI, embeddings externos ou custo recorrente.

## Perfume DNA Engine

`src/ai/perfumeDNA.js` gera um fingerprint padronizado para perfumes e consultas com dimensões entre `0` e `1`:

- `sweet`, `fresh`, `woody`, `seductive`, `elegant`
- `office`, `nightlife`, `projection`, `versatility`
- `masculine`, `feminine`, `arabic`, `designer`, `luxury`
- `youthful`, `mature`

O DNA é inferido por sinais locais de nome, marca, descrição, referência olfativa, badges, categoria, gênero, tipo de catálogo, notas, ocasiões, vibe e contexto comercial. Produtos incompletos recebem um DNA mínimo seguro para manter fallback e ordenação estáveis.

## Recomendações explicáveis

`src/ai/recommendationEngine.js` compara o DNA da consulta com o DNA dos perfumes usando similaridade vetorial simplificada. O ranking híbrido combina:

1. similaridade de DNA;
2. relevância por palavra-chave;
3. boost de `olfactoryReference`;
4. sinais comerciais leves como destaque e disponibilidade;
5. penalização de diversidade por marca/categoria.

Cada recomendação recebe `generateRecommendationReason()`, que produz frases curtas e determinísticas como “Perfil intenso, doce e ideal para noite.” ou “Boa escolha para clima quente, rotina e uso diário.”.

## Produtos relacionados inteligentes

`getRelatedProducts()` seleciona cross-sell por DNA similar, mesma vibe, referência olfativa, categoria complementar e performance parecida. A API pública `getProductRecommendations()` passa a tentar o motor de DNA primeiro e preserva o algoritmo legado como fallback.

## AI Search Intelligence e privacidade

Eventos do Assistente salvam apenas intenção normalizada:

- `ai_intents` / `detected_intents`;
- `dna` dominante;
- contagem de resultados;
- slugs dos produtos recomendados;
- produto/categoria/vibes em cliques.

A query bruta do usuário não é persistida em eventos de IA. Apenas `query_length` é armazenado para medir complexidade sem revelar texto sensível.

## Dashboard experimental

O Analytics Admin agora inclui “AI Commerce Intelligence”, com:

- intenções dominantes;
- perfumes mais recomendados pela IA;
- perfumes mais clicados pela IA;
- vibes e categorias relacionadas;
- distribuição por DNA;
- buscas sem resultado IA;
- taxa IA → WhatsApp.

## Preparação para semantic AI futura

`recommendationEngine.js` já expõe uma abstração por engine:

- `heuristicRecommendationEngine` — produção atual, local-first;
- `semanticRecommendationEngine` — placeholder para reranking semântico futuro;
- `embeddingsRecommendationEngine` — placeholder para OpenAI embeddings, pgvector/Supabase, vector search e RAG.

Assim, futuras integrações podem trocar a engine sem quebrar os componentes e utilitários atuais.
