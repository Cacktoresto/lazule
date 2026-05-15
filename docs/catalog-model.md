# Modelo atual do catálogo LAZULE

Este documento descreve o contrato público atual consumido pelo front antes da migração para Supabase. A fonte local ainda é `src/data/products.js`; a UI deve consumir produtos normalizados por `src/domain/product.js` via `src/data/catalogRepository.js`.

## Fonte atual

- `src/data/products.js` exporta um array de produtos público e estático.
- `src/data/localCatalogAdapter.js` normaliza a fonte local.
- `src/data/catalogRepository.js` concentra consultas de catálogo para que a origem possa ser trocada futuramente.

## Campos persistidos no JSON atual

| Campo | Obrigatório | Tipo esperado | Observações |
| --- | --- | --- | --- |
| `id` | Sim | `string` | Identificador estável; deve ser único. Candidato a `perfumes.id`/`sku`. |
| `name` | Sim | `string` | Nome comercial exibido e usado para slug derivado. |
| `brand` | Sim | `string` | Marca pública; candidata a tabela `brands`. |
| `category` | Sim | `string` | Categoria legada/editorial (`Femininos`, `Árabe`, etc.). Deve ser preservada durante migração. |
| `gender` | Sim | `string` | `Masculino`, `Feminino`, `Unissex` ou valores equivalentes. |
| `salePrice` | Sim | `number` | Preço público em BRL. `0` deve ser tratado como fallback/consulta, não como preço promocional automático. |
| `image` | Opcional | `string` URL | Pode estar vazio; UI deve usar fallback premium. Candidato a `perfume_images`. |
| `badges` | Opcional | `string[]` | Etiquetas editoriais/operacionais públicas. |
| `description` | Opcional | `string` | Texto público; não deve duplicar apenas referência olfativa. |
| `olfactoryReference` | Opcional | `string` | Referência olfativa textual; candidata a normalização parcial em notas/acordes no futuro. |
| `available` | Opcional | `boolean` | Disponibilidade pública simples. Movimentação real deve ir para estoque futuramente. |
| `featured` | Opcional | `boolean` | Sinal editorial para vitrines e ordenação. |

## Campos derivados pelo normalizador

Gerados em `normalizeProduct` e não devem ser persistidos como fonte primária sem necessidade:

- `originalName`
- `availability`
- `catalogType`
- `brandSlug`
- `productSlug`
- `productPath`
- `normalizedBrand`
- `normalizedName`
- `normalizedCategory`
- `normalizedCatalogType`
- `normalizedGender`
- `normalizedOlfactoryReference`
- `searchIndex`
- `searchTokens`

## Campos privados proibidos no front público

O validador bloqueia campos de custo/fornecedor como `costPrice`, `supplierCost`, `supplierRetailPrice`, `sourceUrl`, `supplierUrl`, `margin`, `margem`, `profit` e `wholesalePrice`.

## Candidatos a normalização no Supabase

- `brand` → `brands`
- `image` → `perfume_images`
- `category`/`catalogType` → colunas controladas ou tabelas de taxonomia
- `olfactoryReference`, futuras notas e acordes → `notes`, `accords`, `perfume_notes`, `perfume_accords`
- `badges`/vitrines → `collections` e `collection_products`
- `available`/status futuro → `inventory_movements` e visão de disponibilidade
