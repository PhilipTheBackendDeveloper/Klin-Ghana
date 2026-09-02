/*
 * SmartBin Intelligence / KlinGhana - SB-024 Core Microcontroller Firmware
 * Target MCU: ESP32-WROOM-32 Dev Module
 *
 * Core Hardware:
 * - HC-SR04 ultrasonic distance sensor (GPIO 5 TRIG, GPIO 18 ECHO with voltage divider)
 * - NEO-6M GPS receiver (HardwareSerial 2: GPIO 16 RX, GPIO 17 TX at 9600 baud)
 * - ESP32 802.11 b/g/n Wi-Fi radio (STA mode)
 * - Hosted endpoint telemetry transmission to: ${WEB_APP_BASE_URL}/api/iot/telemetry
 * - Optional MQTT client for HiveMQ broker
 *
 * Logging Standards:
 * - [KLANGHANA] Startup self-test banner
 * - [CONFIG]    Credential and endpoint validation
 * - [WIFI]      Wi-Fi state changes, RSSI, IP assignment
 * - [FILL]      Ultrasonic raw distance, median filtered distance, fill percentage, status
 * - [GPS]       NMEA sentence parsing, fix state, satellites, coordinates
 * - [CLOUD]     Telemetry endpoint status
 * - [HTTP]      HTTPS request status, endpoint code, response summary
 * - [MQTT]      Broker connection, status topic, telemetry publish
 * - [TELEMETRY] Complete packet metadata and delivery verification
 * - [ERROR]     Hardware timeouts, failed requests, reconnection errors
 *
 * IMPORTANT: Secrets, Wi-Fi passwords, and device keys are NEVER printed to Serial.
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Missing firmware/esp32-smartbin/src/secrets.h. Copy secrets.example.h to secrets.h and provide your credentials."
#endif

#ifndef USE_MQTT
#define USE_MQTT 0
#endif

#ifndef EMPTY_DISTANCE_CM
#define EMPTY_DISTANCE_CM 100.0f
#endif

#ifndef FULL_DISTANCE_CM
#define FULL_DISTANCE_CM 5.0f
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 8883
#endif

#ifndef WEB_APP_BASE_URL
#define WEB_APP_BASE_URL "https://klinghana-production.example"
#endif

const char* FIRMWARE_VERSION = "v1.0.0-esp32-core";

// GPIO Pin Mapping
#define PIN_FILL_TRIG 5
#define PIN_FILL_ECHO 18
#define PIN_GPS_RX 16
#define PIN_GPS_TX 17
#define PIN_LED 2

// Operational Timings (in Milliseconds)
const unsigned long SENSOR_INTERVAL_MS = 2000;
const unsigned long TELEMETRY_INTERVAL_MS = 12000;
const unsigned long WIFI_BACKOFF_MAX_MS = 30000;
const unsigned long MQTT_RETRY_MS = 5000;
const unsigned long GPS_LOG_INTERVAL_MS = 6000;

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
WiFiClientSecure mqttSecureClient;
PubSubClient mqttClient(mqttSecureClient);

unsigned long lastSensorMs = 0;
unsigned long lastTelemetryMs = 0;
unsigned long lastWifiAttemptMs = 0;
unsigned long wifiBackoffMs = 1000;
unsigned long lastMqttAttemptMs = 0;
unsigned long lastGpsLogMs = 0;
uint32_t telemetrySequence = 0;
bool wifiWasConnected = false;

float rawDistanceCm = EMPTY_DISTANCE_CM;
float filteredDistanceCm = EMPTY_DISTANCE_CM;
float fillPercentage = 0.0f;
String currentFillStatus = "UNKNOWN";
bool lastTelemetrySent = false;

// Centralized Telemetry Ingestion URL Constructor
String getTelemetryEndpoint() {
  String base = String(WEB_APP_BASE_URL);
  while (base.endsWith("/")) {
    base = base.substring(0, base.length() - 1);
  }
  return base + "/api/iot/telemetry";
}

String baseTopic() {
  return String("klinghana/v1/") + DEVICE_ID;
}

long readUltrasonicCm() {
  digitalWrite(PIN_FILL_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_FILL_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_FILL_TRIG, LOW);

  const unsigned long duration = pulseIn(PIN_FILL_ECHO, HIGH, 35000);
  if (duration == 0) {
    Serial.println("[ERROR] Ultrasonic sensor pulse timeout (no echo received). Check wiring and 5V supply.");
    return 999;
  }
  return (long)(duration * 0.0343f / 2.0f);
}

float readMedianDistanceCm() {
  long samples[5];
  for (int i = 0; i < 5; i++) {
    samples[i] = readUltrasonicCm();
    delay(20);
  }

  rawDistanceCm = (float)samples[0];

  for (int i = 0; i < 4; i++) {
    for (int j = i + 1; j < 5; j++) {
      if (samples[j] < samples[i]) {
        long tmp = samples[i];
        samples[i] = samples[j];
        samples[j] = tmp;
      }
    }
  }

  return (float)samples[2];
}

float distanceToFillPercentage(float distanceCm) {
  const float span = EMPTY_DISTANCE_CM - FULL_DISTANCE_CM;
  if (span <= 0.0f) return 0.0f;
  const float fill = ((EMPTY_DISTANCE_CM - distanceCm) / span) * 100.0f;
  return constrain(fill, 0.0f, 120.0f);
}

String nextFillStatus(float fill) {
  if (currentFillStatus == "OVERFLOW" && fill >= 98.0f) return "OVERFLOW";
  if (currentFillStatus == "FULL" && fill >= 92.0f) return "FULL";
  if (currentFillStatus == "NEAR_FULL" && fill >= 82.0f) return "NEAR_FULL";
  if (currentFillStatus == "FILLING" && fill >= 66.0f) return "FILLING";

  if (fill >= 100.0f) return "OVERFLOW";
  if (fill >= 95.0f) return "FULL";
  if (fill >= 85.0f) return "NEAR_FULL";
  if (fill >= 70.0f) return "FILLING";
  return "NORMAL";
}

bool mqttConfigured() {
#if USE_MQTT
  return strlen(MQTT_HOST) > 0 && strlen(MQTT_USERNAME) > 0 && strlen(MQTT_PASSWORD) > 0;
#else
  return false;
#endif
}

void maintainWifi() {
  const wl_status_t status = WiFi.status();

  if (status == WL_CONNECTED) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      digitalWrite(PIN_LED, HIGH);
      wifiBackoffMs = 1000;
      Serial.println("[WIFI] connected");
      Serial.printf("[WIFI] IP=%s RSSI=%d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
    }
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    Serial.println("[WIFI] Connection lost. Reconnecting...");
  }

  digitalWrite(PIN_LED, (millis() / 300) % 2);
  if (millis() - lastWifiAttemptMs < wifiBackoffMs) return;

  lastWifiAttemptMs = millis();
  Serial.printf("[WIFI] connecting to SSID: %s (backoff: %lu ms)\n", WIFI_SSID, wifiBackoffMs);
  WiFi.disconnect(false);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  wifiBackoffMs = min(wifiBackoffMs * 2, WIFI_BACKOFF_MAX_MS);
}

void maintainMqtt() {
  if (!mqttConfigured() || WiFi.status() != WL_CONNECTED || mqttClient.connected()) return;
  if (millis() - lastMqttAttemptMs < MQTT_RETRY_MS) return;
  lastMqttAttemptMs = millis();

  mqttSecureClient.setInsecure();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);

  const String clientId = String("smartbin-") + DEVICE_ID + "-" + String((uint32_t)ESP.getEfuseMac(), HEX);
  const String statusTopic = baseTopic() + "/status";

  Serial.println("[MQTT] Connecting to HiveMQ broker...");
  const bool connected = mqttClient.connect(
    clientId.c_str(),
    MQTT_USERNAME,
    MQTT_PASSWORD,
    statusTopic.c_str(),
    1,
    true,
    "OFFLINE"
  );

  if (connected) {
    mqttClient.publish(statusTopic.c_str(), "ONLINE", true);
    mqttClient.subscribe((baseTopic() + "/commands").c_str(), 1);
    Serial.println("[MQTT] Connected successfully. ONLINE status published.");
  } else {
    Serial.printf("[ERROR] MQTT connect failed (rc=%d)\n", mqttClient.state());
  }
}

String buildTelemetryJson() {
  telemetrySequence++;

  StaticJsonDocument<768> doc;
  doc["schemaVersion"] = 1;
  doc["messageId"] = String(DEVICE_ID) + "-" + String(telemetrySequence) + "-" + String(millis());
  doc["sequence"] = telemetrySequence;
  doc["deviceId"] = DEVICE_ID;
  doc["timestamp"] = millis();
  doc["fillPercentage"] = roundf(fillPercentage * 10.0f) / 10.0f;
  doc["distanceCm"] = roundf(filteredDistanceCm * 10.0f) / 10.0f;
  doc["rawDistanceCm"] = roundf(rawDistanceCm * 10.0f) / 10.0f;
  doc["fillStatus"] = currentFillStatus;
  doc["binStatus"] = currentFillStatus;
  doc["lidState"] = "CLOSED";

  const bool hasGpsFix = gps.location.isValid() && gps.location.age() < 10000;
  doc["gpsFix"] = hasGpsFix;
  if (hasGpsFix) {
    doc["latitude"] = gps.location.lat();
    doc["longitude"] = gps.location.lng();
    doc["gpsUpdatedAt"] = nullptr;
  } else {
    doc["latitude"] = nullptr;
    doc["longitude"] = nullptr;
    doc["gpsUpdatedAt"] = nullptr;
  }
  doc["satellites"] = gps.satellites.isValid() ? gps.satellites.value() : 0;
  if (gps.hdop.isValid()) {
    doc["gpsAccuracyM"] = gps.hdop.hdop();
  } else {
    doc["gpsAccuracyM"] = nullptr;
  }

  if (WiFi.status() == WL_CONNECTED) {
    doc["wifiRssi"] = WiFi.RSSI();
  } else {
    doc["wifiRssi"] = nullptr;
  }

  doc["batteryPercentage"] = nullptr;
  doc["temperatureC"] = nullptr;
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  String payload;
  serializeJson(doc, payload);
  return payload;
}

bool publishHttpTelemetry(const String& payload) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[ERROR] HTTP telemetry aborted: Wi-Fi not connected.");
    return false;
  }

  HTTPClient http;
  const String endpoint = getTelemetryEndpoint();
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-Key", DEVICE_KEY);

  Serial.println("[HTTP] Transmitting telemetry to hosted web application...");
  const int httpCode = http.POST(payload);

  if (httpCode >= 200 && httpCode < 300) {
    Serial.printf("[HTTP] POST telemetry succeeded: HTTP %d\n", httpCode);
  } else {
    Serial.printf("[ERROR] HTTP POST failed with code %d: %s\n", httpCode, http.errorToString(httpCode).c_str());
  }

  http.end();
  return httpCode >= 200 && httpCode < 300;
}

bool publishMqttTelemetry(const String& payload) {
  if (!mqttConfigured() || !mqttClient.connected()) return false;
  const String topic = baseTopic() + "/telemetry";
  const bool ok = mqttClient.publish(topic.c_str(), payload.c_str(), false);
  Serial.printf("[MQTT] Publish telemetry to %s -> %s\n", topic.c_str(), ok ? "OK" : "FAILED");
  if (!ok) {
    Serial.println("[ERROR] MQTT publish failed.");
  }
  return ok;
}

void publishTelemetry() {
  const String payload = buildTelemetryJson();
  bool sent = false;

  if (mqttConfigured()) sent = publishMqttTelemetry(payload);
  if (!sent) sent = publishHttpTelemetry(payload);

  lastTelemetrySent = sent;
  Serial.printf("[TELEMETRY] seq=%lu raw=%.1fcm filtered=%.1fcm fill=%.1f%% status=%s gps=%s sent=%s\n",
    (unsigned long)telemetrySequence,
    rawDistanceCm,
    filteredDistanceCm,
    fillPercentage,
    currentFillStatus.c_str(),
    gps.location.isValid() ? "FIX" : "NO_FIX",
    sent ? "YES" : "NO"
  );
}

void setup() {
  Serial.begin(115200);
  delay(300);

  // 1. Startup Self-Test Banner
  Serial.println("==================================================");
  Serial.println("[KLANGHANA] SB-024");

  // 2. Configuration Validation
  const bool configValid = (strlen(WIFI_SSID) > 0 && strlen(DEVICE_ID) > 0 && strlen(DEVICE_KEY) > 0 && strlen(WEB_APP_BASE_URL) > 0);
  if (configValid) {
    Serial.println("[CONFIG] valid");
  } else {
    Serial.println("[ERROR] Configuration invalid! Verify secrets.h");
  }

  // 3. Sensor Initialization
  pinMode(PIN_FILL_TRIG, OUTPUT);
  pinMode(PIN_FILL_ECHO, INPUT);
  digitalWrite(PIN_FILL_TRIG, LOW);
  pinMode(PIN_LED, OUTPUT);
  Serial.println("[FILL] ready");

  // 4. GPS UART Initialization
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("[GPS] searching");

  // 5. Cloud Endpoint Configuration
  const String endpoint = getTelemetryEndpoint();
  if (endpoint.startsWith("http://") || endpoint.startsWith("https://")) {
    Serial.println("[CLOUD] endpoint configured");
    Serial.printf("[CLOUD] Target URL: %s\n", endpoint.c_str());
  } else {
    Serial.println("[ERROR] Invalid cloud endpoint scheme!");
  }

  Serial.printf("[BOOT] Calibration: Empty=%.1fcm, Full=%.1fcm\n", EMPTY_DISTANCE_CM, FULL_DISTANCE_CM);
  Serial.println("==================================================");

  // 6. Wi-Fi Initialization
  Serial.println("[WIFI] connecting");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void loop() {
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());

  maintainWifi();
  maintainMqtt();
  if (mqttClient.connected()) mqttClient.loop();

  // GPS periodic status
  if (millis() - lastGpsLogMs >= GPS_LOG_INTERVAL_MS) {
    lastGpsLogMs = millis();
    if (gps.location.isValid() && gps.location.age() < 10000) {
      Serial.printf("[GPS] FIX OK: Lat=%.6f Lng=%.6f Sats=%d HDOP=%.1f\n",
        gps.location.lat(), gps.location.lng(), gps.satellites.value(), gps.hdop.hdop());
    } else {
      Serial.printf("[GPS] searching... Sats=%d Chars=%lu\n",
        gps.satellites.isValid() ? gps.satellites.value() : 0,
        (unsigned long)gps.charsProcessed());
    }
  }

  // Ultrasonic sensor reading
  if (millis() - lastSensorMs >= SENSOR_INTERVAL_MS) {
    lastSensorMs = millis();
    filteredDistanceCm = readMedianDistanceCm();
    fillPercentage = distanceToFillPercentage(filteredDistanceCm);
    const String nextStatus = nextFillStatus(fillPercentage);
    const bool changed = currentFillStatus != "UNKNOWN" && nextStatus != currentFillStatus;
    currentFillStatus = nextStatus;

    Serial.printf("[FILL] Raw=%.1fcm Filtered=%.1fcm Level=%.1f%% Status=%s\n",
      rawDistanceCm, filteredDistanceCm, fillPercentage, currentFillStatus.c_str());

    if (changed) {
      Serial.printf("[FILL] Threshold transition to %s. Triggering immediate telemetry.\n", currentFillStatus.c_str());
      lastTelemetryMs = 0;
    }
  }

  // Periodic telemetry transmission
  const bool triggerImmediate = lastTelemetryMs == 0;
  if (millis() - lastTelemetryMs >= TELEMETRY_INTERVAL_MS || triggerImmediate) {
    lastTelemetryMs = millis();
    publishTelemetry();
  }

  delay(20);
}