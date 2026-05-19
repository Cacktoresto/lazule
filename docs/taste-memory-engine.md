# Taste Memory Engine (Phase 4)

O Taste Memory Engine transforma interações semânticas em memória olfativa leve, determinística e privada.

## Princípios
- Sem texto cru persistido: apenas sinais normalizados.
- Sem PII: e-mail, telefone e texto sensível não entram no modelo.
- Determinístico-first: regras explícitas por tags semânticas.
- Diversidade preservada: memória orienta, não aprisiona.

## Modelo
- `normalizeMemorySignal`: converte evento em tags semânticas e estados de mood temporários.
- `aggregateTasteMemory`: identifica padrões recorrentes e afinidades dominantes.
- `inferTasteEvolution`: detecta evolução entre fase inicial e fase recente.
- `createMemoryAwareChips`: mistura recorrência + exploração adjacente.
- `buildPersonalOlfactiveProfile`: produz narrativa editorial (Sua assinatura / direção).

## Privacidade
- Persistência local (`localStorage`) com eventos limitados.
- Apenas campos anônimos (intents, tags, moods, projeção/performance normalizadas).
- Nenhum bloqueio de conta/autenticação.

## Recomendação memory-aware
A recomendação agora combina:
1. intenção atual
2. relacionamento olfativo
3. semântica atual
4. memória de gosto (recorrência)
5. evolução e mood temporário
6. diversidade/serendipidade

## Preparação futura
Estrutura pronta para integrar:
- embeddings / pgvector
- sync em nuvem com conta opcional
- identidade multi-dispositivo
- inteligência de coleção (wardrobe balance, gaps)
