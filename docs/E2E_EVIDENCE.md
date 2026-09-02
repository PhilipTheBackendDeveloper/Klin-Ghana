# End-to-End Evidence

Date: 2026-09-02
Project: KlinGhana SmartBin Intelligence
Target Supabase project: `ufnwwgilqxvjrzrmydes`
Physical device: `SB-024`

## Implemented Path

- Browser config uses `VITE_SUPABASE_PUBLISHABLE_KEY` only.
- Server/Edge/MQTT code uses `SUPABASE_SECRET_KEY` only from ignored environment files.
- ESP32 firmware uses `SUPABASE_PUBLISHABLE_KEY` plus `X-Device-Id` and `X-Device-Key` headers; it never receives the Supabase secret key.
- Shared telemetry contract lives in `src/shared/telemetryContract.ts`.
- Local HTTP ingestion and the Edge Function reject duplicate `messageId` packets and stale `sequence` packets.
- `services/mqtt-bridge/index.ts` subscribes to `klinghana/v1/SB-024/telemetry` and writes the same Supabase tables.
- `/dev/system` displays SB-024 current state, RSSI, ultrasonic distance/fill, GPS fix, satellites, database status, Realtime status and physical verification state.

## Verification Commands Run

```powershell
npm.cmd run build
```

Result: PASS. Vite emitted only large chunk warnings and Rollup comments from zod dependencies.

```powershell
npx.cmd supabase --version
```

Result: PASS, returned `2.116.0`.

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'; npx.cmd supabase status
```

Result: BLOCKED. CLI reported Docker/Podman is missing: local Supabase status requires Docker Desktop or Podman on PATH.

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'; npx.cmd supabase projects list
```

Result: BLOCKED. CLI requires `supabase login` or `SUPABASE_ACCESS_TOKEN` for the account that owns `ufnwwgilqxvjrzrmydes`.

```powershell
$env:SUPABASE_TELEMETRY_DISABLED='1'; npx.cmd supabase db diff --local --schema public
```

Result: BLOCKED. CLI requires Docker Desktop for the local shadow database.

```powershell
npm.cmd run mqtt:bridge
```

Result: PASS for blocked-credentials behavior. Output included `HIVEMQ_CLOUD=BLOCKED_CREDENTIALS`.

## Evidence Not Yet Claimed

| Evidence | Status | Reason |
|---|---|---|
| Remote migration pushed to `ufnwwgilqxvjrzrmydes` | NOT_VERIFIED | Supabase CLI is not logged into the target account |
| Edge Function deployed remotely | NOT_VERIFIED | Supabase CLI auth is missing |
| Remote tables queried | NOT_VERIFIED | Target project access unavailable from this environment |
| ESP32 compiled/flashed | NOT_VERIFIED | Arduino/PlatformIO hardware toolchain not present in this repo run |
| Physical ultrasonic reading | NOT_VERIFIED | Requires wired HC-SR04 and serial output |
| Physical GPS fix | NOT_VERIFIED | Requires wired GPS and satellite fix |
| Dashboard Realtime from physical SB-024 | NOT_VERIFIED | Requires physical packet plus remote Supabase deployment |

## Next Physical Acceptance Test

1. Install Docker Desktop or Podman if local Supabase CLI verification is needed.
2. Run `npx.cmd supabase login` with the account that owns `ufnwwgilqxvjrzrmydes`, or set `SUPABASE_ACCESS_TOKEN`.
3. Run `npx.cmd supabase link --project-ref ufnwwgilqxvjrzrmydes`.
4. Run `npx.cmd supabase db push`.
5. Deploy the function: `npx.cmd supabase functions deploy iot-telemetry --project-ref ufnwwgilqxvjrzrmydes`.
6. Add `DEVICE_CREDENTIALS_JSON` and server keys to Supabase function secrets.
7. Flash ESP32 with `secrets.h` configured for SB-024.
8. Watch serial monitor at `115200` and capture one telemetry sequence.
9. Query Supabase `telemetry` and `bin_current_state` for the same sequence/messageId.
10. Open `http://localhost:5173/#/dev/system` and confirm the dashboard matches the database row.