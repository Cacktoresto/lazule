# Autenticação e roles LAZULE

A área administrativa usa Supabase Auth com chave pública `anon` no frontend. Não existe backend separado e nenhuma senha é definida no código.

## Variáveis de ambiente

Configure no ambiente Vite:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

> Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, service role ou chaves secretas no frontend. A aplicação deve receber somente a anon/public key.

Se essas variáveis não existirem, a autenticação fica indisponível e a build continua funcionando. A rota `/admin/analytics` exibe um estado seguro explicando a configuração ausente.

## Aplicar a migration

A migration inicial está em:

```text
supabase/migrations/20260516131000_create_profiles_auth_roles.sql
```

Aplique pelo Supabase CLI ou cole o conteúdo no Supabase SQL Editor do projeto. Ela cria:

- tabela `public.profiles` vinculada a `auth.users`;
- roles iniciais `admin` e `influencer`;
- RLS habilitado;
- helper `public.is_admin()`;
- policies para leitura do próprio perfil, leitura admin de todos os perfis e atualização admin;
- trigger `public.handle_new_user()` para criar profile automaticamente quando um usuário nasce em `auth.users`.

## Criar usuários

Nesta etapa não há cadastro público. Crie usuários manualmente no Supabase Dashboard:

1. Acesse **Authentication > Users**.
2. Crie o usuário com e-mail e senha temporária segura.
3. Confirme o e-mail conforme sua política do projeto.
4. O trigger cria `public.profiles` com `role = 'influencer'` por padrão.

## Promover o primeiro admin

Depois de criar o usuário inicial, promova-o manualmente no Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'email-do-admin';
```

A conta precisa estar ativa (`is_active = true`) para passar pelas policies e pela proteção de rota.

## Roles disponíveis

- `admin`: acessa `/admin/analytics` e poderá gerenciar influencers/dados administrativos.
- `influencer`: base preparada para login individual futuro, sem dashboard implementado agora.

## Rotas protegidas

- `/admin/login`: tela premium de login com e-mail e senha.
- `/admin/analytics`: protegida por `RequireAdmin`; redireciona não autenticados para `/admin/login`, bloqueia usuários sem role `admin` e mostra estado seguro se Supabase Auth não estiver configurado.
- `/influencer/login`: estrutura temporária que redireciona para `/admin/login`; o painel de influencer ainda não foi implementado.

## Futuras rotas de influencer

Para proteger uma futura área de influencer, reutilize `AuthProvider` e crie um guard similar ao `RequireAdmin`, mas validando `isInfluencer` ou uma regra mais específica. O modelo previsto é: admin vê dashboard geral; influencer vê somente dados do próprio `profile`, usando RLS e filtros por `auth.uid()`.

## Analytics público

Rotas `/admin/*` não devem alimentar métricas públicas/referral. A aplicação ignora captura referral/page_view para admin e o utilitário de analytics descarta eventos cujo `page_path` comece com `/admin/`.
