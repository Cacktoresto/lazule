# Checklist de produção commerce LAZULE

Use este checklist antes de ativar compras reais fora do sandbox.

## Credenciais e ambiente

1. Trocar credenciais Mercado Pago `TEST-` por `APP_USR-` somente em Production.
2. Manter credenciais `TEST-` apenas em Preview/Development.
3. Confirmar que `MP_ACCESS_TOKEN` está configurado apenas no backend/Vercel Environment Variables.
4. Confirmar que `MP_ACCESS_TOKEN` nunca aparece no frontend, logs públicos, bundles ou respostas HTTP.
5. Confirmar que `VITE_MP_PUBLIC_KEY` pode ser pública e está adequada ao ambiente.

## Mercado Pago

1. Configurar webhook real no painel Mercado Pago:
   `https://www.lazule.store/api/payments/webhook`
2. Validar `back_urls` reais:
   - `https://www.lazule.store/checkout/success`
   - `https://www.lazule.store/checkout/pending`
   - `https://www.lazule.store/checkout/failure`
3. Fazer uma compra real pequena e confirmar que o webhook muda o pedido para `paid`.
4. Validar status pendente, rejeitado, cancelado, reembolsado e contestado quando aplicável.
5. Validar política de reembolso/cancelamento publicada e coerente com a operação.
6. Validar CNPJ/CPF e conta Mercado Pago corretos.
7. Validar recebimento do dinheiro no painel Mercado Pago.

## Segurança operacional

1. Bloquear carrinho vazio no servidor.
2. Bloquear quantidades absurdas no servidor.
3. Validar `productId` no servidor.
4. Recalcular preço server-side antes de criar preference.
5. Evitar pedido duplicado quando o usuário clica várias vezes.
6. Deduplicar webhooks por pagamento/status/evento.
7. Não confiar em parâmetros da URL para status final.
8. Não expor stack trace em produção.
9. Revisar logs para garantir que nenhum token ou dado sensível aparece.

## Experiência pós-pagamento

1. Página de sucesso consulta `/api/payments/status/:orderId` antes de confirmar visualmente.
2. Página pendente mostra instruções reais quando Pix estiver disponível.
3. Página de falha permite tentar novamente ou voltar à seleção.
4. Página `/pedido/:orderId` mostra status, timeline, itens, total, pagamento, Pix e suporte.
5. Emails transacionais estão prontos com provider mock/log ou credencial real configurada.
6. Analytics registra funil principal sem quebrar UX.
7. Abandono de checkout registra sessões para recuperação futura.
8. Recuperação restaura seleção de forma discreta e não agressiva.
