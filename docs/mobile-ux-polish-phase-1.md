# Mobile UX Polish & Conversion Audit — Phase 1

## Problemas encontrados

### Crítico
- PDP mobile mantinha recomendações e blocos semânticos depois de explicações longas, atrasando a próxima escolha quando o cliente já queria comparar ou comprar.
- Carrinho em página não tinha estado vazio claro nem CTA fixo mobile; em telas pequenas o próximo passo podia ficar fora da dobra.
- Checkout não explicitava que a entrega/custos finais seriam tratados no Mercado Pago, criando possível insegurança antes do pagamento.

### Alto
- Busca do catálogo parecia mais lenta do que era: debounce alto, loading mínimo longo e texto de ação “Refinar” aumentavam sensação de etapa extra.
- Catálogo exibia vitrine hero e “streaming” antes da grade mesmo quando o usuário já tinha pesquisado ou filtrado, gerando scroll excessivo até resultados.
- Home tinha blocos editoriais personalizados antes das escolhas rápidas, competindo com catálogo, concierge e vitrines.
- Header mobile usava rótulos menos diretos (“Sua seleção”) e navegação desktop com muitos destinos secundários.

### Médio
- Filtro “Imagem” expunha uma ferramenta operacional que não ajuda compra final.
- Explicação de tipos no filtro não deixava clara a diferença prática entre importado e árabe.
- CTAs da PDP alternavam entre “Comprar com Segurança”, “Adicionar” e “Atendimento”, com hierarquia menos imediata.
- Footer comunicava “catálogo em construção”, reduzindo percepção de confiança comercial.

### Baixo
- Espaçamentos da home e footer eram generosos demais no mobile para conteúdo auxiliar.
- Resultado de busca não tinha contador visível no próprio campo.
- Labels de seções como “Streaming de descoberta” eram mais conceituais do que orientadas à decisão.

## Correções implementadas e justificativa

- Simplifiquei a home para prometer rapidamente o que a LAZULE vende, removendo blocos editoriais redundantes antes das rotas de descoberta. Isso diminui o scroll inicial e deixa catálogo/concierge mais óbvios.
- Tornei a busca do catálogo mais imediata: debounce reduzido, loading curto, contador no campo e CTA “Buscar”. Isso melhora a percepção de velocidade e feedback.
- Removi vitrine hero do catálogo durante busca/filtro e simplifiquei o texto de resultados. Isso leva o cliente diretamente aos produtos quando há intenção explícita.
- Reduzi filtros no mobile removendo o filtro operacional de imagem e adicionando contagem de filtros ativos. Isso preserva clareza sem criar escolhas irrelevantes.
- Ajustei a PDP para priorizar compra e recomendações antes de blocos semânticos profundos, com CTAs mais curtos (“Comprar agora”, “Guardar”, “Tirar dúvida”). Isso reduz fricção na primeira decisão.
- Reestruturei carrinho com estado vazio, cards mais legíveis, total e CTA fixo mobile. Isso mantém o próximo passo sempre visível.
- Reforcei checkout com resumo de custos, entrega calculada no Mercado Pago e CTA principal em destaque. Isso reduz insegurança antes do redirecionamento.
- Simplifiquei footer e header copy para diminuir ruído e aumentar confiança.
