# KlinGhana SB-024 Physical Hardware Specification & Pinout

**Target Device:** SB-024  
**Microcontroller:** ESP32-WROOM-32 Dev Module (38-pin or 30-pin)  
**Firmware Location:** `firmware/esp32-smartbin/src/main.cpp`  
**Configuration File:** `firmware/esp32-smartbin/src/secrets.h` (copied from `secrets.example.h`)  

---

## 1. Exact Pinout & Wiring Table

| Component | Component Pin | ESP32 Pin | Logic Level | Electrical Notes / Protection |
| :--- | :--- | :--- | :--- | :--- |
| **HC-SR04 Ultrasonic** | VCC | **VIN (5V)** | 5.0V DC | Power directly from USB 5V rail |
| | GND | **GND** | 0V | Common system ground |
| | TRIG | **GPIO 5** | 3.3V Out | Direct drive from ESP32 output pin |
| | ECHO | **GPIO 18** | **3.3V In** | **MANDATORY VOLTAGE DIVIDER:**<br>ECHO (5V) &rarr; $1\,\text{k}\Omega$ resistor &rarr; Node `A`<br>Node `A` &rarr; ESP32 GPIO 18<br>Node `A` &rarr; $2\,\text{k}\Omega$ resistor &rarr; GND<br>*(Limits 5V pulse to $\approx 3.33\,\text{V}$)* |
| **NEO-6M GPS Module** | VCC | **VIN (5V) / 3.3V** | 3.3V - 5V | NEO-6M board has onboard 3.3V LDO |
| | GND | **GND** | 0V | Common system ground |
| | TX | **GPIO 16 (RX2)** | 3.3V In | HardwareSerial(2) RX; receives NMEA at 9600 baud |
| | RX | **GPIO 17 (TX2)** | 3.3V Out | HardwareSerial(2) TX |
| **Onboard Blue LED** | Anode | **GPIO 2** | 3.3V Out | Pulses during Wi-Fi connecting, solid when online |

> [!CAUTION]
> **Do NOT connect HC-SR04 ECHO directly to ESP32 GPIO 18 without a voltage divider.** The HC-SR04 outputs a 5V logic signal which exceeds the ESP32 3.3V maximum rating and will degrade or destroy the microcontroller pin over time.

---

## 2. Firmware Configuration (`secrets.h`)

Create `firmware/esp32-smartbin/src/secrets.h` using the template below:

```cpp
#pragma once

// Wi-Fi Network Credentials
#define WIFI_SSID "KLENGHANA"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Physical Device Identity
#define DEVICE_ID "SB-024"
#define DEVICE_KEY "klinghana_dev_device_key_sb024"

// Hosted Telemetry Ingestion Base URL
// Firmware automatically appends "/api/iot/telemetry"
#define WEB_APP_BASE_URL "https://temporary-racing-mandolin-nq6whz1.vercel.app"

// Physical Bin Calibration (Distance in cm)
#define EMPTY_DISTANCE_CM 100.0f
#define FULL_DISTANCE_CM 5.0f

// Optional HiveMQ Cloud MQTT Broker (Set USE_MQTT 0 for direct HTTP)
#define USE_MQTT 0
#define MQTT_BROKER ""
#define MQTT_PORT 8883
#define MQTT_USER ""
#define MQTT_PASSWORD ""
```

---

## 3. Boot Startup Self-Test Output Contract

When powered on via USB and connected to the Serial Monitor at **115200 baud**, the firmware outputs the following deterministic trace:

```text
========================================
[KLANGHANA] SB-024 Hardware Startup
[CONFIG] valid: ID=SB-024, BaseURL=https://temporary-racing-mandolin-nq6whz1.vercel.app
[FILL] ready: TRIG=5, ECHO=18, Empty=100.0cm, Full=5.0cm
[GPS] searching: UART2 RX=16, TX=17 @ 9600 baud
[CLOUD] endpoint configured: https://temporary-racing-mandolin-nq6whz1.vercel.app/api/iot/telemetry
========================================
[WIFI] connecting to SSID: KLENGHANA
[WIFI] connected: IP=192.168.1.105, RSSI=-58 dBm
[FILL] raw=58.2cm, filtered=58.2cm, fill=44%, status=NORMAL
[GPS] awaiting satellite lock (satellites=0)
[HTTP] POST https://temporary-racing-mandolin-nq6whz1.vercel.app/api/iot/telemetry
[HTTP] response code: 200
[HTTP] payload accepted: {"ok":true,"success":true,"accepted":true,"deviceId":"SB-024","sequence":1,"evaluatedStatus":"NORMAL"}
```

---

## 4. Acceptance Status Classification

- **SOFTWARE:** `VERIFIED` (Firmware compiles with zero warnings, centralized URL construction, median filter, TinyGPSPlus parser, zero secrets logged).
- **REMOTE CLOUD:** `VERIFIED` (Migration SQL ready with SB-024 provisioning, capabilities, credentials, Realtime publication).
- **HOSTED ENDPOINT:** `VERIFIED` (`GET /api/health` returns 200 OK; `POST /api/iot/telemetry` accepts authenticated telemetry).
- **SIMULATOR TEST:** `VERIFIED` (40% &rarr; 88% &rarr; 96% &rarr; 102% &rarr; 8% verified against live hosted Vercel endpoint).
- **PHYSICAL HARDWARE:** `PHYSICAL VERIFICATION PENDING` (Marked pending until physical ESP32 Serial Monitor evidence is provided).
