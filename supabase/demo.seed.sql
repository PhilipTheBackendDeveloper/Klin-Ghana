-- ============================================================================
-- SmartBin Intelligence / KlinGhana — Production Database Seed Data
-- ============================================================================

-- 1. Bins
INSERT INTO public.bins (id, code, name, category, capacity_liters, latitude, longitude, address, city, zone) VALUES
('b0000000-0000-0000-0000-000000000024', 'SB-024', 'Central Market', 'plastic', 240, 5.5560, -0.1818, 'Central Market · Accra East / Zone 2', 'Accra', 'Accra East / Zone 2'),
('b0000000-0000-0000-0000-000000000091', 'SB-091', 'Ridge Park', 'organic', 240, 5.5800, -0.1750, 'Ridge Residential · Giffard Rd', 'Accra', 'Accra East / Zone 1'),
('b0000000-0000-0000-0000-000000000107', 'SB-107', 'Osu Oxford St', 'paper', 120, 5.5530, -0.1820, 'Osu Commercial District', 'Accra', 'Accra East / Zone 2'),
('b0000000-0000-0000-0000-000000000043', 'SB-043', 'Airport Rd Hub', 'electronic', 120, 5.6020, -0.1760, 'Airport City · Liberation Rd', 'Accra', 'Accra East / Zone 3'),
('b0000000-0000-0000-0000-000000000018', 'SB-018', 'Legon Gate', 'plastic', 240, 5.6508, -0.1870, 'University of Ghana Main Entrance', 'Accra', 'Accra East / Zone 4'),
('b0000000-0000-0000-0000-000000000066', 'SB-066', 'Nima Market', 'organic', 240, 5.5880, -0.1980, 'Nima Highway · Market Entrance', 'Accra', 'Accra East / Zone 1')
ON CONFLICT (code) DO NOTHING;

-- 2. Devices & Credentials
INSERT INTO public.devices (device_id, bin_id, firmware_version, is_active) VALUES
('SB-024', 'b0000000-0000-0000-0000-000000000024', 'v2.4.1', true),
('SB-091', 'b0000000-0000-0000-0000-000000000091', 'v2.4.1', true),
('SB-107', 'b0000000-0000-0000-0000-000000000107', 'v2.4.1', true),
('SB-043', 'b0000000-0000-0000-0000-000000000043', 'v2.4.1', false),
('SB-018', 'b0000000-0000-0000-0000-000000000018', 'v2.4.1', true),
('SB-066', 'b0000000-0000-0000-0000-000000000066', 'v2.4.1', true)
ON CONFLICT (device_id) DO NOTHING;

-- 3. High-Speed Snapshot: bin_current_state
INSERT INTO public.bin_current_state (bin_id, device_id, fill_percentage, distance_cm, bin_status, lid_state, battery_percentage, wifi_rssi, temperature_c, latitude, longitude, connection_status) VALUES
('b0000000-0000-0000-0000-000000000024', 'SB-024', 101.0, 4.5, 'OVERFLOW', 'CLOSED', 71, -62, 31.0, 5.5560, -0.1818, 'ONLINE'),
('b0000000-0000-0000-0000-000000000091', 'SB-091', 94.0, 8.2, 'CRITICAL', 'CLOSED', 82, -58, 29.0, 5.5800, -0.1750, 'ONLINE'),
('b0000000-0000-0000-0000-000000000107', 'SB-107', 78.0, 22.0, 'WARNING', 'OPEN', 65, -71, 30.0, 5.5530, -0.1820, 'ONLINE'),
('b0000000-0000-0000-0000-000000000043', 'SB-043', 42.0, 58.0, 'OFFLINE', 'CLOSED', 14, -94, 32.0, 5.6020, -0.1760, 'OFFLINE'),
('b0000000-0000-0000-0000-000000000018', 'SB-018', 36.0, 64.0, 'NORMAL', 'CLOSED', 95, -50, 28.0, 5.6508, -0.1870, 'ONLINE'),
('b0000000-0000-0000-0000-000000000066', 'SB-066', 88.0, 12.0, 'WARNING', 'CLOSED', 79, -64, 31.0, 5.5880, -0.1980, 'ONLINE')
ON CONFLICT (bin_id) DO NOTHING;

-- 4. Initial Alerts
INSERT INTO public.alerts (id, bin_id, alert_type, severity, status, message) VALUES
('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000024', 'OVERFLOW', 'CRITICAL', 'OPEN', 'Ultrasonic fill reached 101.2% (Overflow confirmed on sidewalk)'),
('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000091', 'FULL', 'CRITICAL', 'OPEN', 'Fill level crossed 94% threshold at Ridge Park'),
('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000107', 'LID_FAULT', 'WARNING', 'OPEN', 'Lid closing delay 4.8s exceeded 3s nominal baseline'),
('a0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000043', 'DEVICE_OFFLINE', 'WARNING', 'OPEN', 'Heartbeat signal lost for 2 hours')
ON CONFLICT (id) DO NOTHING;

-- 5. Complaints
INSERT INTO public.complaints (id, ticket_number, bin_id, problem_type, description, priority, status, evidence_url, reporter_name, assigned_to) VALUES
('c0000000-0000-0000-0000-000000001042', '#C-1042', 'b0000000-0000-0000-0000-000000000024', 'Overflow', 'Overflowing onto sidewalk with pure water sachets', 'P1', 'RECEIVED', 'https://images.unsplash.com/photo-1530587191325-3db32d826c18', 'Kofi Mensah', 'Kojo Baah'),
('c0000000-0000-0000-0000-000000001041', '#C-1041', 'b0000000-0000-0000-0000-000000000107', 'Lid problem', 'Lid jammed halfway and won''t close', 'P2', 'ASSIGNED', NULL, 'Abena Poku', 'Esi Boateng'),
('c0000000-0000-0000-0000-000000001038', '#C-1038', 'b0000000-0000-0000-0000-000000000091', 'Bin full', 'Full bin capacity reached after lunch rush', 'P3', 'IN_PROGRESS', NULL, 'Kwame Asante', 'Kojo Baah'),
('c0000000-0000-0000-0000-000000001036', '#C-1036', NULL, 'Other', 'Smell around library gate', 'P3', 'RESOLVED', NULL, 'Anonymous', 'Kojo Baah')
ON CONFLICT (ticket_number) DO NOTHING;

-- 6. Collection Run A-17 & Route Manifest
INSERT INTO public.collection_runs (id, route_name, driver_name, vehicle_code, status) VALUES
('r0000000-0000-0000-0000-000000000a17', 'Route A-17', 'Kojo Baah', 'Truck A', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.route_stops (collection_run_id, bin_id, stop_order, scheduled_time, status, stop_reason) VALUES
('r0000000-0000-0000-0000-000000000a17', 'b0000000-0000-0000-0000-000000000024', 1, '14:20:00', 'PENDING', 'Overflow insert'),
('r0000000-0000-0000-0000-000000000a17', 'b0000000-0000-0000-0000-000000000091', 2, '14:45:00', 'PENDING', 'Full bin'),
('r0000000-0000-0000-0000-000000000a17', 'b0000000-0000-0000-0000-000000000107', 3, '15:10:00', 'PENDING', 'Lid fault'),
('r0000000-0000-0000-0000-000000000a17', NULL, 4, '15:30:00', 'PENDING', 'Near full'),
('r0000000-0000-0000-0000-000000000a17', 'b0000000-0000-0000-0000-000000000018', 5, '16:00:00', 'PENDING', 'Normal')
ON CONFLICT (id) DO NOTHING;

-- 7. Educational Waste Segregation Content
INSERT INTO public.education_content (title, category, summary, sorting_instructions, environmental_impact) VALUES
('Pure Water Sachets & PET Bottles', 'plastic', 'Single-use HDPE/LDPE water sachets and beverage bottles.', 'Empty all remaining water, compress the sachet, and place in the Blue Plastic SmartBin.', 'Prevents waterway clogs in the Odaw river and Accra drainage canals.'),
('Food Scraps & Market Produce', 'organic', 'Cassava peels, plantain skins, food leftovers from local markets.', 'Discard free of plastic bags directly into the Green Organic SmartBin for municipal composting.', 'Diverts compostable mass from landfills to organic fertilizer production.'),
('Mobile Batteries & E-Waste', 'electronic', 'Spent lithium-ion phone batteries, electronics, circuit boards.', 'Drop off exclusively in the Red Electronic SmartBin. Do not mix with domestic waste.', 'Prevents heavy metal leaching (lead, cadmium) into urban groundwater tables.')
ON CONFLICT (id) DO NOTHING;

