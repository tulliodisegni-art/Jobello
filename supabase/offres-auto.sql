-- Recherche automatique des offres pour les utilisateurs de Jobello (fonction « offres », voir supabase/functions/offres).
-- Coût : 0 €. Adzuna (clé gratuite, 250 appels par jour), pg_cron et pg_net sont gratuits.
-- La clé Adzuna est collée par le propriétaire dans Jobello ⚙︎ ; elle n'est lisible que par le serveur.

create table if not exists public.offres_config (
  id int primary key default 1 check (id = 1),
  adzuna_id text,
  adzuna_key text,
  maj timestamptz
);
alter table public.offres_config enable row level security; -- aucune règle : seul le serveur la lit

-- Le propriétaire enregistre la clé Adzuna depuis l'appli
create or replace function public.offres_set_cle(p_id text, p_key text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  if lower(coalesce(auth.jwt()->>'email', '')) <> 'tulliodisegni@icloud.com' then raise exception 'réservé au propriétaire'; end if;
  insert into offres_config (id, adzuna_id, adzuna_key, maj) values (1, nullif(trim(p_id), ''), nullif(trim(p_key), ''), now())
  on conflict (id) do update set adzuna_id = excluded.adzuna_id, adzuna_key = excluded.adzuna_key, maj = now();
  return true;
end $$;
revoke all on function public.offres_set_cle(text, text) from public, anon;
grant execute on function public.offres_set_cle(text, text) to authenticated;

-- Est-ce que la recherche auto est prête ? (sans jamais renvoyer la clé)
create or replace function public.offres_etat() returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('cle', coalesce((select adzuna_id is not null and adzuna_key is not null from offres_config where id = 1), false),
                            'maj', (select maj from offres_config where id = 1))
$$;
grant execute on function public.offres_etat() to authenticated;

-- Chaque matin à 7 h 05 (heure de Paris en hiver, 8 h 05 en été) : recherche pour tous ceux qui ont rempli leur fiche
do $$ begin perform cron.unschedule('offres-auto'); exception when others then null; end $$;
select cron.schedule('offres-auto', '5 6 * * *', $cron$
  select net.http_post(
    url := 'https://vvxkkqcmjrwytagbxdfg.supabase.co/functions/v1/offres',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_secret from public.push_config where id = 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000)
  where exists (select 1 from public.offres_config where id = 1 and adzuna_key is not null);
$cron$);
notify pgrst, 'reload schema';
