#pragma once

// Copy this file to firmware/esp32-smartbin/src/secrets.h before compilation.
// secrets.h is gitignored to protect network credentials and device tokens.

// 1. Wi-Fi Access Credentials
#define WIFI_SSID "KLENGHANA"
#define WIFI_PASSWORD "replace_with_wifi_password"

// 2. Physical Device Provisioning
#define DEVICE_ID "SB-024"
#define DEVICE_KEY "replace_with_device_key"

// 3. Hosted KlinGhana Web Application Base URL
// Configure ONE base URL. Firmware automatically targets: WEB_APP_BASE_URL + "/api/iot/telemetry"
// Example: https://klinghana.vercel.app or http://192.168.1.100:3000
#define WEB_APP_BASE_URL "https://klinghana-production.example"

// 4. Physical HC-SR04 Bin Calibration (in Centimeters)
// Measure physically on bin container before final bench sign-off:
#define EMPTY_DISTANCE_CM 100.0f
#define FULL_DISTANCE_CM 5.0f

// 5. Optional HiveMQ Cloud TLS/MQTT Transport (Set to 1 only if using MQTT broker instead of HTTP)
#define USE_MQTT 0
#define MQTT_HOST ""
#define MQTT_PORT 8883
#define MQTT_USERNAME ""
#define MQTT_PASSWORD ""