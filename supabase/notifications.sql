-- Notifications (Jobello d'abord, puis les autres applis sur le même principe).
-- À coller une fois dans Supabase (projet de Jobello) : SQL Editor > New query > coller tout ce fichier > Run.
-- À faire APRÈS avoir créé la fonction « notifications » (voir NOTIFICATIONS.md). On peut le relancer sans risque.
-- Coût : 0 €. pg_cron et pg_net font partie de l'offre gratuite de Supabase.

create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists pgcrypto with schema extensions;

-- Réglages du serveur : clés d'envoi (créées par la fonction elle-même) et code secret du réveil.
create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  cron_secret text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  vapid_public text,
  vapid_private jsonb
);
insert into public.push_config (id) values (1) on conflict (id) do nothing;
alter table public.push_config enable row level security; -- aucune règle : personne ne la lit directement

-- Un appareil abonné (téléphone, ordinateur) et ses choix : quelles notifications il veut recevoir.
create table if not exists public.push_subs (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade,
  app text not null,
  sub jsonb not null,
  prefs jsonb not null default '{}'::jsonb,
  appareil text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists push_subs_user on public.push_subs (user_id, app);
alter table public.push_subs enable row level security;
drop policy if exists "mes appareils" on public.push_subs;
create policy "mes appareils" on public.push_subs for select to authenticated using (user_id = auth.uid());
drop policy if exists "retirer mes appareils" on public.push_subs;
create policy "retirer mes appareils" on public.push_subs for delete to authenticated using (user_id = auth.uid());

-- Les notifications programmées : l'appli les prépare, le serveur les envoie à l'heure dite.
create table if not exists public.push_queue (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  app text not null,
  key text not null,
  kind text not null,
  send_at timestamptz not null,
  title text not null,
  body text,
  url text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, app, key)
);
create index if not exists push_queue_due on public.push_queue (send_at) where sent_at is null;
alter table public.push_queue enable row level security;
drop policy if exists "mes rappels" on public.push_queue;
create policy "mes rappels" on public.push_queue for select to authenticated using (user_id = auth.uid());

-- clé publique d'envoi (l'appli en a besoin pour abonner un appareil)
create or replace function public.push_public_key() returns text
language sql security definer set search_path = public as $$ select vapid_public from push_config where id = 1 $$;

-- abonner (ou mettre à jour) cet appareil et ses choix
create or replace function public.push_register(p_app text, p_endpoint text, p_sub jsonb, p_prefs jsonb, p_appareil text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'connexion nécessaire'; end if;
  insert into push_subs (endpoint, user_id, app, sub, prefs, appareil) values (p_endpoint, auth.uid(), p_app, p_sub, coalesce(p_prefs, '{}'), p_appareil)
  on conflict (endpoint) do update set user_id = auth.uid(), app = excluded.app, sub = excluded.sub, prefs = excluded.prefs, appareil = coalesce(excluded.appareil, push_subs.appareil), updated_at = now();
end $$;

-- mettre à jour la liste des rappels prévus (l'appli envoie la liste complète des types qu'elle gère)
create or replace function public.push_sync(p_app text, p_kinds text[], p_items jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if auth.uid() is null then raise exception 'connexion nécessaire'; end if;
  delete from push_queue q where q.user_id = auth.uid() and q.app = p_app and q.sent_at is null and q.kind = any(p_kinds)
    and not exists (select 1 from jsonb_array_elements(p_items) i where i->>'key' = q.key);
  insert into push_queue (user_id, app, key, kind, send_at, title, body, url)
    select auth.uid(), p_app, i->>'key', i->>'kind', (i->>'send_at')::timestamptz, i->>'title', i->>'body', i->>'url'
    from jsonb_array_elements(p_items) i where (i->>'send_at')::timestamptz > now() - interval '5 minutes'
  on conflict (user_id, app, key) do update set kind = excluded.kind, send_at = excluded.send_at, title = excluded.title, body = excluded.body, url = excluded.url
    where push_queue.sent_at is null;
  get diagnostics n = row_count;
  delete from push_queue where user_id = auth.uid() and sent_at < now() - interval '30 days';
  return n;
end $$;

-- une notification d'essai, envoyée dans la minute
create or replace function public.push_test(p_app text, p_title text, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into push_queue (user_id, app, key, kind, send_at, title, body, url)
  values (auth.uid(), p_app, 'test:' || extract(epoch from now())::bigint, 'test', now(), p_title, p_body, './');
$$;

/* ---------- Côté serveur : appelé seulement par la fonction « notifications », avec le code secret ---------- */
create or replace function public.push_server_keys(p_secret text, p_public text default null, p_private jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c push_config;
begin
  select * into c from push_config where id = 1;
  if c.cron_secret is distinct from p_secret then raise exception 'non autorisé'; end if;
  if c.vapid_public is null and p_public is not null then
    update push_config set vapid_public = p_public, vapid_private = p_private where id = 1 returning * into c;
  end if;
  return jsonb_build_object('public', c.vapid_public, 'private', c.vapid_private);
end $$;

-- les notifications à envoyer maintenant, avec les appareils qui les veulent (elles sont marquées envoyées)
create or replace function public.push_server_due(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if (select cron_secret from push_config where id = 1) is distinct from p_secret then raise exception 'non autorisé'; end if;
  with due as (
    update push_queue set sent_at = now()
    where sent_at is null and send_at <= now()
    returning user_id, app, key, kind, send_at, title, body, url
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', d.key, 'kind', d.kind, 'title', d.title, 'body', d.body, 'url', d.url,
    'subs', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'sub', s.sub)), '[]'::jsonb) from push_subs s
             where s.user_id = d.user_id and s.app = d.app and (d.kind = 'test' or coalesce((s.prefs->>d.kind)::boolean, true)))
  )), '[]'::jsonb) into out
  from due d where d.send_at > now() - interval '12 hours'; -- un rappel trop vieux (serveur arrêté) n'est plus envoyé
  return out;
end $$;

-- un appareil qui n'existe plus (appli supprimée, notifications coupées) est retiré
create or replace function public.push_server_gone(p_secret text, p_endpoints text[]) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select cron_secret from push_config where id = 1) is distinct from p_secret then raise exception 'non autorisé'; end if;
  delete from push_subs where endpoint = any(p_endpoints);
end $$;

revoke all on function public.push_server_keys(text, text, jsonb), public.push_server_due(text), public.push_server_gone(text, text[]) from public;
grant execute on function public.push_server_keys(text, text, jsonb), public.push_server_due(text), public.push_server_gone(text, text[]) to anon, authenticated;
revoke all on function public.push_register(text, text, jsonb, jsonb, text), public.push_sync(text, text[], jsonb), public.push_test(text, text, text) from public, anon;
grant execute on function public.push_public_key() to anon, authenticated;
grant execute on function public.push_register(text, text, jsonb, jsonb, text), public.push_sync(text, text[], jsonb), public.push_test(text, text, text) to authenticated;
grant select, delete on public.push_subs to authenticated;
grant select on public.push_queue to authenticated;

/* ---------- Jobello : nouvelles offres repérées → une notification ---------- */
create or replace function public.push_jobello_offres() returns trigger
language plpgsql security definer set search_path = public as $$
declare anciens text[]; nouvelles jsonb; n int; loc timestamp; envoi timestamptz; titre text;
begin
  if new.path not in ('alertes/jour', 'alertes/sites') then return new; end if;
  if tg_op = 'UPDATE' then
    select coalesce(array_agg(x->>'url'), '{}') into anciens from jsonb_array_elements(coalesce(old.data->'offres', '[]'::jsonb)) x;
  else anciens := '{}'; end if;
  select coalesce(jsonb_agg(x order by (x->>'mode') = 'prestataire', coalesce((x->>'score')::int, 0) desc), '[]'::jsonb) into nouvelles
    from jsonb_array_elements(case when jsonb_typeof(new.data->'offres') = 'array' then new.data->'offres' else '[]'::jsonb end) x
    where x->>'url' is not null and not (x->>'url' = any(anciens)) and coalesce(x->>'verdict', '') <> 'bof';
  n := jsonb_array_length(nouvelles);
  if n = 0 then return new; end if;
  -- pas de notification la nuit : entre 22 h et 8 h, elle part à 8 h 30
  loc := now() at time zone 'Europe/Paris';
  envoi := case when extract(hour from loc) >= 22 then (date_trunc('day', loc) + interval '1 day 8 hours 30 minutes') at time zone 'Europe/Paris'
                when extract(hour from loc) < 8 then (date_trunc('day', loc) + interval '8 hours 30 minutes') at time zone 'Europe/Paris'
                else now() end;
  titre := case when n = 1 then 'Une nouvelle offre pour toi' else n || ' nouvelles offres pour toi' end;
  insert into push_queue (user_id, app, key, kind, send_at, title, body, url)
  values (new.owner, 'jobello', 'offres:' || new.path || ':' || (extract(epoch from clock_timestamp()) * 1000)::bigint, 'offres', envoi, titre,
    (select string_agg(coalesce(o->>'titre', 'Offre') || ' · ' || coalesce(o->>'entreprise', ''), E'\n') from (select o from jsonb_array_elements(nouvelles) o limit 3) t)
      || case when n > 3 then E'\n… et ' || (n - 3) || ' autre' || case when n > 4 then 's' else '' end else '' end,
    './#plateformes')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists push_jobello_offres on public.docs;
create trigger push_jobello_offres after insert or update of data on public.docs for each row execute function public.push_jobello_offres();

/* ---------- Le réveil : chaque minute, s'il y a quelque chose à envoyer, on appelle la fonction ---------- */
do $$ begin perform cron.unschedule('notifications'); exception when others then null; end $$;
select cron.schedule('notifications', '* * * * *', $cron$
  select net.http_post(
    url := 'https://vvxkkqcmjrwytagbxdfg.supabase.co/functions/v1/notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_secret from public.push_config where id = 1)),
    body := '{}'::jsonb)
  where exists (select 1 from public.push_queue where sent_at is null and send_at <= now());
$cron$);

-- premier appel tout de suite : la fonction crée ses clés d'envoi
select net.http_post(
  url := 'https://vvxkkqcmjrwytagbxdfg.supabase.co/functions/v1/notifications',
  headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_secret from public.push_config where id = 1)),
  body := '{}'::jsonb);
