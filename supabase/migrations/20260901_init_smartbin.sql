-- ============================================================================
-- SmartBin Intelligence / KlinGhana — Full Database Schema
-- Target: PostgreSQL 15+ / Supabase
-- Features: RLS, RBAC, High-Speed Snapshots, Time-Series Telemetry, Alerting
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles & Organizations (RBAC)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'USER', -- SUPER_ADMIN, OPERATIONS, COLLECTOR, ANALYST, VIEWER, USER
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

-- 2. Bins, Devices & Device Credentials
CREATE TABLE IF NOT EXISTS public.bins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'plastic', -- general, plastic, organic, paper, electronic, glass
    capacity_liters INTEGER NOT NULL DEFAULT 120,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(128) NOT NULL DEFAULT 'Accra',
    zone VARCHAR(128) NOT NULL DEFAULT 'Urban Zone',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. SB-024
    bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
    firmware_version VARCHAR(32) NOT NULL DEFAULT 'v2.4.1',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.device_credentials (
    device_id VARCHAR(64) PRIMARY KEY REFERENCES public.devices(device_id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL, -- SHA-256 hashed ingestion key
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- 3. High-Speed Snapshot: bin_current_state (Fast Dashboard Read)
CREATE TABLE IF NOT EXISTS public.bin_current_state (
    bin_id UUID PRIMARY KEY REFERENCES public.bins(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    fill_percentage NUMERIC(5, 2) NOT NULL DEFAULT 0.0,
    distance_cm NUMERIC(6, 2) NOT NULL DEFAULT 100.0,
    bin_status VARCHAR(32) NOT NULL DEFAULT 'NORMAL', -- NORMAL, FILLING, NEAR_FULL, FULL, OVERFLOW, OFFLINE, FAULT
    lid_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED',
    battery_percentage INTEGER NOT NULL DEFAULT 100,
    wifi_rssi INTEGER NOT NULL DEFAULT -60,
    temperature_c NUMERIC(4, 1) NOT NULL DEFAULT 28.0,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    gps_accuracy_m NUMERIC(4, 1) DEFAULT 5.0,
    connection_status VARCHAR(16) NOT NULL DEFAULT 'ONLINE',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    telemetry_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Time-Series Telemetry Table
CREATE TABLE IF NOT EXISTS public.telemetry (
    id BIGSERIAL PRIMARY KEY,
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    device_id VARCHAR(64) NOT NULL,
    fill_percentage NUMERIC(5, 2) NOT NULL,
    distance_cm NUMERIC(6, 2) NOT NULL,
    lid_state VARCHAR(16) NOT NULL DEFAULT 'CLOSED',
    battery_percentage INTEGER NOT NULL,
    temperature_c NUMERIC(4, 1) NOT NULL,
    wifi_rssi INTEGER NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_bin_time ON public.telemetry(bin_id, recorded_at DESC);

-- 5. Alerts & Deduplicated Alert Updates
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    alert_type VARCHAR(64) NOT NULL, -- FULL, OVERFLOW, DEVICE_OFFLINE, LOW_BATTERY, LID_FAULT, SENSOR_FAULT
    severity VARCHAR(16) NOT NULL DEFAULT 'WARNING', -- CRITICAL, WARNING, INFO
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- OPEN, ACKNOWLEDGED, ASSIGNED, RESOLVED, CLOSED
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alerts_status ON public.alerts(status);

-- 6. Complaints, Media & Resolution Updates
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(64) NOT NULL UNIQUE, -- e.g. #C-1042
    bin_id UUID REFERENCES public.bins(id) ON DELETE SET NULL,
    problem_type VARCHAR(64) NOT NULL, -- Bin full, Overflow, Lid problem, Sensor issue, Other
    description TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'Standard', -- Standard, Urgent
    status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED', -- RECEIVED, ASSIGNED, IN_PROGRESS, RESOLVED, CLOSED
    evidence_url TEXT,
    reporter_name VARCHAR(128) NOT NULL,
    reporter_contact VARCHAR(128),
    assigned_to VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Collections & Route Manifests
CREATE TABLE IF NOT EXISTS public.collection_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_name VARCHAR(64) NOT NULL DEFAULT 'Route A-17',
    driver_name VARCHAR(128) NOT NULL DEFAULT 'Kojo Baah',
    vehicle_code VARCHAR(32) NOT NULL DEFAULT 'Truck A',
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- PLANNED, ACTIVE, COMPLETED, CANCELLED
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.route_stops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    collection_run_id UUID REFERENCES public.collection_runs(id) ON DELETE CASCADE,
    bin_id UUID REFERENCES public.bins(id) ON DELETE CASCADE,
    stop_order INTEGER NOT NULL,
    scheduled_time TIME NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, ARRIVED, COLLECTED, SKIPPED
    stop_reason VARCHAR(64) DEFAULT 'Regular',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bin_id UUID NOT NULL REFERENCES public.bins(id) ON DELETE CASCADE,
    fill_level_before NUMERIC(5, 2) NOT NULL,
    weight_collected_kg NUMERIC(6, 2) NOT NULL,
    collector_name VARCHAR(128) NOT NULL,
    zone VARCHAR(128) NOT NULL,
    collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Notifications & Push Tokens
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Educational Waste Content & AI RAG Knowledge
CREATE TABLE IF NOT EXISTS public.education_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    category VARCHAR(64) NOT NULL, -- plastic, organic, paper, ewaste, general
    summary TEXT NOT NULL,
    sorting_instructions TEXT NOT NULL,
    environmental_impact TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. System Settings & Audit Logs
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(64) NOT NULL,
    target_resource VARCHAR(64) NOT NULL,
    payload JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bin_current_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Public & Authenticated RLS Policies
CREATE POLICY "Public read bins" ON public.bins FOR SELECT USING (true);
CREATE POLICY "Public read bin_current_state" ON public.bin_current_state FOR SELECT USING (true);
CREATE POLICY "Public read alerts" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Public read collections" ON public.collections FOR SELECT USING (true);
CREATE POLICY "Public read education" ON public.education_content FOR SELECT USING (true);
CREATE POLICY "Public insert complaints" ON public.complaints FOR INSERT WITH CHECK (true);
CREATE POLICY "Public select complaints" ON public.complaints FOR SELECT USING (true);
