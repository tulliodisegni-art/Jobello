/* Jobello : un rappel n'est envoyé que s'il est encore vrai au moment de partir.
   Les rappels (relances, réponses à envoyer, remerciements…) sont calculés par l'appli quand elle est ouverte.
   Entre-temps, les tâches Claude (mails, agents) ou un autre appareil peuvent avoir déjà fait l'action :
   juste avant l'envoi, on relit les fiches dans docs et on retire (ou on réécrit) ce qui n'a plus lieu d'être.
   Mêmes règles que l'appli (index.html : ownRelance, relanceAncienne). */

create or replace function public.jobello_relance_due(c jsonb, d date) returns boolean
language sql immutable as $$
  select coalesce(c->>'statut', '') in ('envoyee', 'relancee', 'entretien')
     and coalesce(c->>'decision', '') not in ('stop', 'pause')
     and coalesce(c->>'prochaineRelance', '') <> '' and (c->>'prochaineRelance') <= d::text
     and coalesce(c->>'relancePar', '') = ''
     -- relance d'un tour d'avant : un entretien a été fixé depuis
     and not (coalesce(c->>'dateEntretien', '') <> '' and (coalesce(c->>'attente', '') = '' or c->>'attente' < c->>'dateEntretien'))
     -- une réponse à leur mail attend : c'est elle l'action, pas la relance
     and not (c ? 'reponseMail' and jsonb_typeof(c->'reponseMail') = 'object' and coalesce(c->'reponseMail'->>'envoye', '') = '')
     -- entretien à venir : pas de relance
     and not (coalesce(c->>'dateEntretien', '') >= d::text)
$$;

create or replace function public.jobello_rappel_frais(p_user uuid, p_key text, p_kind text, p_title text, p_body text, p_url text, p_at timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  d date := (p_at at time zone 'Europe/Paris')::date;
  cid text := substring(p_url from 'ouvrir=([^&]+)');
  c jsonb; n int; noms text[]; pid text; tot int; reps text[]; pretes text[];
  keep jsonb := jsonb_build_object('title', p_title, 'body', p_body, 'url', p_url);
begin
  if cid is not null then
    select data into c from docs where owner = p_user and path = 'candidatures/' || cid;
  end if;

  if p_kind = 'relance' then
    if cid is not null then
      if c is null then return null; end if;
      if coalesce(c->>'relancePar', '') <> '' then return keep; end if; -- relance via un contact : réglée côté réseau
      return case when jobello_relance_due(c, d) then keep else null end;
    end if;
    -- rappel groupé : on refait la liste avec les fiches d'aujourd'hui
    select array_agg(coalesce(x.data->>'entreprise', 'la société') order by x.data->>'prochaineRelance')
      into noms
      from (select path, data from docs where owner = p_user and path like 'candidatures/%' and jobello_relance_due(data, d)
              -- comme l'appli : les relances du jour, et les retards seulement s'ils étaient déjà dans ce rappel
              and (data->>'prochaineRelance' = d::text or position(coalesce(data->>'entreprise', '§') in p_body) > 0)) x;
    select count(*) into tot from docs k join docs ct on ct.owner = k.owner and ct.path = 'contacts/' || (k.data->>'relancePar')
      where k.owner = p_user and k.path like 'candidatures/%' and coalesce(k.data->>'relancePar', '') <> ''
        and coalesce(k.data->>'decision', '') not in ('stop', 'pause') and coalesce(k.data->>'statut', '') in ('envoyee', 'relancee', 'entretien')
        and coalesce(ct.data->>'etape', '') <> 'sans_suite' and coalesce(ct.data->>'prochaineAction', '') <> '' and ct.data->>'prochaineAction' <= d::text;
    n := coalesce(array_length(noms, 1), 0);
    tot := tot + n;
    if tot = 0 then return null; end if;
    if tot = 1 and n = 1 then
      select split_part(path, '/', 2) into pid from docs where owner = p_user and path like 'candidatures/%' and jobello_relance_due(data, d)
        and (data->>'prochaineRelance' = d::text or position(coalesce(data->>'entreprise', '§') in p_body) > 0) limit 1;
      return jsonb_build_object('title', 'Relance ' || noms[1] || ' aujourd''hui', 'body', 'Le message de relance est prêt dans Jobello.', 'url', './?ouvrir=' || pid);
    end if;
    if n = 0 then return keep; end if;
    return jsonb_build_object('title', tot || ' relances aujourd''hui',
      'body', array_to_string((select array_agg(distinct v) from unnest(noms[1:3]) v), ', ') || case when tot > 3 then ' et ' || (tot - 3) || ' autre' || case when tot > 4 then 's' else '' end else '' end || '. Les messages sont prêts dans Jobello.',
      'url', './#accueil');
  end if;

  if p_kind = 'envoi' and p_key like 'envoi:%' then
    select array_agg(coalesce(data->>'entreprise', '?')) into reps from docs where owner = p_user and path like 'candidatures/%'
      and coalesce(data->>'statut', '') not in ('refus', 'abandon') and coalesce(data->>'decision', '') <> 'stop'
      and jsonb_typeof(data->'reponseMail') = 'object' and coalesce(data->'reponseMail'->>'envoye', '') = '' and coalesce(data->'reponseMail'->>'auto', 'false') <> 'true';
    select array_agg(coalesce(data->>'entreprise', '?')) into pretes from docs where owner = p_user and path like 'candidatures/%'
      and data->>'statut' = 'a_envoyer' and coalesce(data->>'decision', '') not in ('stop', 'pause') and coalesce(data->>'claudeLe', '') = ''
      and (coalesce(data->>'cv', '') <> '' or coalesce(data->>'lettre', '') <> '');
    tot := coalesce(array_length(reps, 1), 0) + coalesce(array_length(pretes, 1), 0);
    if tot = 0 then return null; end if;
    if tot = 1 and cid is not null then
      if c is null then return null; end if;
      return case when (jsonb_typeof(c->'reponseMail') = 'object' and coalesce(c->'reponseMail'->>'envoye', '') = '') or c->>'statut' = 'a_envoyer' then keep else null end;
    end if;
    return jsonb_build_object('title', case when tot = 1 then case when reps is not null then 'Réponds à ' || reps[1] else 'Ta candidature chez ' || pretes[1] || ' est prête' end else tot || ' envois t''attendent' end,
      'body', concat_ws(E'\n', case when reps is not null then 'Réponse prête pour ' || array_to_string(reps[1:3], ', ') || '.' end, case when pretes is not null then 'Dossier prêt : ' || array_to_string(pretes[1:3], ', ') || '.' end),
      'url', case when tot = 1 then p_url else './#candidatures' end);
  end if;

  if p_kind = 'envoi' and p_key like 'lancee:%' then
    return case when exists (select 1 from docs where owner = p_user and path like 'candidatures/%' and data->>'statut' = 'a_envoyer' and coalesce(data->>'claudeLe', '') <> '' and coalesce(data->>'decision', '') not in ('stop', 'pause')) then keep else null end;
  end if;

  if p_kind = 'dossier' then
    return case when exists (select 1 from docs where owner = p_user and path like 'candidatures/%' and data->>'statut' = 'a_envoyer' and coalesce(data->>'decision', '') not in ('stop', 'pause')
      and coalesce(data->>'claudeLe', '') = '' and coalesce(data->>'cv', '') = '' and coalesce(data->>'lettre', '') = '') then keep else null end;
  end if;

  if p_kind in ('merci', 'apres', 'entretien') and p_key ~ '^(merci|apres|ent-veille|ent-avant|ent-matin):' then
    if c is null then return null; end if;
    if coalesce(c->>'statut', '') in ('refus', 'abandon') or coalesce(c->>'decision', '') = 'stop' then return null; end if;
    -- entretien déplacé ou annulé : le rappel ne correspond plus
    if coalesce(c->>'dateEntretien', '') = '' or position((c->>'dateEntretien') in p_key) = 0 then return null; end if;
    if p_kind = 'merci' and (coalesce(c->>'remerciement', '') <> '' or coalesce(c->'mailAuto'->>'statut', '') in ('a_envoyer', 'envoye')) then return null; end if;
    if p_kind = 'apres' and (coalesce(c->>'attente', '') >= c->>'dateEntretien' or coalesce(c->>'remerciement', '') <> '') then return null; end if;
    return keep;
  end if;

  return keep;
exception when others then
  return keep; -- au moindre souci, on envoie le rappel tel quel plutôt que rien
end $$;
revoke all on function public.jobello_rappel_frais(uuid, text, text, text, text, text, timestamptz) from public, anon, authenticated;

-- les notifications à envoyer maintenant (marquées envoyées), relues juste avant de partir
create or replace function public.push_server_due(p_secret text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare out jsonb;
begin
  if (select cron_secret from push_config where id = 1) is distinct from p_secret then raise exception 'non autorisé'; end if;
  with due as (
    update push_queue set sent_at = now()
    where sent_at is null and send_at <= now()
    returning user_id, app, key, kind, send_at, title, body, url
  ), frais as (
    select d.*, case when d.app = 'jobello' then jobello_rappel_frais(d.user_id, d.key, d.kind, d.title, d.body, d.url, d.send_at)
                     else jsonb_build_object('title', d.title, 'body', d.body, 'url', d.url) end r
    from due d where d.send_at > now() - interval '12 hours' -- un rappel trop vieux (serveur arrêté) n'est plus envoyé
  )
  select coalesce(jsonb_agg(jsonb_build_object('key', f.key, 'kind', f.kind, 'title', f.r->>'title', 'body', f.r->>'body', 'url', f.r->>'url',
    'subs', (select coalesce(jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'sub', s.sub)), '[]'::jsonb) from push_subs s
             where s.user_id = f.user_id and s.app = f.app and (f.kind = 'test' or coalesce((s.prefs->>f.kind)::boolean, true)))
  )), '[]'::jsonb) into out
  from frais f where f.r is not null;
  return out;
end $$;
