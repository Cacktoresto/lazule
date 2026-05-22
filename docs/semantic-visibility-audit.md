# Semantic Visibility Audit (LAZULE)

Fonte: `node scripts/semanticVisibilityAudit.js`

## Snapshot atual
- Coverage enriquecido: **264/264 (100%)**
- Fallback em curadoria: **0/264 (0%)**
- Confidence: **low 0 / medium 0 / high 264**

## Dead zones detectadas
- `projection` ausente em todos os produtos.
- Clusterização concentrada em `intimate_skin_scent` (densidade excessiva).
- Narrativa repetitiva em massa: `Estrutura em textura limpa com foco semântico técnico.`

## Impacto de UX
Mesmo com enrichment técnico completo, havia baixa diferenciação perceptível. Agora os componentes de catálogo usam narrativa + facets + assinatura semântica, reduzindo aparência genérica.

## Próximos ajustes recomendados
1. Melhorar inferência de cluster para aumentar contraste visual/olfativo.
2. Popular `projection` no pipeline de enrichment.
3. Aumentar diversidade narrativa por facet/cluster mantendo precisão.
