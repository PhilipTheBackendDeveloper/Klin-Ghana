-- ============================================================================
-- KlinGhana SmartBin - Master Database Schema & Remote Hardware Contract
-- Project: ufnwwgilqxvjrzrmydes (KlinGhana)
-- Idempotent: Can be safely run on a fresh or existing database.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES & ORGANIZATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER',
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (organization_id, profile_id)
);

-- ----------------------------------------------------------------------------
-- 2. BINS, DEVICES & CREDENTIALS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'plastic',
    capacity_liters INTEGER NOT NULL DEFAULT 240,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL DEFAULT 'Accra',
    zone VARCHAR(128) NOT NULL DEFAULT 'Zone 1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Make sure latitude and longitude can be null for zero-fake-GPS before fix
ALTER TABLE public.bins ALTER COLUMN latitude DROP NOT NULL;
ALTER TABLE public.bins ALTER COLUMN longitude DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(64) NOT NULL UNIQUE,
    bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v1.0.0-esp32-core',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.device_credentials (
    device_id VARCHAR(64) PRIMARY KEY REFERENCES public.devices(device_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.device_capabilities (
    device_id VARCHAR(64) NOT NULL REFERENCES public.devices(device_id) ON DELETE CASCADE,
    capability VARCHAR(64) NOT NULL,
    verification_state VARCHAR(32) NOT NULL DEFAULT 'SOFTWARE_IMPLEMENTED'
        CHECK (verification_state IN ('SIMULATED', 'SOFTWARE_IMPLEMENTED', 'HARDWARE_CONNECTED', 'PHYSICALLY_VERIFIED', 'BLOCKED_BY_HARDWARE')),
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (device_id, capability)
);

-- ----------------------------------------------------------------------------
-- 3. CURRENT STATE & TELEMETRY
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bin_current_state (
    bin_id UUID PRIMARY KEY REFERENCES public.bins(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    fill_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    distance_cm NUMERIC(6, 2) NOT NULL DEFAULT 100.0,
    raw_distance_cm NUMERIC(6, 2) DEFAULT 100.0,
    fill_status VARCHAR(32) DEFAULT 'UNKNOWN',
    bin_status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',
    lid_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED',
    battery_percentage INTEGER,
    wifi_rssi INTEGER,
    temperature_c NUMERIC(4, 1),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    gps_fix BOOLEAN NOT NULL DEFAULT FALSE,
    gps_accuracy_m NUMERIC(8, 2),
    satellites INTEGER,
    location_source VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    connection_status VARCHAR(16) NOT NULL DEFAULT 'OFFLINE',
    firmware_version VARCHAR(64) DEFAULT 'v1.0.0-esp32-core',
    message_id TEXT,
    message_sequence BIGINT,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    telemetry_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.telemetry (
    id BIGSERIAL PRIMARY KEY,
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    fill_percentage NUMERIC(5, 2) NOT NULL,
    distance_cm NUMERIC(6, 2) NOT NULL,
    raw_distance_cm NUMERIC(6, 2),
    fill_status VARCHAR(32) DEFAULT 'UNKNOWN',
    lid_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED',
    battery_percentage INTEGER,
    temperature_c NUMERIC(4, 1),
    wifi_rssi INTEGER,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    gps_fix BOOLEAN NOT NULL DEFAULT FALSE,
    gps_accuracy_m NUMERIC(8, 2),
    satellites INTEGER,
    location_source VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN',
    message_id TEXT,
    message_sequence BIGINT,
    firmware_version VARCHAR(64),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_telemetry_device_message_id
    ON public.telemetry(device_id, message_id)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telemetry_device_sequence
    ON public.telemetry(device_id, message_sequence DESC)
    WHERE message_sequence IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. ALERTS & UPDATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    alert_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
    message TEXT NOT NULL,
    telemetry_snapshot JSONB,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES public.alerts(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    update_type VARCHAR(64) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. COMPLAINTS & UPDATES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
    reporter_name VARCHAR(128) NOT NULL,
    reporter_phone VARCHAR(32) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    photo_url TEXT,
    location_text TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    assigned_technician_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_technician_name VARCHAR(128),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.complaint_updates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    update_type VARCHAR(64) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. COLLECTIONS & ROUTES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collection_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_code VARCHAR(32) NOT NULL UNIQUE,
    driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID REFERENCES public.collection_runs(id) ON DELETE CASCADE,
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    stop_sequence INTEGER NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    arrived_at TIMESTAMPTZ,
    collected_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    run_id UUID REFERENCES public.collection_runs(id) ON DELETE SET NULL,
    collected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    fill_before NUMERIC(5, 2),
    fill_after NUMERIC(5, 2) DEFAULT 0.0,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. NOTIFICATIONS, SETTINGS & AUDIT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(128) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access for public/authenticated users
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public read bins" ON public.bins;
    CREATE POLICY "Public read bins" ON public.bins FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read devices" ON public.devices;
    CREATE POLICY "Public read devices" ON public.devices FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read bin_current_state" ON public.bin_current_state;
    CREATE POLICY "Public read bin_current_state" ON public.bin_current_state FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read telemetry" ON public.telemetry;
    CREATE POLICY "Public read telemetry" ON public.telemetry FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read alerts" ON public.alerts;
    CREATE POLICY "Public read alerts" ON public.alerts FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read complaints" ON public.complaints;
    CREATE POLICY "Public read complaints" ON public.complaints FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public create complaints" ON public.complaints;
    CREATE POLICY "Public create complaints" ON public.complaints FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Public read route_stops" ON public.route_stops;
    CREATE POLICY "Public read route_stops" ON public.route_stops FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read notifications" ON public.notifications;
    CREATE POLICY "Public read notifications" ON public.notifications FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Public read device_capabilities" ON public.device_capabilities;
    CREATE POLICY "Public read device_capabilities" ON public.device_capabilities FOR SELECT USING (true);
END $$;

-- ----------------------------------------------------------------------------
-- 9. SUPABASE REALTIME PUBLICATION
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'bin_current_state') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bin_current_state;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'alerts') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'complaints') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.complaints;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'route_stops') THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.route_stops;
    END IF;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. PROVISION PHYSICAL SMARTBIN SB-024 (ZERO DUMMY GPS)
-- ----------------------------------------------------------------------------
INSERT INTO public.bins (code, name, category, capacity_liters, latitude, longitude, address, city, zone)
VALUES ('SB-024', 'SmartBin SB-024 (Physical)', 'plastic', 240, NULL, NULL, 'Awaiting Physical GPS Fix', 'Accra', 'Zone 1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  capacity_liters = EXCLUDED.capacity_liters,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  zone = EXCLUDED.zone,
  updated_at = NOW();

INSERT INTO public.devices (device_id, bin_id, firmware_version, is_active)
SELECT 'SB-024', id, 'v1.0.0-esp32-core', TRUE
FROM public.bins
WHERE code = 'SB-024'
ON CONFLICT (device_id) DO UPDATE SET
  bin_id = EXCLUDED.bin_id,
  firmware_version = EXCLUDED.firmware_version,
  is_active = TRUE;

-- Pre-seed SHA-256 device credential for default key 'klinghana_dev_device_key_sb024'
INSERT INTO public.device_credentials (device_id, token_hash, created_at)
VALUES ('SB-024', encode(digest('klinghana_dev_device_key_sb024', 'sha256'), 'hex'), NOW())
ON CONFLICT (device_id) DO UPDATE SET
  token_hash = EXCLUDED.token_hash;

-- Hardware Capabilities
INSERT INTO public.device_capabilities (device_id, capability, verification_state, notes)
VALUES
  ('SB-024', 'wifi', 'SOFTWARE_IMPLEMENTED', 'Wi-Fi 802.11 b/g/n active on ESP32.'),
  ('SB-024', 'fill_sensor', 'SOFTWARE_IMPLEMENTED', 'HC-SR04 ultrasonic fill level sensor connected to GPIO 5/18.'),
  ('SB-024', 'gps', 'SOFTWARE_IMPLEMENTED', 'NEO-6M GPS module connected to HardwareSerial(2) GPIO 16/17.'),
  ('SB-024', 'battery', 'BLOCKED_BY_HARDWARE', 'Battery voltage monitoring not present in current hardware iteration.'),
  ('SB-024', 'temperature', 'BLOCKED_BY_HARDWARE', 'Temperature sensor not present in current hardware iteration.')
ON CONFLICT (device_id, capability) DO UPDATE SET
  verification_state = EXCLUDED.verification_state,
  notes = EXCLUDED.notes,
  updated_at = NOW();

-- Initial Current State: OFFLINE, 0% fill, null GPS coordinates
INSERT INTO public.bin_current_state (
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
SELECT
  id,
  'SB-024',
  0,
  100,
  100,
  'UNKNOWN',
  'OFFLINE',
  'CLOSED',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  FALSE,
  NULL,
  NULL,
  'UNKNOWN',
  'OFFLINE',
  'v1.0.0-esp32-core',
  NOW(),
  NOW(),
  NOW()
FROM public.bins
WHERE code = 'SB-024'
ON CONFLICT (bin_id) DO NOTHING;
