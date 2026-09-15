-- Kjør denne én gang i Supabase Studio (supabase.atkins.nu) → SQL Editor.
-- Tidsserie-tabell for graf-historikk (24t), i motsetning til device_status
-- som kun holder siste verdi. Pollere setter inn en ny rad hver kjøring
-- (upsert brukes ikke her — vi vil beholde historikken).

create table if not exists public.device_metrics (
  id bigint generated always as identity primary key,
  device_id text not null,
  watts numeric,
  kwh_today numeric,
  recorded_at timestamptz not null default now()
);

create index if not exists device_metrics_device_id_recorded_at_idx
  on public.device_metrics (device_id, recorded_at desc);

alter table public.device_metrics enable row level security;

-- Offentlig lesetilgang (nettsiden henter siste 24t med anon-nøkkelen).
create policy "Public read access" on public.device_metrics
  for select
  to anon
  using (true);

-- Ingen insert/update/delete-policy for anon: pollerscriptet skriver med
-- service_role-nøkkelen, som omgår RLS.

-- Valgfritt vedlikehold: slett rader eldre enn f.eks. 30 dager for å holde
-- tabellen liten. Kjør manuelt eller sett opp som pg_cron-jobb ved behov:
-- delete from public.device_metrics where recorded_at < now() - interval '30 days';
