# Visão de arquitetura pré-Supabase

## Camadas

- **UI (`src/components`)**: renderiza Home, catálogo, produto, marca, checkout WhatsApp e dashboard. Deve receber produtos normalizados e evitar conhecer o formato bruto do JSON.
- **Data adapters (`src/data`)**: encapsulam fontes. Hoje `localCatalogAdapter` lê `products.js`; amanhã um adapter Supabase pode entregar o mesmo contrato.
- **Repository (`src/data/catalogRepository.js`)**: ponto estável para consultas (`getAllProducts`, `getProductBySlug`, `getProductsByBrand`, `searchProducts`, `getFeaturedProducts`).
- **Domínio (`src/domain`)**: normalização e regras de produto público.
- **Helpers (`src/utils`)**: roteamento/slug/canonical, SEO, WhatsApp, analytics, filtros e recomendações.
- **Scripts (`scripts`)**: validação de catálogo/recomendações e geração de assets SEO.

## Fluxo atual de produto

`products.js` → `localCatalogAdapter` → `normalizeProduct` → `catalogRepository` → UI/SEO/WhatsApp/analytics.

## Contratos importantes

- Slug canônico: `createProductSlug` e `product.productSlug`.
- Rota de produto: `createProductPath(product)`.
- Canonical: `createCanonicalUrl(createProductPath(product))`.
- Produto normalizado: saída de `normalizeProduct`.
- Analytics dashboard: agregadores puros em `analyticsDashboard.js`, com provider local substituível.

## Próximo adapter esperado

Um futuro `supabaseCatalogAdapter` deve retornar objetos compatíveis com `normalizeProduct` ou já normalizados com o mesmo shape público. A UI não deve importar cliente Supabase diretamente.
