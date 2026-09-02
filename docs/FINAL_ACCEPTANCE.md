# Final Acceptance & Release-Candidate Evidence

This document records the final acceptance test results for KlinGhana SmartBin release candidate.

## Acceptance Matrix

| Subsystem / Category | Status | Evidence & Verification Notes |
|---|---|---|
| **WEB APP** | **PASS** | Vite + React + Tailwind + Vanilla CSS builds cleanly (`npm run build`, exit 0, 3200 modules transformed, 0 bundle errors). Responsive layout verified across all admin and citizen routes. |
| **AUTH** | **PASS** | Authenticated login with Supabase auth (`signInWithPassword`), role-based routing (admin vs citizen), and real session sign-out (`supabase.auth.signOut()`) that clears all local state on logout. |
| **CLICK AUDIT** | **PASS** | Complete click audit recorded in `docs/CLICK_AUDIT.md`. Every navigation link, search bar, theme toggle, notification popover, alert resolution, complaint assignment, and report export is fully functional. |
| **NO DUMMY DATA** | **PASS** | `npm run audit:production-data` exited 0. Zero demo fleet fixtures, zero hardcoded KPIs (`96.8%`, `4`, `6`, `3`, `81%`), and zero static coordinates in production source. Recorded in `docs/FINAL_DUMMY_DATA_AUDIT.md`. |
| **SUPABASE** | **PASS** | Remote project `ufnwwgilqxvjrzrmydes` (`https://ufnwwgilqxvjrzrmydes.supabase.co`) online and responsive. Consolidated migration `20260902_hardware_telemetry_contract.sql` provisions all 9 production tables. |
| **REALTIME** | **PASS** | Realtime publication enabled for `bin_current_state`, `alerts`, `complaints`, `notifications`. WebSocket listener active in `SystemDiagnosticsView` and `SmartBinContext`. |
| **HOSTED IOT API** | **PASS** | Real serverless/backend endpoint under `POST /api/iot/telemetry` and `GET /api/health`. Supported natively on Vercel (`api/iot/telemetry.ts`, `api/health.ts`) and Vite dev server (`iotApiPlugin`). Section 14 contract enforced. |
| **SIMULATOR → HOSTED API** | **PASS** | Acceptance sequence test (`npx tsx scripts/verify-cloud-simulator.ts`) passed 5/5 steps against `/api/iot/telemetry`: 40 (NORMAL) $\rightarrow$ 88 (NEAR_FULL) $\rightarrow$ 96 (FULL) $\rightarrow$ 102 (OVERFLOW) $\rightarrow$ 8 (NORMAL). |
| **ULTRASONIC** | **SOFTWARE_READY** | 5-sample median filter, raw distance extraction, empty/full distance calibration formula, and threshold hysteresis implemented in `main.cpp`. *(Pending physical ruler container measurement for PHYSICAL_VERIFIED)*. |
| **GPS** | **SOFTWARE_READY** | TinyGPSPlus UART parsing (GPIO 16/17 @ 9600 baud) implemented. Strict nullification when `gpsFix=false` (no fake coordinates). Leaflet map recenters smoothly without page refresh. *(Pending physical satellite lock for PHYSICAL_VERIFIED)*. |
| **ESP32** | **SOFTWARE_READY** | Complete hardened firmware in `firmware/esp32-smartbin/src/main.cpp`. Startup self-test banners (`[KLANGHANA]`, `[CONFIG]`, `[WIFI]`, `[FILL]`, `[GPS]`, `[CLOUD]`), centralized `WEB_APP_BASE_URL`, zero secrets in Serial logs. *(Pending user Serial Monitor evidence for PHYSICAL_VERIFIED)*. |
| **MAP** | **PASS** | OpenStreetMap / Leaflet map renders only bins with confirmed `gpsFix` and non-zero coordinates. Displays `"Awaiting GPS fix"` when GPS is unacquired. Marker selection selects active bin. |
| **ALERTS** | **PASS** | Real alerts generated when fill $\ge$ 95% (`FULL`) or $\ge$ 100% (`OVERFLOW`), auto-resolved on collection (<85%). Acknowledge, assign technician, and resolve actions persist to Supabase. |
| **COMPLAINTS** | **PASS** | Citizen reporting persists to `complaints` table. Admin Complaints Workbench allows ticket review, technician assignment, and resolution. Citizen view displays live 4-step timeline. Empty state displayed when 0 complaints. |
| **ROUTES** | **PASS** | Collection routes and stops queried from `route_stops` and `collections` tables. Stops can be marked arrived, collected, or skipped. Refresh retains state. |
| **ANALYTICS** | **PASS** | Dynamic fill trends, category distribution, and incident counts calculated from actual historical database rows. Zero fake manufactured chart series. |
| **REPORTS** | **PASS** | Real CSV generation (`csvGenerator.ts`) and PDF canvas reports (`pdfGenerator.ts`) with live database metrics. Download buttons trigger browser file downloads. |
| **AI** | **PASS** | AI Assistant (`ChatBotAiView.tsx` and `AiAssistant.tsx`) answers queries using real database context (e.g. SB-024 current state, fill percentage, location, status). Does not invent fake 101% states. |
