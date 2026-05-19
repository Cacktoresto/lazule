# Collection Intelligence Engine (Phase 5)

O `collectionIntelligenceEngine` evolui a LAZULE para **guarda-roupa olfativo pessoal**, com foco em curadoria discreta e local-first.

## O que o motor analisa

- agregação de coleção por estado (owned, had before, want to try, wishlist, assinaturas);
- redundância olfativa (ex.: concentração excessiva em frescos executivos);
- lacunas de guarda-roupa (falta de assinaturas quentes, noturnas ou frescas);
- equilíbrio sazonal e de ocasião por sinais semânticos;
- direção dominante e resumo emocional (`feelLike`);
- estado atmosférico editorial (`clean_luminous`, `warm_editorial`, `cinematic_night`).

## Collection-aware recommendations

As recomendações agora podem consumir `collectionInsights` para:

- preservar diversidade descoberta;
- evitar repetição de direção já saturada;
- destacar contraste elegante e assinaturas complementares;
- manter equilíbrio entre uso diário, noite e sazonalidade.

## Privacidade e local-first

- armazenamento em memória local (`lazule_wardrobe_memory_v1`);
- sem texto bruto desnecessário: sinais são normalizados semanticamente;
- sem conta obrigatória nesta fase;
- estrutura pronta para futura sincronização em nuvem.

## Evolução de assinatura

O motor expõe `evolution.summary` + `timeline` para suportar uma narrativa de evolução:

- frescor versátil → assinatura autoral;
- presença executiva → sofisticação noturna;
- clean luxury → calor refinado.

## Arquitetura futura (preparação)

Preparado para expansão incremental:

- clustering semântico de coleção;
- scoring de redundância e completude de guarda-roupa;
- sugestões de rotação;
- compatibilidade de layering;
- sync cloud + multi-device sem quebrar persistência local.
