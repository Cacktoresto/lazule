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

O script usa Playwright para carregar o catálogo renderizado via JavaScript, acessar categorias do fornecedor, extrair produtos, deduplicar por nome normalizado, baixar imagens e atualizar `src/data/products.js`.

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
[LAZULE scraper] Blocos candidatos em Masculinos: 40
[LAZULE scraper] Produtos válidos em Masculinos: 38
[LAZULE scraper] Total bruto: 180
[LAZULE scraper] Total após deduplicação por nome: 160
[LAZULE scraper] Arquivo atualizado: src/data/products.js
[LAZULE scraper] Imagens salvas em: public/products
```

Quando um produto tiver mais de um preço antes do varejo sugerido, o scraper registra aviso e usa o primeiro preço como `costPrice`.

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

## WhatsApp

Os links de WhatsApp são centralizados em `src/utils/whatsapp.js`.

A mensagem dos botões de produto segue o padrão:

```txt
Olá! Tenho interesse no perfume [NOME DO PRODUTO] da LAZULE. Está disponível?
```

Antes de publicar, substitua o número placeholder em `WHATSAPP_NUMBER` pelo número oficial da marca.

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
