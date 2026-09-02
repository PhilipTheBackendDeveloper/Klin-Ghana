-- KlinGhana SmartBin core completion migration
-- Adds missing operational tables and honest sensor/current-state fields.

create extension if not exists "uuid-ossp";

alter table public.bin_current_state
  add column if not exists fill_status varchar(32) default 'UNKNOWN',
  add column if not exists gps_fix boolean not null default false,
  add column if not exists gps_updated_at timestamptz,
  add column if not exists location_source varchar(32) not null default 'UNKNOWN',
  add column if not exists firmware_version varchar(64),
  add column if not exists last_message_sequence bigint;

alter table public.bin_current_state
  alter column battery_percentage drop not null,
  alter column temperature_c drop not null,
  alter column wifi_rssi drop not null,
  alter column gps_accuracy_m drop default;

alter table public.telemetry
  add column if not exists gps_accuracy_m numeric(8, 2),
  add column if not exists message_sequence bigint,
  add column if not exists firmware_version varchar(64);

alter table public.telemetry
  alter column battery_percentage drop not null,
  alter column temperature_c drop not null,
  alter column wifi_rssi drop not null;

create table if not exists public.device_capabilities (
  device_id varchar(64) not null references public.devices(device_id) on delete cascade,
  capability varchar(64) not null,
  verification_state varchar(32) not null default 'SOFTWARE_IMPLEMENTED'
    check (verification_state in ('SIMULATED', 'SOFTWARE_IMPLEMENTED', 'HARDWARE_CONNECTED', 'PHYSICALLY_VERIFIED', 'BLOCKED_BY_HARDWARE')),
  notes text,
  updated_at timestamptz not null default now(),
  primary key (device_id, capability)
);

create table if not exists public.device_events (
  id uuid primary key default uuid_generate_v4(),
  device_id varchar(64) not null,
  event_type varchar(64) not null,
  severity varchar(16) not null default 'INFO',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.device_commands (
  id uuid primary key default uuid_generate_v4(),
  device_id varchar(64) not null,
  command_type varchar(64) not null,
  payload jsonb not null default '{}'::jsonb,
  status varchar(32) not null default 'PENDING',
  requested_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now(),
  constraint no_remote_lid_open check (command_type <> 'OPEN_LID')
);

create table if not exists public.device_command_acks (
  id uuid primary key default uuid_generate_v4(),
  command_id uuid not null references public.device_commands(id) on delete cascade,
  device_id varchar(64) not null,
  ack_status varchar(32) not null,
  message text,
  received_at timestamptz not null default now()
);

create table if not exists public.alert_updates (
  id uuid primary key default uuid_generate_v4(),
  alert_id uuid not null references public.alerts(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  update_type varchar(64) not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.complaint_updates (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  update_type varchar(64) not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.complaint_media (
  id uuid primary key default uuid_generate_v4(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  storage_path text not null,
  content_type varchar(128) not null,
  size_bytes integer not null check (size_bytes <= 10485760),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.summon_requests (
  id uuid primary key default uuid_generate_v4(),
  bin_id uuid references public.bins(id) on delete set null,
  requested_by uuid references public.profiles(id) on delete set null,
  status varchar(32) not null default 'REQUESTED',
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.navigation_events (
  id uuid primary key default uuid_generate_v4(),
  bin_id uuid references public.bins(id) on delete set null,
  event_type varchar(64) not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.classification_events (
  id uuid primary key default uuid_generate_v4(),
  bin_id uuid references public.bins(id) on delete set null,
  predicted_category varchar(64),
  approved boolean not null default false,
  confidence numeric(5, 4),
  verification_state varchar(32) not null default 'SIMULATED',
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete cascade,
  token text not null unique,
  platform varchar(32) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null default 'SmartBin assistant conversation',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role varchar(16) not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  grounded_entities jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default uuid_generate_v4(),
  report_type varchar(64) not null,
  title text not null,
  storage_path text,
  generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.report_jobs (
  id uuid primary key default uuid_generate_v4(),
  report_type varchar(64) not null,
  status varchar(32) not null default 'QUEUED',
  params jsonb not null default '{}'::jsonb,
  result_report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_bin_current_state_device on public.bin_current_state(device_id);
create index if not exists idx_device_events_device_time on public.device_events(device_id, created_at desc);
create index if not exists idx_device_commands_device_status on public.device_commands(device_id, status);
create index if not exists idx_complaints_status_priority on public.complaints(status, priority);
create index if not exists idx_route_stops_run_order on public.route_stops(collection_run_id, stop_order);

alter table public.device_capabilities enable row level security;
alter table public.device_events enable row level security;
alter table public.device_commands enable row level security;
alter table public.device_command_acks enable row level security;
alter table public.alert_updates enable row level security;
alter table public.complaint_updates enable row level security;
alter table public.complaint_media enable row level security;
alter table public.summon_requests enable row level security;
alter table public.navigation_events enable row level security;
alter table public.classification_events enable row level security;
alter table public.push_tokens enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.reports enable row level security;
alter table public.report_jobs enable row level security;

create policy "Public read device capabilities" on public.device_capabilities for select using (true);

-- Operation mutations require an admin role stored in auth.users app_metadata.role.
-- Do not base authorization on user_metadata; users can edit it themselves.

create policy "Public read device events" on public.device_events for select using (true);
create policy "Public read route reports" on public.reports for select using (true);
create policy "Admin manage operations commands" on public.device_commands for all to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR')))) with check (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));
create policy "Admin read command acks" on public.device_command_acks for select to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));
create policy "Admin manage alert updates" on public.alert_updates for all to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR')))) with check (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));
create policy "Public insert complaint media" on public.complaint_media for insert with check (true);
create policy "Public read complaint media" on public.complaint_media for select using (true);
create policy "Public insert summon requests" on public.summon_requests for insert with check (true);
create policy "Admin read navigation events" on public.navigation_events for select to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));
create policy "Admin read classification events" on public.classification_events for select to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));
create policy "Users manage own push tokens" on public.push_tokens for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Authenticated manage ai conversations" on public.ai_conversations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Authenticated manage own ai messages" on public.ai_messages for all to authenticated using (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid()))) with check (exists (select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));
create policy "Admin manage report jobs" on public.report_jobs for all to authenticated using (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR')))) with check (((coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('SUPER_ADMIN', 'OPERATIONS', 'COLLECTOR'))));

