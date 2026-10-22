create extension if not exists pgcrypto;

create table if not exists public.mechanics (
  id text primary key,
  name text not null,
  phone text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  service_type text not null,
  issue_description text not null,
  notes text,
  photo_paths text[] not null default '{}',
  arrival_code text not null default lpad((floor(random() * 9000) + 1000)::text, 4, '0'),
  location_label text not null,
  location_source text not null default 'gps' check (location_source in ('gps', 'manual_pin')),
  latitude double precision,
  longitude double precision,
  is_scheduled boolean not null default false,
  scheduled_at timestamptz,
  status text not null default 'new' check (status in ('new', 'reviewed', 'callback_confirmed', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show')),
  assigned_mechanic_id text references public.mechanics(id) on delete set null,
  callback_confirmed_at timestamptz,
  callback_note text,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_requests_latitude_valid check (latitude is null or latitude between -90 and 90),
  constraint service_requests_longitude_valid check (longitude is null or longitude between -180 and 180)
);

-- Safe migrations for existing tables (idempotent — safe to rerun)
alter table public.service_requests drop constraint if exists service_requests_status_check;
alter table public.service_requests
  add constraint service_requests_status_check
  check (status in ('new', 'reviewed', 'callback_confirmed', 'assigned', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'));

alter table public.service_requests add column if not exists arrival_code text;
update public.service_requests set arrival_code = lpad((floor(random() * 9000) + 1000)::text, 4, '0') where arrival_code is null;
alter table public.service_requests alter column arrival_code set default lpad((floor(random() * 9000) + 1000)::text, 4, '0');
alter table public.service_requests alter column arrival_code set not null;

alter table public.service_requests add column if not exists location_source text not null default 'gps';
alter table public.service_requests drop constraint if exists service_requests_location_source_check;
alter table public.service_requests
  add constraint service_requests_location_source_check check (location_source in ('gps', 'manual_pin'));

alter table public.service_requests add column if not exists is_scheduled boolean not null default false;
alter table public.service_requests add column if not exists scheduled_at timestamptz;
alter table public.service_requests add column if not exists callback_confirmed_at timestamptz;
alter table public.service_requests add column if not exists callback_note text;

create index if not exists service_requests_queue_idx on public.service_requests (status, created_at desc);
create index if not exists service_requests_mechanic_idx on public.service_requests (assigned_mechanic_id, created_at desc);
create index if not exists service_requests_phone_idx on public.service_requests (customer_phone, created_at desc);
create index if not exists service_requests_scheduled_idx on public.service_requests (is_scheduled, scheduled_at asc) where is_scheduled = true;

alter table public.mechanics enable row level security;
alter table public.service_requests enable row level security;

insert into public.mechanics (id, name, phone, active)
values ('mechanic-puff-daddy', 'Puff Daddy', '0200 000 000', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('request-photos', 'request-photos', false)
on conflict (id) do nothing;
