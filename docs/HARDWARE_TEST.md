# Hardware Test

## Target Path

ESP32-WROOM + HC-SR04 fill sensor + GPS + Wi-Fi -> MQTT/HiveMQ or HTTP fallback -> Supabase Edge Function / MQTT bridge -> PostgreSQL `telemetry` + `bin_current_state` -> Realtime dashboard.

## SB-024 Pin Map

| Module | ESP32 Pin | Notes |
|---|---:|---|
| HC-SR04 TRIG | GPIO 5 | Fill-level ultrasonic trigger |
| HC-SR04 ECHO | GPIO 18 | Use voltage divider/level shifting if the module returns 5V echo |
| GPS TX | GPIO 16 / RX2 | GPS TX connects to ESP32 RX2 |
| GPS RX | GPIO 17 / TX2 | GPS RX connects to ESP32 TX2 |
| Status LED | GPIO 2 | Wi-Fi heartbeat/connected indicator |
| ESP32 3V3/GND | 3V3/GND | Common ground required |

## Firmware Files

| File | Purpose |
|---|---|
| `firmware/esp32-smartbin/src/main.cpp` | Core SB-024 firmware: Wi-Fi reconnect, ultrasonic median filtering, GPS parsing, MQTT publish, HTTP fallback |
| `firmware/esp32-smartbin/src/secrets.example.h` | Template for ignored `secrets.h` |
| `firmware/esp32-smartbin/src/secrets.h` | Local-only secrets file; must never be committed |

## Arduino / PlatformIO Libraries

Install these libraries in Arduino IDE or PlatformIO:

- ESP32 board support package
- `ArduinoJson`
- `TinyGPSPlus`
- `PubSubClient`

Serial monitor baud: `115200`.

## Required Local Secrets

Create `firmware/esp32-smartbin/src/secrets.h` from `secrets.example.h` and fill:

- `WIFI_SSID`: `KLENGHANA`
- `WIFI_PASSWORD`: your local Wi-Fi password
- `DEVICE_ID`: `SB-024`
- `DEVICE_KEY`: generate with `npm run device:key`
- `SUPABASE_PUBLISHABLE_KEY`: project publishable key
- `TELEMETRY_URL`: `https://ufnwwgilqxvjrzrmydes.supabase.co/functions/v1/iot-telemetry`
- `EMPTY_DISTANCE_CM`: measured distance from sensor to empty bin floor
- `FULL_DISTANCE_CM`: measured distance from sensor to full threshold
- `USE_MQTT`: `1` only after HiveMQ credentials are ready

Do not put `SUPABASE_SECRET_KEY` on ESP32.

## Cloud Commands

Install dependencies:

```powershell
npm.cmd install
```

Generate a device key:

```powershell
npm.cmd run device:key
```

Run local IoT HTTP server:

```powershell
$env:DEVICE_CREDENTIALS_JSON='{ "SB-024": "your_device_key" }'
npm.cmd run iot:server
```

Send simulator packet to local server:

```powershell
$env:DEVICE_CREDENTIALS_JSON='{ "SB-024": "your_device_key" }'
npm.cmd run sim -- SB-024 40
```

Run MQTT bridge:

```powershell
npm.cmd run mqtt:bridge
```

If HiveMQ variables are missing, expected output is `HIVEMQ_CLOUD=BLOCKED_CREDENTIALS`.

Run web dashboard:

```powershell
npm.cmd run dev
```

Open:

- Admin dashboard: `http://localhost:5173/#/admin`
- Hardware diagnostics: `http://localhost:5173/#/dev/system`

## Supabase Tables Used

| Table | Role |
|---|---|
| `bins` | Registered physical bin asset, including SB-024 |
| `devices` | Device registration and heartbeat |
| `device_capabilities` | Honest capability state: fill_sensor, gps, wifi, mqtt |
| `telemetry` | Append-only physical readings with `message_id` duplicate protection |
| `bin_current_state` | Latest dashboard snapshot used by Realtime UI |
| `alerts` | FULL/OVERFLOW alert generation and recovery |

## Verification Checklist

| Step | Expected Evidence | Status |
|---|---|---|
| Supabase CLI installed | `npx.cmd supabase --version` returns `2.116.0` | VERIFIED |
| Local Supabase status | Requires Docker Desktop or Podman | BLOCKED_DOCKER_NOT_INSTALLED |
| Remote Supabase link/list | Requires `supabase login` or `SUPABASE_ACCESS_TOKEN` for target account | BLOCKED_SUPABASE_AUTH |
| Migrations ready | `supabase/migrations/20260902_hardware_telemetry_contract.sql` exists | SOFTWARE_READY |
| Edge Function auth shape | `@supabase/server` with `auth: 'publishable'` and `verify_jwt=false` | SOFTWARE_READY |
| MQTT bridge no-credential behavior | `npm.cmd run mqtt:bridge` prints `HIVEMQ_CLOUD=BLOCKED_CREDENTIALS` | VERIFIED |
| ESP32 compile | Arduino/PlatformIO build required | NOT_RUN |
| ESP32 flash | Physical board required | BLOCKED_HARDWARE |
| Ultrasonic raw/filtered readings | Serial logs show distance and fill | BLOCKED_HARDWARE |
| GPS fix | Serial logs plus dashboard show GPS fix/coords/satellites | BLOCKED_HARDWARE |
| Physical cloud packet | Supabase `telemetry` and `bin_current_state` update from SB-024 | BLOCKED_HARDWARE_AND_SUPABASE_AUTH |

## Safety Boundary

`PHYSICAL_VERIFIED` is not claimed yet. It can be claimed only after these are captured from the real device:

1. Serial log with Wi-Fi connected, ultrasonic distance, fill percentage and GPS state.
2. Supabase `telemetry` row containing the same `messageId` / `sequence`.
3. Supabase `bin_current_state` row updating SB-024.
4. Dashboard `/dev/system` showing the same fill/RSSI/GPS state over Realtime.