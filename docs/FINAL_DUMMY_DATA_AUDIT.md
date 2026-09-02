# Final Production Dummy Data Audit

This audit documents every legacy fixture, mock value, or sample data item evaluated and removed or isolated prior to production deployment.

## Audit Matrix

| File | Value | Why it existed | Production source | Removed? | Allowed only in test? |
|---|---|---|---|---|---|
| `src/data/initialBins.ts` | `SB-091, SB-107, SB-043, SB-018, SB-066` | Demo fleet in early UI prototyping | Deleted file completely. Replaced by live Supabase query on `public.bins`. | **YES** | NO (tests use programmatic schema factories) |
| `src/context/SmartBinContext.tsx` | `INITIAL_BINS` | Fallback fleet array when Supabase had 0 rows | Supabase `bins` + `bin_current_state` join. Returns `[]` when 0 bins exist. | **YES** | NO |
| `src/context/SmartBinContext.tsx` | `DEMO_ALERTS` (`alt-demo-1`, Central Market) | Initial demo alert card | Supabase `alerts` table query + Realtime subscription. | **YES** | NO |
| `src/context/SmartBinContext.tsx` | `DEMO_REPORTS` (`C-DEMO-1042`, Central Market Hub) | Initial citizen complaint card | Supabase `complaints` table query + Realtime subscription. | **YES** | NO |
| `src/components/citizen/UserComplaintsView.tsx` | `#C–1028 · Lid problem · Osu Station` | Static Figma node 98:706 layout | Live `citizenReports` from `useSmartBin()`. Renders clean empty state when 0 reports. | **YES** | NO |
| `src/components/admin/OperationsCommandCenter.tsx` | Static coordinates `{ x: 91, y: 133 }` etc. | Visual map markers over Figma static image | Filtered strictly to `gpsFix && lat !== 0 && lng !== 0`. Shows `"Awaiting GPS fix"` when GPS unacquired. | **YES** | NO |
| `src/components/admin/OperationsCommandCenter.tsx` | Hardcoded KPIs (`96.8%`, `4`, `6`, `3`, `81%`) | Static Figma metrics | Dynamic calculations from live data: `fleetHealth`, `overflowCount`, `offlineCount`, `slaRiskCount`, `routeLoad`. | **YES** | NO |
| `src/components/admin/BinDetailView.tsx` | `71%` battery, `31°C` temperature | Visual Figma cards | Mapped to `N/A` because SB-024 physical device capabilities mark battery and temperature as unsupported (`null`). | **YES** | NO |
| `src/components/admin/CollectionsAndRoutesView.tsx` | Route `A-17` | Demo collection run | Supabase `route_stops` + `collections` queries. | **YES** | NO |
| `src/components/simulator/FirmwareExporter.tsx` | Servo actuation & fake battery telemetry | Early simulated features | Replaced with physical ESP32 HC-SR04 median filter + NEO-6M GPS contract. | **YES** | NO |
| `tests/cloudIngestion.test.ts` | Test scenarios `40`, `88`, `96`, `102`, `8` | Automated acceptance testing | Test-only suite running against test server. | N/A | **YES** (isolated to `tests/`) |
| `tests/hostedEndpoints.test.ts` | Test device key `klinghana_dev_device_key_sb024` | Integration test verification | Test-only suite for `/api/health` and `/api/iot/telemetry`. | N/A | **YES** (isolated to `tests/`) |
