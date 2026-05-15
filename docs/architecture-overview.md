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

## Adapter Supabase experimental

O projeto agora possui um adapter experimental em `src/data/supabaseCatalogAdapter.js`, habilitado somente quando `VITE_LAZULE_CATALOG_SOURCE=supabase` ou `LAZULE_CATALOG_SOURCE=supabase`. A configuração aceita `SUPABASE_URL`/`SUPABASE_ANON_KEY` no Node (scripts e Vercel) e `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` no bundle do navegador.

A UI continua usando `getAllProducts()` de forma síncrona: se o Supabase ainda não respondeu ou não estiver configurado, o repositório devolve o catálogo local seguro. Scripts de build/prebuild devem usar `getAllProductsAsync()` ou `getCatalogProductsAsync()` para aguardar a fonte selecionada antes de gerar artefatos. O repository mantém exports nomeados e default para evitar incompatibilidades entre consumidores antigos e novos.
