-- Jobello : à coller une fois dans Supabase, SQL Editor, puis « Run ».
create table if not exists public.docs (
  owner uuid not null default auth.uid() references auth.users on delete cascade,
  path text not null,
  col text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (owner, path)
);
create index if not exists docs_owner_col on public.docs (owner, col);
alter table public.docs enable row level security;
drop policy if exists "chacun ses donnees" on public.docs;
create policy "chacun ses donnees" on public.docs for all
  using (owner = auth.uid()) with check (owner = auth.uid());
alter publication supabase_realtime add table public.docs;

insert into storage.buckets (id, name, public) values ('fichiers', 'fichiers', false)
  on conflict (id) do nothing;
drop policy if exists "chacun ses fichiers" on storage.objects;
create policy "chacun ses fichiers" on storage.objects for all
  using (bucket_id = 'fichiers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'fichiers' and (storage.foldername(name))[1] = auth.uid()::text);
