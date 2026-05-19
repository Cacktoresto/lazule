# Perfume Experience Layer — PHASE 2B

A PHASE 2B transforma a página de produto da LAZULE em um perfil olfativo vivo. A proposta é traduzir a inteligência já existente — Perfume DNA Engine, Relationship Engine, status comercial e notas/acordes exploráveis — em uma experiência visual premium, editorial e comercial.

## DNA visual

A seção **DNA olfativo** exibe de 5 a 8 dimensões dominantes do perfume, priorizando `dna_vector`, `dominantDNA` e sinais inferidos de acordes, notas, família, ocasião, clima e performance. O objetivo é comunicar direção sensorial, não precisão laboratorial.

Diretrizes de UI:

- usar barras discretas, chips e medidores premium;
- manter paleta de azul noturno, lápis-lazúli, off-white e dourado queimado;
- evitar dashboard técnico ou gráfico colorido demais;
- não renderizar `undefined`, `null` ou listas vazias;
- manter interação mobile-first sem overflow horizontal.

## Assinatura LAZULE

A **Assinatura LAZULE** resume o perfume em uma frase curta e humana, combinando os principais acordes, família olfativa, vibes, ocasião, clima e dimensões dominantes.

Exemplo de tom desejado:

> Ambarado quente, elegância e presença noturna.

Esse texto deve soar como curadoria de boutique. Não deve sugerir medição científica ou resultado garantido.

## Uso ideal

O bloco **Ideal para** transforma `occasionTags`, `weatherTags`, dimensões dominantes e status em chips pequenos, úteis e tocáveis. Quando os dados estão incompletos, a camada ainda exibe uma recomendação segura, como **Uso versátil** ou **Curadoria sob consulta**.

## Performance percebida

A **Performance esperada** usa linguagem qualitativa:

- suave;
- moderada;
- marcante;
- intensa;
- beast mode apenas quando o dado de origem já usa essa expressão.

Não usamos promessas absolutas como duração garantida, horas fixas ou afirmações rígidas. A fixação percebida inclui o cuidado editorial: varia conforme pele, clima e aplicação.

## Dados incompletos e fallback

Quando o perfume não tem sinais suficientes, a página mostra o fallback elegante:

> Perfil olfativo em curadoria.

Mesmo nesse cenário, a camada cria um perfil mínimo a partir de nome, marca, categoria e status comercial para preservar layout, navegação e confiança.

## Relações olfativas e disponibilidade

As relações inteligentes continuam usando o Relationship Engine para mostrar perfis próximos, assinaturas compartilhadas, alternativas disponíveis e notas em comum. A experiência evita blocos vazios e prioriza alternativas em estoque quando o produto atual está `on_request` ou `reference_only`.

Eventos de analytics adicionados:

- `perfume_dna_view`;
- `dna_dimension_click`;
- `olfactive_signature_view`;
- `ideal_usage_click`;
- `performance_profile_view`;
- `related_signature_click`.

Payloads usam apenas `product_slug`, `status`, `dominant_dimensions` e metadados olfativos não sensíveis.

## Status comercial contextual

A camada reforça o CTA sem criar sensação de produto quebrado:

- `in_stock`: **Disponível na curadoria LAZULE**;
- `on_request`: **Podemos verificar disponibilidade e valor para você**;
- `reference_only`: **Este perfume faz parte da nossa base olfativa. Podemos buscar alternativas ou consultar disponibilidade**.

## Preparação para SEO futuro

A microcopy de notas/acordes exploráveis prepara futuras páginas SEO por nota, acorde e assinatura olfativa. A navegação atual já orienta o usuário a tocar em uma nota para descobrir perfumes relacionados, sem transformar a página de produto em uma taxonomia pesada.
