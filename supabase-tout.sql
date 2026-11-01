-- Tout installer d'un coup : invitations (Repz, Mijonote, Good Food, Jobello) + amis de Good Food.
-- Supabase, projet Jobello : SQL Editor > New query > coller tout ce fichier > Run. On peut le relancer sans risque.

-- Invitations pour Repz, Mijonote, Good Food et Jobello.
-- À coller une fois dans Supabase (projet de Jobello) : SQL Editor, puis « Run ».
-- Les tables ne sont lisibles par personne directement : tout passe par les fonctions ci-dessous.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_invites (
  code text primary key,
  app text not null,                 -- 'repz', 'mijonote', 'goodfood', 'jobello' ou '*' pour toutes
  label text,                        -- à qui tu l'as donné
  max_uses int not null default 1,
  uses int not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.app_devices (
  device text not null,
  app text not null,
  code text not null references public.app_invites(code) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (device, app)
);
create table if not exists public.app_admin (id int primary key default 1, key_hash text not null);
alter table public.app_invites enable row level security;
alter table public.app_devices enable row level security;
alter table public.app_admin enable row level security;

-- empreinte de la clé propriétaire (la clé elle-même n'est écrite nulle part)
insert into public.app_admin (id, key_hash) values (1, '0a8b817b683308650939ffa6fbace189b8cc350ebf9350137266522d0111d4da')
  on conflict (id) do update set key_hash = excluded.key_hash;

create or replace function public.app_is_admin(p_key text) returns boolean
language sql security definer set search_path = public, extensions as $$
  select exists (select 1 from app_admin where key_hash = encode(extensions.digest(coalesce(p_key, ''), 'sha256'), 'hex'));
$$;

-- entrer un code d'invitation sur un téléphone
create or replace function public.app_redeem(p_app text, p_code text, p_device text) returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_code)); inv app_invites;
begin
  if p_device is null or length(p_device) < 8 then return 'invalid'; end if;
  select * into inv from app_invites where code = c and (app = p_app or app = '*') for update;
  if not found then return 'invalid'; end if;
  if inv.revoked then return 'revoked'; end if;
  if exists (select 1 from app_devices where device = p_device and app = p_app and code = c) then return 'ok'; end if;
  if inv.uses >= inv.max_uses then return 'used'; end if;
  insert into app_devices (device, app, code) values (p_device, p_app, c)
    on conflict (device, app) do update set code = excluded.code, last_seen = now();
  update app_invites set uses = uses + 1 where code = c;
  return 'ok';
end $$;

-- vérifier qu'un téléphone a toujours le droit (invitation pas retirée)
create or replace function public.app_check(p_app text, p_device text) returns boolean
language plpgsql security definer set search_path = public as $$
declare ok boolean;
begin
  select not i.revoked into ok from app_devices d join app_invites i on i.code = d.code where d.device = p_device and d.app = p_app;
  if ok then update app_devices set last_seen = now() where device = p_device and app = p_app; end if;
  return coalesce(ok, false);
end $$;

-- propriétaire : créer, lister, retirer des invitations
create or replace function public.app_invite_create(p_key text, p_app text, p_label text, p_max int default 1) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare a text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; c text; b bytea;
begin
  if not app_is_admin(p_key) then raise exception 'non autorisé'; end if;
  loop
    b := extensions.gen_random_bytes(8); c := '';
    for i in 0..7 loop c := c || substr(a, (get_byte(b, i) % 31) + 1, 1); if i = 3 then c := c || '-'; end if; end loop;
    exit when not exists (select 1 from app_invites where code = c);
  end loop;
  insert into app_invites (code, app, label, max_uses) values (c, p_app, nullif(trim(p_label), ''), greatest(1, coalesce(p_max, 1)));
  return c;
end $$;

create or replace function public.app_invite_list(p_key text, p_app text)
returns table (code text, label text, uses int, max_uses int, revoked boolean, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not app_is_admin(p_key) then raise exception 'non autorisé'; end if;
  return query select i.code, i.label, i.uses, i.max_uses, i.revoked, i.created_at from app_invites i
    where i.app = p_app or i.app = '*' order by i.created_at desc limit 200;
end $$;

create or replace function public.app_invite_revoke(p_key text, p_code text, p_revoked boolean default true) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not app_is_admin(p_key) then raise exception 'non autorisé'; end if;
  update app_invites set revoked = p_revoked where code = upper(trim(p_code));
end $$;

revoke all on function public.app_is_admin(text) from public;
grant execute on function public.app_is_admin(text), public.app_redeem(text, text, text), public.app_check(text, text),
  public.app_invite_create(text, text, text, int), public.app_invite_list(text, text), public.app_invite_revoke(text, text, boolean)
  to anon, authenticated;

-- Good Food : profils, abonnements (sur demande) et adresses partagées avec ses abonnés.
-- À coller une fois dans Supabase (projet des comptes, celui de Jobello) : SQL Editor, puis « Run ».

create table if not exists public.gf_profiles (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9._]{3,20}$'),
  name text,
  is_owner boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.gf_follows (
  follower uuid not null references auth.users on delete cascade,
  followee uuid not null references auth.users on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create table if not exists public.gf_shared (
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner, id)
);
alter table public.gf_profiles enable row level security;
alter table public.gf_follows enable row level security;
alter table public.gf_shared enable row level security;

-- profils : visibles par les comptes connectés (pour trouver un pseudo), chacun modifie le sien
drop policy if exists "profils lisibles" on public.gf_profiles;
create policy "profils lisibles" on public.gf_profiles for select to authenticated using (true);
drop policy if exists "mon profil" on public.gf_profiles;
create policy "mon profil" on public.gf_profiles for insert to authenticated with check (user_id = auth.uid() and not is_owner);
drop policy if exists "mon profil modif" on public.gf_profiles;
create policy "mon profil modif" on public.gf_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- abonnements : je demande (en attente), la personne suivie accepte ou refuse
drop policy if exists "mes abonnements" on public.gf_follows;
create policy "mes abonnements" on public.gf_follows for select to authenticated using (follower = auth.uid() or followee = auth.uid());
drop policy if exists "demander" on public.gf_follows;
create policy "demander" on public.gf_follows for insert to authenticated with check (follower = auth.uid() and status = 'pending');
drop policy if exists "accepter" on public.gf_follows;
create policy "accepter" on public.gf_follows for update to authenticated using (followee = auth.uid()) with check (followee = auth.uid());
drop policy if exists "retirer" on public.gf_follows;
create policy "retirer" on public.gf_follows for delete to authenticated using (follower = auth.uid() or followee = auth.uid());

-- adresses partagées : visibles par leur auteur et par ses abonnés acceptés
drop policy if exists "mes adresses" on public.gf_shared;
create policy "mes adresses" on public.gf_shared for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists "adresses des gens suivis" on public.gf_shared;
create policy "adresses des gens suivis" on public.gf_shared for select to authenticated using (
  exists (select 1 from public.gf_follows f where f.follower = auth.uid() and f.followee = gf_shared.owner and f.status = 'accepted'));

-- à la création d'un profil : Tullio est reconnu, et tout nouveau membre suit Tullio d'office
create or replace function public.gf_on_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  select id into t from auth.users where lower(email) = 'tulliodisegni@icloud.com' limit 1;
  if new.user_id = t then
    update gf_profiles set is_owner = true where user_id = new.user_id;
  elsif t is not null then
    insert into gf_follows (follower, followee, status) values (new.user_id, t, 'accepted') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists gf_profile_created on public.gf_profiles;
create trigger gf_profile_created after insert on public.gf_profiles for each row execute function public.gf_on_profile();

revoke update on public.gf_profiles from authenticated;
grant select, insert on public.gf_profiles to authenticated;
grant update (handle, name) on public.gf_profiles to authenticated;
grant select, insert, update, delete on public.gf_follows to authenticated;
grant select, insert, update, delete on public.gf_shared to authenticated;
