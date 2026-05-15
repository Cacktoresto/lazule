# Plano conceitual de migração para Supabase

Status: planejamento arquitetural. Este projeto **não** instala Supabase, não cria backend e não altera a fonte de dados em produção nesta etapa.

## Objetivo

Permitir que a LAZULE troque o catálogo local por um banco relacional sem reescrever Home, catálogo, páginas de produto, SEO, WhatsApp checkout ou analytics. A fronteira atual é:

1. `src/data/products.js` — fonte local temporária.
2. `src/data/localCatalogAdapter.js` — adapter local.
3. `src/domain/product.js` — normalização pública do produto.
4. `src/data/catalogRepository.js` — consultas usadas pela UI.

## Proposta inicial de tabelas

### `brands`

- `id uuid primary key`
- `name text not null unique`
- `slug text not null unique`
- `description text`
- `created_at timestamptz`
- `updated_at timestamptz`

Origem: campo `brand` do JSON atual.

### `perfumes`

- `id uuid primary key`
- `legacy_id text unique`
- `brand_id uuid references brands(id)`
- `name text not null`
- `slug text not null unique`
- `category text`
- `catalog_type text`
- `gender text`
- `sale_price numeric(10,2)`
- `description text`
- `olfactory_reference text`
- `available boolean default true`
- `featured boolean default false`
- `status text default 'published'`
- `created_at timestamptz`
- `updated_at timestamptz`

Origem: campos principais de `src/data/products.js`. `slug`, normalizações e URL canônica continuam derivados pela aplicação ou por função SQL equivalente.

### `perfume_images`

- `id uuid primary key`
- `perfume_id uuid references perfumes(id)`
- `url text not null`
- `alt text`
- `position int default 0`
- `is_primary boolean default false`

Origem: campo `image`; permite galeria real depois.

### `notes` e `accords`

- `id uuid primary key`
- `name text not null unique`
- `slug text not null unique`

Origem inicial: não há campos estruturados completos hoje; podem nascer de curadoria/admin.

### Relações N:N

- `perfume_notes(perfume_id, note_id, pyramid_level, position)`
- `perfume_accords(perfume_id, accord_id, intensity, position)`
- `perfume_vibes(perfume_id, vibe, position)`

Essas tabelas habilitam filtros olfativos, recomendações mais precisas e storytelling por produto.

### Coleções editoriais

- `collections(id, slug, title, description, placement, active, sort_order)`
- `collection_products(collection_id, perfume_id, position, pinned)`

Origem atual: vitrines derivadas por algoritmo em `getFeaturedCollections`; no futuro, o admin poderá fixar produtos e complementar o algoritmo.

### Analytics

- `analytics_events(id, event_name, payload jsonb, page_path, session_id_hash, is_admin boolean, created_at)`

Origem futura: eventos hoje ficam localmente no navegador e agregadores puros vivem em `src/utils/analyticsDashboard.js`. Evitar PII; usar hash/flags para filtragem administrativa.

### Administração e estoque futuros

- `admin_users(id, auth_user_id, role, created_at)`
- `inventory_movements(id, perfume_id, movement_type, quantity, reason, created_by, created_at)`

Não entram nesta etapa, mas evitam misturar disponibilidade pública com operação interna.

## Dados normalizados vs derivados

Persistir no banco:

- nomes, marca, preço, categoria, gênero, status público, imagens, relações olfativas e coleções editoriais.

Continuar derivado:

- canonical URL
- `productPath`
- índices de busca client-side, enquanto a busca for local
- payloads de SEO/JSON-LD
- mensagem WhatsApp
- score de recomendação, até existir motor relacional/remoto

## Features habilitadas pela estrutura

- Admin real para CRUD de perfumes, imagens e coleções.
- Filtros por notas/acordes/vibes.
- Auditoria de estoque e disponibilidade.
- Vitrines editoriais manuais + automáticas.
- Analytics com origem remota e filtro de visitas administrativas.
- Migração incremental: implementar um `supabaseCatalogAdapter` mantendo a API do repository.
