-- Controlled onboarding for LAZULE influencer/partner invites.
-- Public signup remains non-privileged: profiles created outside a valid invite are inactive influencers.

create extension if not exists pgcrypto;

create table if not exists public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null default 'influencer',
  influencer_ref text,
  coupon_code text,
  token text not null unique,
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint partner_invites_role_check check (role = 'influencer'),
  constraint partner_invites_token_length_check check (char_length(token) >= 48),
  constraint partner_invites_email_check check (position('@' in email) > 1)
);

create index if not exists partner_invites_email_idx on public.partner_invites (lower(email));
create index if not exists partner_invites_status_idx on public.partner_invites (is_active, accepted_at, expires_at);
create index if not exists partner_invites_invited_by_idx on public.partner_invites (invited_by);

alter table public.partner_invites enable row level security;

drop policy if exists "partner_invites_admin_select" on public.partner_invites;
create policy "partner_invites_admin_select"
  on public.partner_invites
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "partner_invites_admin_insert" on public.partner_invites;
create policy "partner_invites_admin_insert"
  on public.partner_invites
  for insert
  to authenticated
  with check (public.is_admin() and role = 'influencer');

drop policy if exists "partner_invites_admin_update" on public.partner_invites;
create policy "partner_invites_admin_update"
  on public.partner_invites
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin() and role = 'influencer');

create or replace function public.normalize_partner_invite_ref(value text)
returns text
language sql
immutable
as $$
  select nullif(trim(both '-' from regexp_replace(lower(regexp_replace(coalesce(value, ''), '^@+', '')), '[^a-z0-9._-]+', '-', 'g')), '');
$$;

create or replace function public.normalize_partner_invite_coupon(value text)
returns text
language sql
immutable
as $$
  select nullif(regexp_replace(upper(trim(coalesce(value, ''))), '[^A-Z0-9_-]+', '', 'g'), '');
$$;

create or replace function public.admin_create_partner_invite(
  email text,
  influencer_ref text default null,
  coupon_code text default null,
  expires_at timestamptz default null,
  role text default 'influencer'
)
returns public.partner_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  created_invite public.partner_invites;
  normalized_email text := lower(trim(email));
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if normalized_email is null or position('@' in normalized_email) <= 1 then
    raise exception 'Valid email is required' using errcode = '22023';
  end if;

  insert into public.partner_invites (
    email,
    role,
    influencer_ref,
    coupon_code,
    token,
    invited_by,
    expires_at
  ) values (
    normalized_email,
    'influencer',
    public.normalize_partner_invite_ref(influencer_ref),
    public.normalize_partner_invite_coupon(coupon_code),
    encode(gen_random_bytes(32), 'hex'),
    auth.uid(),
    coalesce(expires_at, now() + interval '14 days')
  )
  returning * into created_invite;

  return created_invite;
end;
$$;

create or replace function public.get_partner_invite_public(invite_token text)
returns table (
  id uuid,
  email text,
  role text,
  influencer_ref text,
  coupon_code text,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_active boolean,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pi.id,
    pi.email,
    pi.role,
    pi.influencer_ref,
    pi.coupon_code,
    pi.expires_at,
    pi.accepted_at,
    pi.is_active,
    pi.created_at
  from public.partner_invites pi
  where pi.token = invite_token
  limit 1;
$$;

create or replace function public.accept_partner_invite(invite_token text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.partner_invites;
  accepted_profile public.profiles;
  user_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into invite
  from public.partner_invites
  where token = invite_token
  for update;

  if invite.id is null or invite.is_active is false then
    raise exception 'Invalid invite' using errcode = '22023';
  end if;

  if invite.accepted_at is not null then
    raise exception 'Invite already accepted' using errcode = '23505';
  end if;

  if invite.expires_at <= now() then
    raise exception 'Invite expired' using errcode = '22023';
  end if;

  if lower(invite.email) <> user_email then
    raise exception 'Invite email does not match authenticated user' using errcode = '42501';
  end if;

  insert into public.profiles (id, email, role, influencer_ref, coupon_code, is_active)
  values (auth.uid(), invite.email, 'influencer', invite.influencer_ref, invite.coupon_code, true)
  on conflict (id) do update
    set email = excluded.email,
        role = 'influencer',
        influencer_ref = excluded.influencer_ref,
        coupon_code = excluded.coupon_code,
        is_active = true,
        updated_at = now()
  returning * into accepted_profile;

  update public.partner_invites
  set accepted_at = now(), is_active = false
  where id = invite.id;

  return accepted_profile;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  has_valid_invite boolean;
begin
  select exists (
    select 1
    from public.partner_invites pi
    where lower(pi.email) = lower(new.email)
      and pi.role = 'influencer'
      and pi.is_active = true
      and pi.accepted_at is null
      and pi.expires_at > now()
  ) into has_valid_invite;

  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'influencer',
    has_valid_invite
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name),
        is_active = public.profiles.is_active or excluded.is_active,
        updated_at = now();

  return new;
end;
$$;

grant execute on function public.admin_create_partner_invite(text, text, text, timestamptz, text) to authenticated;
grant execute on function public.get_partner_invite_public(text) to anon, authenticated;
grant execute on function public.accept_partner_invite(text) to authenticated;
