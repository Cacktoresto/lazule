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

## Assistente Olfativo Inteligente

A primeira camada de IA da LAZULE é o **Assistente Olfativo**, uma experiência de descoberta que permite ao cliente escrever em linguagem natural o que procura — ocasião, vibe, intensidade, gênero, tipo de catálogo ou referência olfativa — e receber uma curadoria explicável de perfumes do catálogo normalizado.

Nesta versão inicial, o assistente é **heurístico e determinístico**: ele não usa OpenAI, embeddings, vector search, API externa nem backend obrigatório. O motor local normaliza a consulta, detecta intenções como fresco, doce, noite, trabalho, presente, árabe, importado, potente, discreto e parecido/inspirado, pontua produtos por nome, marca, categoria, gênero, tipo de catálogo, badges, descrição e referência olfativa, e retorna de 3 a 6 recomendações com um motivo curto.

A integração visual fica na Home, logo após a busca sticky, com textarea mobile-first, chips rápidos e cards compactos com CTA para produto e WhatsApp. O checkout atual não é alterado; o WhatsApp continua usando os helpers existentes e preserva contexto de cupom/referral quando disponível.

### Privacidade e analytics

O assistente não coleta dados pessoais e não envia o texto bruto da consulta para analytics. Os eventos públicos usam apenas metadados seguros, como tamanho da consulta, intenções detectadas, quantidade de resultados, slug do produto e página de origem. Dados sensíveis como nome, telefone, e-mail, endereço ou conteúdo de conversa não devem ser registrados.

Eventos adicionados:

- `ai_assistant_view`
- `ai_assistant_query`
- `ai_assistant_result_click`
- `ai_assistant_whatsapp_click`

### Próximos passos planejados

- Evoluir o ranking com embeddings e busca vetorial.
- Conectar uma camada OpenAI para linguagem natural mais flexível.
- Persistir vetores/atributos olfativos em Supabase quando fizer sentido.
- Adicionar avaliação de satisfação da curadoria sem coletar PII.
