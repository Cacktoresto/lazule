# Base expandida de conhecimento olfativo LAZULE

A base expandida separa conhecimento olfativo de estoque comercial. Ela alimenta o Assistente Olfativo, recomendações, busca inteligente futura e curadoria sem depender de scraping, OpenAI ou APIs externas.

## Status comercial

| Status | Uso | Exposição | CTA |
| --- | --- | --- | --- |
| `in_stock` | Produto disponível/pronta entrega. | Catálogo principal, detalhes, IA e recomendações. | Comprar / WhatsApp / checkout atual. |
| `on_request` | Produto sob consulta de disponibilidade e valor. | Pode aparecer no catálogo com badge “Sob consulta” e também na IA. | Consultar disponibilidade. |
| `reference_only` | Referência olfativa para IA, comparação, busca semântica e curadoria. | Não deve poluir a vitrine principal; pode aparecer em IA, busca específica, recomendações explicativas e futuras páginas de referência. | Solicitar curadoria / consultar disponibilidade. |

A função `getCommercialStatusMeta` centraliza badge, CTA e regra de compra direta. Produtos `on_request` e `reference_only` nunca devem usar “comprar agora”.

## Arquivos principais

- `src/data/referencePerfumes.js`: seed bruto autoral/factual da primeira base expandida.
- `src/data/referencePerfumeEnrichment.js`: normalização, descrição editorial, DNA, tags, resumo para IA e validação.
- `src/data/enrichedReferencePerfumes.js`: arquivo gerado pelo pipeline, pronto para consumo lazy.
- `src/data/referenceCatalog.js`: lazy import da base expandida para IA/busca/recomendações sem carregar tudo na Home principal.
- `scripts/enrichReferencePerfumes.js`: gera o arquivo enriquecido.
- `scripts/validateReferencePerfumes.js`: valida a base enriquecida.

## Como adicionar perfumes

1. Adicione uma entrada estruturada em `src/data/referencePerfumes.js` com:
   - `name`, `brand`, `status`, `catalogType`, `gender`, `concentration`
   - `notes`, `accords`, `family`, `similarTo`, `inspirations`
   - `vibeTags`, `occasionTags`, `weatherTags`
   - `performanceLabel`, `projectionLabel`, `popularityTier`
   - `image: null`
   - `sourceNotes` interno/opcional
2. Use apenas dados estruturados e texto autoral. Não copie descrições de Fragrantica, Parfumo, marketplaces, lojas ou releases.
3. Rode:

```bash
npm run enrich:referencePerfumes
npm run validate:referencePerfumes
npm run test:utils
```

## Regras de copyright e imagens

- Não fazer scraping.
- Não copiar textos editoriais de terceiros.
- Não usar imagens externas protegidas, com watermark ou sem licença clara.
- Para itens sem imagem, manter `image: null`. A UI usa fallback premium LAZULE com fundo azul noturno/lápis-lazúli, detalhe dourado e texto de curadoria.

## Como a IA usa a base expandida

O Assistente Olfativo recebe o catálogo atual e, no momento da consulta, carrega `enrichedReferencePerfumes.js` por `import()` via `loadRecommendationKnowledgeBase`. Assim, a vitrine principal segue leve, mas a IA consegue recomendar perfumes fora do estoque com CTA correto de consulta.

O enrichment gera:

- `slug`/`productSlug`
- `searchTokens`
- `tags`
- `description_editorial`
- `ai_summary`
- `dna_vector`
- `dominantDNA`
- `recommendationHints`
- status e visibilidade validados

## Limite inicial e próximos passos

A recomendação inicial é manter até 300 perfumes no arquivo estático. Quando a curadoria crescer, migrar para:

1. Supabase como fonte de catálogo expandido.
2. `pgvector` para busca semântica local/servidor.
3. Embeddings com governança própria quando a estratégia de API for aprovada.
4. Admin de curadoria para revisar status, tags, textos autorais, imagens licenciadas e disponibilidade.
