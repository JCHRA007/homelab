-- Kjør denne én gang i Supabase Studio (supabase.atkins.nu) → SQL Editor.
-- Lager en tabell som en liten poller i hjemmenettverket skriver status til,
-- og som det offentlige nettstedet (lab5235.no) leser fra med anon-nøkkelen.

create table if not exists public.device_status (
  device_id text primary key,
  status text not null,
  battery_charge int,
  battery_runtime int,
  load_percent int,
  input_voltage numeric,
  raw jsonb,
  updated_at timestamptz not null default now()
);

alter table public.device_status enable row level security;

-- Offentlig lesetilgang (siden bruker anon-nøkkelen for å vise status).
create policy "Public read access" on public.device_status
  for select
  to anon
  using (true);

-- Ingen insert/update/delete-policy for anon eller authenticated:
-- pollerscriptet skriver med service_role-nøkkelen, som omgår RLS.

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists device_status_set_updated_at on public.device_status;
create trigger device_status_set_updated_at
  before update on public.device_status
  for each row execute function public.set_updated_at();
