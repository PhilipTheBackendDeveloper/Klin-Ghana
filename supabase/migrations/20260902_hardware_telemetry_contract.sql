-- KlinGhana SmartBin physical telemetry contract & provisioning migration.
-- Supports SB-024 physical ESP32 + HC-SR04 ultrasonic sensor + NEO-6M GPS.

-- 1. Schema Extensions for Real Hardware Telemetry
alter table public.bins
  alter column latitude drop not null,
  alter column longitude drop not null;

alter table public.telemetry
  add column if not exists raw_distance_cm numeric(6, 2),
  add column if not exists message_id text,
  add column if not exists fill_status varchar(32) default 'UNKNOWN',
  add column if not exists gps_fix boolean not null default false,
  add column if not exists gps_updated_at timestamptz,
  add column if not exists satellites integer,
  add column if not exists location_source varchar(32) not null default 'UNKNOWN',
  add column if not exists message_sequence bigint;

alter table public.bin_current_state
  add column if not exists raw_distance_cm numeric(6, 2),
  add column if not exists message_id text,
  add column if not exists message_sequence bigint,
  add column if not exists satellites integer;

create unique index if not exists idx_telemetry_device_message_id
  on public.telemetry(device_id, message_id)
  where message_id is not null;

create index if not exists idx_telemetry_device_sequence
  on public.telemetry(device_id, message_sequence desc)
  where message_sequence is not null;

-- 2. Provision Physical Bin SB-024
-- Zero dummy coordinates: latitude and longitude are null until physical GPS fix.
insert into public.bins (code, name, category, capacity_liters, latitude, longitude, address, city, zone)
values ('SB-024', 'SmartBin SB-024 (Physical)', 'plastic', 240, null, null, 'Awaiting Physical Deployment', 'Accra', 'Zone 1')
on conflict (code) do update set
  name = excluded.name,
  category = excluded.category,
  capacity_liters = excluded.capacity_liters,
  address = excluded.address,
  city = excluded.city,
  zone = excluded.zone,
  updated_at = now();

insert into public.devices (device_id, bin_id, firmware_version, is_active)
select 'SB-024', id, 'v1.0.0-esp32-core', true
from public.bins
where code = 'SB-024'
on conflict (device_id) do update set
  bin_id = excluded.bin_id,
  firmware_version = excluded.firmware_version,
  is_active = true;

-- Pre-seed SHA-256 device credential for default key 'klinghana_dev_device_key_sb024'
insert into public.device_credentials (device_id, token_hash, created_at)
values ('SB-024', encode(digest('klinghana_dev_device_key_sb024', 'sha256'), 'hex'), now())
on conflict (device_id) do update set
  token_hash = excluded.token_hash;

-- Hardware Capabilities: wifi, fill_sensor, gps are supported; battery & temperature unsupported.
insert into public.device_capabilities (device_id, capability, verification_state, notes)
values
  ('SB-024', 'wifi', 'SOFTWARE_IMPLEMENTED', 'Wi-Fi 802.11 b/g/n active on ESP32.'),
  ('SB-024', 'fill_sensor', 'SOFTWARE_IMPLEMENTED', 'HC-SR04 ultrasonic fill level sensor connected to GPIO 5/18.'),
  ('SB-024', 'gps', 'SOFTWARE_IMPLEMENTED', 'NEO-6M GPS module connected to HardwareSerial(2) GPIO 16/17.'),
  ('SB-024', 'battery', 'BLOCKED_BY_HARDWARE', 'Battery voltage monitoring not present in current hardware iteration.'),
  ('SB-024', 'temperature', 'BLOCKED_BY_HARDWARE', 'Temperature sensor not present in current hardware iteration.')
on conflict (device_id, capability) do update set
  verification_state = excluded.verification_state,
  notes = excluded.notes,
  updated_at = now();

-- Initial Current State: OFFLINE, 0% fill, null GPS coordinates
insert into public.bin_current_state (
  bin_id,
  device_id,
  fill_percentage,
  distance_cm,
  raw_distance_cm,
  fill_status,
  bin_status,
  lid_state,
  battery_percentage,
  wifi_rssi,
  temperature_c,
  latitude,
  longitude,
  gps_fix,
  gps_accuracy_m,
  satellites,
  location_source,
  connection_status,
  firmware_version,
  last_seen_at,
  telemetry_received_at,
  updated_at
)
select
  id,
  'SB-024',
  0,
  100,
  100,
  'UNKNOWN',
  'OFFLINE',
  'CLOSED',
  null,
  null,
  null,
  null,
  null,
  false,
  null,
  null,
  'UNKNOWN',
  'OFFLINE',
  'v1.0.0-esp32-core',
  now(),
  now(),
  now()
from public.bins
where code = 'SB-024'
on conflict (bin_id) do nothing;

-- 3. Configure Realtime Publication for all required tables
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bin_current_state') then
      alter publication supabase_realtime add table public.bin_current_state;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'alerts') then
      alter publication supabase_realtime add table public.alerts;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'complaints') then
      alter publication supabase_realtime add table public.complaints;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
      alter publication supabase_realtime add table public.notifications;
    end if;
  end if;
end $$;
