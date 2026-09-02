# KlinGhana SmartBin - Production Deployment Guide

## 1. Overview & Architecture

The KlinGhana SmartBin system architecture connects physical ESP32 microcontrollers to a unified cloud web application:

```text
PHYSICAL SB-024 (ESP32)
       │
       │ Wi-Fi: KLENGHANA
       │ HTTPS POST /api/iot/telemetry
       ▼
HOSTED KLANGHANA WEB APP (Vercel Serverless)
       │
       │ Supabase Client / Database Ingestion
       ▼
REMOTE SUPABASE CLOUD (ufnwwgilqxvjrzrmydes)
       │
       │ Realtime Publication (bin_current_state, alerts, complaints, notifications, route_stops)
       ▼
HOSTED KLANGHANA WEB APP (Vite SPA)
```

---

## 2. Source Code & Hosting Setup

- **GitHub Repository:** `https://github.com/PhilipTheBackendDeveloper/Klin-Ghana.git`
- **Default Branch:** `main`
- **Frontend Framework:** React 18 + TypeScript + Vite 5
- **Vercel Project Preset:** Vite
- **Root Directory:** `./`
- **Build Command:** `npm run build` (`tsc && vite build`)
- **Output Directory:** `dist`
- **Node.js Version:** `20.x` or `22.x` (supported LTS)
- **Production Domain:** `https://temporary-racing-mandolin-nq6whz1.vercel.app` (or custom configured domain e.g. `https://klin-ghana.vercel.app`)

---

## 3. Hosted Serverless Endpoints

Vercel deploys the `dist/` static bundle alongside two serverless functions defined in `/api`:

### 1. Health Check Endpoint
- **Method:** `GET`
- **Path:** `/api/health`
- **URL:** `https://<DOMAIN>/api/health`
- **Status:** `200 OK`
- **Response Format:**
  ```json
  {
    "status": "ok",
    "database": "connected",
    "timestamp": "2026-09-02T19:00:00.000Z"
  }
  ```

### 2. IoT Telemetry Ingestion Endpoint
- **Method:** `POST`
- **Path:** `/api/iot/telemetry`
- **URL:** `https://<DOMAIN>/api/iot/telemetry`
- **Headers Required:**
  - `Content-Type: application/json`
  - `X-Device-Id: SB-024`
  - `X-Device-Key: <DEVICE_KEY>`
- **Response Format:**
  ```json
  {
    "ok": true,
    "accepted": true,
    "deviceId": "SB-024",
    "sequence": 1,
    "serverTimestamp": "2026-09-02T19:00:00.000Z"
  }
  ```

---

## 4. Environment Variables Specification

> [!IMPORTANT]
> Never put secret values into source control or documentation. Configure secrets strictly within the hosting provider dashboard.

### Public Client-Side Environment Variables (Vite Bundle)
*These variables are compiled into the browser application:*

| Variable Name | Purpose | Production Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | Supabase Cloud API Gateway | `https://ufnwwgilqxvjrzrmydes.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public client anon key | `<YOUR_SUPABASE_ANON_KEY>` |
| `VITE_DATA_MODE` | Runtime data mode (`live` or `demo`) | `live` |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional Google Maps JS browser key | *(Optional - Leaflet/OSM active by default)* |

### Server-Only Environment Variables (Vercel Serverless Functions)
*These variables are strictly private and NEVER exposed to the browser or client bundle:*

| Variable Name | Purpose |
| :--- | :--- |
| `SUPABASE_URL` | Remote Supabase project URL (`https://ufnwwgilqxvjrzrmydes.supabase.co`) |
| `SUPABASE_SECRET_KEY` | Supabase `service_role` secret key for server-side persistence |
| `DEVICE_CREDENTIALS_JSON` | JSON mapping of device IDs to device keys: `{"SB-024":"<DEVICE_KEY>"}` |
| `SERPAPI_API_KEY` | Private SerpApi search key (server-side only) |

---

## 5. Firmware Configuration

The ESP32 microcontroller uses a single centralized base URL:

- **Config File:** `firmware/esp32-smartbin/src/secrets.h` *(gitignored)*
- **Target URL Construction:** Firmware dynamically constructs:
  ```cpp
  String endpoint = String(WEB_APP_BASE_URL) + "/api/iot/telemetry";
  ```
- **Firmware Parameter:**
  ```cpp
  #define WEB_APP_BASE_URL "https://temporary-racing-mandolin-nq6whz1.vercel.app"
  ```
