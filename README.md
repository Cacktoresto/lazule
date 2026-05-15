# LAZULE FRAGRANCES — Catálogo Premium

Catálogo premium da **LAZULE FRAGRANCES**, construído com React, Vite e Tailwind CSS.

O objetivo do projeto é transformar a base de um catálogo de fornecedor em uma experiência própria da LAZULE, com identidade visual inspirada em lápis-lazúli, foco em conversão pelo WhatsApp e dados preparados para automação.

## Stack

- React
- Vite
- Tailwind CSS
- Playwright para extração do fornecedor

## Escopo atual

Incluído nesta versão:

- Estrutura inicial do projeto.
- Layout responsivo com estética premium.
- Header, hero section, catálogo, cards, footer e botão flutuante de WhatsApp.
- Busca por produto, marca, categoria, gênero, descrição, badges e referência olfativa.
- Filtros por categoria.
- Scraper separado para o catálogo do fornecedor em `scripts/scrapeSupplier.js`.
- Download de imagens para `public/products` quando possível.
- Modelo de dados preparado para futura evolução com integrações.

Ainda fora do escopo:

- Checkout.
- Banco de dados.
- Painel administrativo.

## Modelo de produto

O arquivo `src/data/products.js` segue o formato planejado para dados extraídos do fornecedor:

```js
{
  id,
  name,
  brand,
  category,
  gender,
  salePrice,
  costPrice,
  supplierRetailPrice,
  image,
  badges,
  description,
  olfactoryReference,
  available,
  featured,
  sourceUrl
}
```

### Regras comerciais dos preços

Os preços são armazenados como número, nunca como string formatada:

```js
salePrice: 320,
costPrice: 210,
supplierRetailPrice: 320,
```

A formatação para `R$ 320,00` acontece somente no front-end.

Regras aplicadas pelo scraper:

- `costPrice` recebe o preço de atacado do fornecedor.
- `supplierRetailPrice` recebe o varejo sugerido do fornecedor.
- `salePrice` deve ser igual a `supplierRetailPrice`.

> Importante: o front-end público exibe somente `salePrice`. Campos internos como `costPrice`, `supplierRetailPrice`, margem e `sourceUrl` não devem ser renderizados na interface pública.

## Scraper do fornecedor

Fonte:

```txt
https://rjperfumaria.catalog.kyte.site/
```

Comando:

```bash
npm run scrape:supplier
```

O script usa Playwright para carregar o catálogo renderizado via JavaScript, acessar categorias do fornecedor, aguardar o DOM com `domcontentloaded`, esperar alguns segundos pela renderização, fazer scroll progressivo até o fim da página, registrar respostas XHR/fetch/JSON, tentar extrair produtos do DOM, do HTML, de scripts JSON embutidos e de respostas de rede, deduplicar por nome normalizado, baixar imagens e atualizar `src/data/products.js`.

Categorias configuradas inicialmente:

- Masculinos
- Femininos
- Kit
- Árabe
- Nicho
- Pastas Isabelle

### Logs

O scraper imprime logs claros durante a execução, por exemplo:

```txt
[LAZULE scraper] Fonte: https://rjperfumaria.catalog.kyte.site/
[LAZULE scraper] Iniciando categoria: Masculinos
[LAZULE scraper] Aguardando renderização inicial por 4000ms em Masculinos.
[LAZULE scraper] Scroll 1: y=900 altura=5200
[LAZULE scraper] Endpoints inspecionados em Masculinos:
[LAZULE scraper] - 200 xhr https://...
[LAZULE scraper] Amostra de rede salva em tmp/scraper-debug/masculinos-network-....json.
[LAZULE scraper] Candidatos em Masculinos: dom=40, html=40, scripts=0, rede=40, retailElements=40, roots=40, selectors=38, bodyText=12000
[LAZULE scraper] Produtos válidos em Masculinos: 38
[LAZULE scraper] Total bruto: 180
[LAZULE scraper] Total após deduplicação por nome: 160
[LAZULE scraper] Arquivo atualizado: src/data/products.js
[LAZULE scraper] Imagens salvas em: public/products
```

Quando um produto tiver mais de um preço antes do varejo sugerido, o scraper registra aviso e usa o primeiro preço como `costPrice`.

### Debug

O scraper não depende de `networkidle`, porque o catálogo Kyte pode manter conexões abertas e causar timeout. A navegação usa `domcontentloaded`, continua mesmo se a navegação não finalizar perfeitamente e só aborta o processo se nenhuma categoria gerar produtos válidos.

Quando uma categoria retorna 0 candidatos ou candidatos que não viram produtos válidos, o script salva arquivos de diagnóstico em:

```txt
tmp/scraper-debug
```

Os snapshots incluem HTML e, quando possível, screenshot da página renderizada. Esse diretório é ignorado pelo Git.

Quando o DOM vem vazio, o scraper tenta fontes alternativas na seguinte ordem combinada:

- texto renderizado do DOM;
- HTML completo da página;
- scripts JSON embutidos;
- respostas XHR/fetch/JSON capturadas pelo Playwright.

As respostas de rede inspecionadas são logadas e uma amostra limitada é salva em `tmp/scraper-debug/*-network-*.json` para facilitar a identificação de APIs internas do Kyte.

### Bloqueio Cloudflare / Turnstile

Se o snapshot HTML mostrar `<title>Just a moment...</title>`, `challenges.cloudflare.com`, `cf-turnstile`, `__cf_chl_*` ou a mensagem `Performing security verification`, o fornecedor está entregando uma página de desafio antibot em vez do catálogo. Nesse cenário, o scraper para com erro explícito, salva HTML/screenshot/amostras de rede em `tmp/scraper-debug` e não tenta contornar o desafio.

Para extrair os dados nesse caso, use uma das alternativas autorizadas:

- solicitar ao fornecedor um endpoint/API/export de produtos;
- executar o scraper em uma sessão/ambiente previamente liberado pelo fornecedor;
- importar manualmente um JSON/CSV autorizado e adaptar o parser para essa fonte.

Enquanto a resposta for a tela do Cloudflare, não existem produtos no DOM, HTML ou XHR do catálogo para extrair.

### Imagens

Quando uma imagem de produto estiver disponível, ela é baixada para:

```txt
public/products
```

No `products.js`, o caminho público fica assim:

```js
image: '/products/nome-do-produto.jpg'
```

Se o download falhar ou a imagem não existir, o card usa o fallback visual premium da LAZULE.

### Deduplicação

A deduplicação é feita por `name` normalizado. Se o mesmo produto aparecer em `All` e também em uma categoria específica, o `products.js` mantém apenas uma entrada.

### Badges públicos

Não use badges internos como `Fornecedor`. Os badges públicos devem ser termos vendáveis, como:

- Árabes
- Masculino
- Feminino
- Nicho
- Mais vendido
- Pronta entrega
- Presente


## Extração manual pelo navegador

Quando o catálogo do fornecedor estiver protegido por Cloudflare/Turnstile, o scraper automatizado pode receber apenas a tela `Just a moment...`. Nesse caso, use o navegador normal do usuário depois de passar pela verificação manual.

Passo a passo:

1. Abra o catálogo do fornecedor no Chrome normal:

```txt
https://rjperfumaria.catalog.kyte.site/
```

2. Passe pela verificação do Cloudflare, se aparecer.
3. Navegue até a categoria desejada ou a listagem com os produtos visíveis.
4. Abra o DevTools.
5. Vá na aba Console.
6. Copie todo o conteúdo de `tools/browserExtractor.js` e cole no Console.
7. Aguarde o scroll automático terminar.
8. O navegador vai baixar automaticamente o arquivo:

```txt
supplier-products.json
```

9. Para importar uma única extração, salve ou mova esse arquivo para:

```txt
data/supplier-products.json
```

Para consolidar várias categorias, rode o extractor em cada categoria e salve os arquivos em:

```txt
data/imports/
```

Exemplos:

```txt
data/imports/supplier-tudo.json
data/imports/supplier-masculinos.json
data/imports/supplier-femininos.json
data/imports/supplier-kit.json
data/imports/supplier-arabes.json
data/imports/supplier-nicho.json
data/imports/supplier-pastas-isabelle.json
```

Se `product.category` vier vazio ou genérico, o importador tenta inferir a categoria pelo nome do arquivo, por exemplo `supplier-arabes.json` vira `Árabe`.

10. Importe o JSON para o catálogo local:

```bash
npm run import:supplier-json
```

O importador lê todos os arquivos `.json` em `data/imports/`. Se essa pasta não tiver JSON, mantém compatibilidade com o fallback `data/supplier-products.json`. Ele junta todos os produtos, converte para `src/data/products.js`, deduplica por `name` normalizado e mantém imagens como URL externa inicialmente.

Regras aplicadas no importador:

- `costPrice` = primeiro preço antes de `Varejo`;
- `supplierRetailPrice` = valor após `Varejo`;
- `salePrice` = `supplierRetailPrice`;
- preços como `number`;
- se `name` vier como `14% OFF`, `7% OFF`, `3% OFF` etc., o importador usa `description` como nome real e limpa `description`;
- deduplicação por nome normalizado após juntar todos os arquivos;
- relatório no terminal com arquivos lidos, produtos brutos por arquivo, total consolidado, total deduplicado, quantidade por categoria e produtos com/sem imagem;
- campos internos continuam fora do front-end público.



### Captura de imagens no extractor

O `tools/browserExtractor.js` usa scroll mais lento e progressivo para dar tempo ao lazy loading do catálogo do fornecedor. Durante a extração, ele aguarda imagens visíveis carregarem, foca cada card com `scrollIntoView({ block: "center" })`, tenta `currentSrc`, `src`, atributos lazy (`data-src`, `data-lazy-src`, `data-original`), `srcset` e `background-image`, ignorando logos, banners, ícones e imagens muito pequenas.

Ao final, o extractor mostra relatório com total de produtos, produtos com imagem, produtos sem imagem, percentual de cobertura e até 20 produtos sem imagem para debug. O formato final do JSON permanece igual.

Produtos sem imagem devem permanecer com `image: ""`. O front-end exibe um fallback visual premium da LAZULE nesses cards, sem buscar imagens externas automaticamente.

## Busca inteligente e filtros avançados

O catálogo público combina busca normalizada e filtros para ajudar o cliente a encontrar perfumes por intenção. A busca remove acentos, usa lowercase, ignora caracteres especiais e permite termos parciais em campos como `name`, `brand`, `category`, `gender`, `badges`, `olfactoryReference`, `description` e `rawText`.

Filtros disponíveis na interface:

- categoria;
- gênero;
- marca;
- faixa de preço público (`salePrice`);
- com imagem ou sem imagem;
- pronta entrega;
- ordenação por menor preço, maior preço, A-Z e marca.

A interface exibe a contagem de produtos encontrados e o total geral do catálogo, mantendo campos internos como `costPrice`, `supplierRetailPrice`, margem e `sourceUrl` fora do front-end público.

## WhatsApp

Os links de WhatsApp são centralizados em `src/utils/whatsapp.js`.

A mensagem dos botões de produto segue o padrão:

```txt
Olá! Tenho interesse no perfume [NOME DO PRODUTO] da LAZULE. Está disponível?
```

O número oficial configurado em `WHATSAPP_NUMBER` é `5521975110562`, gerando links no formato `https://wa.me/5521975110562` com mensagens pré-preenchidas via `encodeURIComponent`.

## Como rodar localmente

Instale as dependências:

```bash
npm install
```

Instale o Chromium do Playwright, se necessário:

```bash
npx playwright install chromium
```

Rode o ambiente de desenvolvimento:

```bash
npm run dev
```

Atualize o catálogo a partir do fornecedor:

```bash
npm run scrape:supplier
```

Gere o build de produção:

```bash
npm run build
```

Pré-visualize o build:

```bash
npm run preview
```

## Analytics, Tracking e Pixel Architecture

A LAZULE possui uma camada centralizada em `src/utils/analytics.js` para medir comportamento, intenção de compra e conversão assistida pelo WhatsApp sem espalhar integrações pelo código da interface.

### Como ativar GA4

1. Crie ou abra uma propriedade Google Analytics 4.
2. Copie o Measurement ID no formato `G-XXXXXXXXXX`.
3. Configure no ambiente de deploy:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

O script do GA4 é carregado de forma assíncrona e condicional. O `send_page_view` automático fica desativado para evitar duplicidade em rotas SPA; as visualizações são enviadas pela função `trackPageView()`.

### Como ativar Meta Pixel

1. Crie ou abra um Pixel no Meta Events Manager.
2. Copie o Pixel ID.
3. Configure no ambiente de deploy:

```bash
VITE_META_PIXEL_ID=000000000000000
```

O Pixel é inicializado uma única vez, também de forma assíncrona. Se o ID não existir ou `fbq` não estiver disponível, os helpers retornam com segurança e o site continua funcionando.

### Helpers principais

Os helpers ficam em `src/utils/analytics.js`:

- `initializeAnalytics()` — inicializa GA4 e Meta Pixel de forma condicional.
- `trackEvent()` — base genérica para eventos customizados.
- `trackPageView()` — page views compatíveis com SPA routing.
- `trackProductView()` — visualização de produto, mapeada para GA4 `view_item` e Meta `ViewContent`.
- `trackProductSelect()` — clique em card/vitrine, mapeado para GA4 `select_item` quando aplicável.
- `trackWhatsappClick()` / `trackWhatsAppClick()` — intenção de compra pelo WhatsApp, mapeada para GA4 `generate_lead` e Meta `Contact`.
- `trackSearch()` — buscas com termo, contagem de resultado e origem.
- `trackBrandClick()`, `trackCategoryClick()` e `trackRecommendationClick()` — intenção por marca, categoria e recomendação.

### Eventos principais instrumentados

- Rotas SPA: `page_view` em home, catálogo, marca, produto, FAQ e deep links.
- Home: `hero_cta_click`, `search_focus`, `search_submit`, `category_click`, `brand_click`, `product_card_click`.
- Catálogo: `catalog_view`, `search`, `filter_apply`, `product_card_click`, `empty_search_result`, `catalog_load_more`.
- Marca: `brand_view`, `product_card_click`.
- Produto: `product_view`, `image_gallery_interaction`, `accordion_open`, `recommendation_click`, `whatsapp_click`.
- FAQ: `faq_view`, `faq_item_open`, `whatsapp_click`.
- WhatsApp global: `floating_whatsapp_click` via payload `cta_location=floating_whatsapp` no evento `whatsapp_click`.

### Privacidade

A arquitetura coleta apenas comportamento agregado e intenção comercial. Não colete nem envie nome de cliente, telefone, endereço, dados sensíveis ou conteúdo da conversa do WhatsApp nos payloads de analytics.

## Catálogo experimental com Supabase

A fonte padrão do catálogo continua sendo local (`src/data/products.js`). A integração Supabase é experimental e foi adicionada atrás de feature flag para validar uma fonte futura sem reescrever a UI ou mudar o contrato público dos produtos.

### Como ativar experimentalmente

Crie/atualize um arquivo `.env.local` com:

```bash
VITE_CATALOG_SOURCE=supabase
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
```

Se `VITE_CATALOG_SOURCE` estiver vazio, diferente de `supabase`, ou se `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` não estiverem configuradas, o repository mantém fallback automático para o catálogo local.

### Arquivos da integração

- `src/data/supabaseClient.js`: cliente REST mínimo para ler tabelas públicas do Supabase usando `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, sem quebrar build quando as variáveis estão vazias.
- `src/data/supabaseCatalogAdapter.js`: adapter que converte linhas planejadas do Supabase para o mesmo shape público normalizado retornado pelo catálogo local.
- `src/data/catalogRepository.js`: seleciona a fonte por `VITE_CATALOG_SOURCE=supabase|local` e mantém fallback local em erro, ausência de configuração ou retorno vazio.
- `src/data/localCatalogAdapter.js`: adapter local explícito para manter a arquitetura baseada em repository.

### Contrato preservado

O adapter Supabase retorna produtos com os campos consumidos hoje pela experiência pública, incluindo `id`, `name`, `brand`, `category`, `gender`, `salePrice`, `originalPrice`, `image`, `badges`, `description`, `olfactoryReference`, `available`, `featured`, `catalogType`, `productSlug`, `brandSlug`, campos normalizados e índices de busca.

### Tabelas planejadas

A primeira versão espera uma tabela `products` e aceita tanto colunas diretas quanto joins opcionais:

- `products`: `id`, `slug`, `name`, `description`, `brand`, `brand_name`, `category`, `category_name`, `catalog_type`, `gender`, `price`, `sale_price`, `original_price`, `image`, `image_url`, `badges`, `olfactory_reference`, `available`, `featured`, `size`, `volume_ml`.
- `brands`: `name`, `slug`.
- `categories`: `name`, `slug`, `catalog_type`.
- `product_images`: `url`, `alt`, `sort_order`.
- `product_prices`: `price`, `sale_price`, `original_price`, `currency`.
- `product_inventory`: `available`, `quantity`.

### Limitações atuais

- A integração é apenas leitura e experimental.
- Não há admin real, autenticação, RLS específica, upload de imagens ou migração de dados.
- A UI permanece visualmente igual; o objetivo é validar a fonte de dados por trás do repository.
- O fallback local é intencional para não derrubar o catálogo público durante testes.

### Próximos passos sugeridos

1. Definir schema final no Supabase com RLS de leitura pública apenas para tabelas publicáveis.
2. Criar seed/migração a partir de `src/data/products.js`.
3. Validar joins e ordenação com dados reais.
4. Só depois conectar telas públicas ao repository assíncrono se a fonte Supabase for promovida de experimental para padrão.
