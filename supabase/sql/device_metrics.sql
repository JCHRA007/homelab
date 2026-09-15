-- Kjør denne i Supabase Studio (supabase.atkins.nu) → SQL Editor.
-- Erstatter en tidligere versjon av device_metrics som var spesifikk for
-- strøm (watts/kwh_today) med en generisk metrikk-logg (metric + value),
-- slik at UPS og Homey-ene (temperatur, minne, batteri, last) kan bruke
-- samme tabell som strømkortene. Trygt å kjøre på nytt siden funksjonen
-- er splitter ny og ingen historikk er verdt å bevare ennå.

drop table if exists public.device_metrics;

create table public.device_metrics (
  id bigint generated always as identity primary key,
  device_id text not null,
  metric text not null,
  value numeric,
  recorded_at timestamptz not null default now()
);

create index device_metrics_device_metric_recorded_at_idx
  on public.device_metrics (device_id, metric, recorded_at desc);

alter table public.device_metrics enable row level security;

-- Offentlig lesetilgang (nettsiden henter siste 24t med anon-nøkkelen).
create policy "Public read access" on public.device_metrics
  for select
  to anon
  using (true);

-- Ingen insert/update/delete-policy for anon: pollerscriptene skriver med
-- service_role-nøkkelen, som omgår RLS.

-- Valgfritt vedlikehold: slett rader eldre enn f.eks. 30 dager for å holde
-- tabellen liten. Kjør manuelt eller sett opp som pg_cron-jobb ved behov:
-- delete from public.device_metrics where recorded_at < now() - interval '30 days';
