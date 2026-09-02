import React, { useState } from 'react';
import { Copy, Check, Download, Code } from 'lucide-react';
import { SmartBin } from '../../types';

interface FirmwareExporterProps {
  selectedBin: SmartBin | null;
}

export const FirmwareExporter: React.FC<FirmwareExporterProps> = ({ selectedBin }) => {
  const [copied, setCopied] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('KLENGHANA');
  const [serverHost, setServerHost] = useState('https://ufnwwgilqxvjrzrmydes.supabase.co/functions/v1/iot-telemetry');

  const binCode = selectedBin?.code || 'SB-024';

  const arduinoCode = `/*
 * KlinGhana SmartBin Intelligence — SB-024 Physical ESP32 Firmware
 * Target Microcontroller: ESP32-WROOM-32 Dev Module
 * Hardware:
 *  - HC-SR04 Ultrasonic Sensor: TRIG=GPIO 5, ECHO=GPIO 18 (via 1k/2k voltage divider)
 *  - NEO-6M GPS Module: RX=GPIO 16, TX=GPIO 17 (HardwareSerial 2 @ 9600 baud)
 *  - Status LED: GPIO 2
 *  - Transport: HTTPS POST to Supabase Edge Function
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <TinyGPSPlus.h>

// Wi-Fi Credentials
const char* WIFI_SSID = "${wifiSsid}";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Device & Cloud Configuration
const char* DEVICE_ID = "${binCode}";
const char* DEVICE_KEY = "YOUR_DEVICE_KEY";
const char* SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
const char* TELEMETRY_URL = "${serverHost}";

// Calibration Constants
const float EMPTY_DISTANCE_CM = 100.0f;
const float FULL_DISTANCE_CM = 5.0f;

// Pin Assignments
#define PIN_FILL_TRIG 5
#define PIN_FILL_ECHO 18
#define PIN_GPS_RX 16
#define PIN_GPS_TX 17
#define PIN_LED 2

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);
uint32_t telemetrySequence = 0;
unsigned long lastTelemetryMs = 0;

long readUltrasonicCm() {
  digitalWrite(PIN_FILL_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_FILL_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_FILL_TRIG, LOW);

  unsigned long duration = pulseIn(PIN_FILL_ECHO, HIGH, 35000);
  if (duration == 0) return 999;
  return (long)(duration * 0.0343f / 2.0f);
}

float distanceToFill(float distanceCm) {
  float span = EMPTY_DISTANCE_CM - FULL_DISTANCE_CM;
  if (span <= 0.0f) return 0.0f;
  float fill = ((EMPTY_DISTANCE_CM - distanceCm) / span) * 100.0f;
  return constrain(fill, 0.0f, 120.0f);
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_FILL_TRIG, OUTPUT);
  pinMode(PIN_FILL_ECHO, INPUT);
  pinMode(PIN_LED, OUTPUT);

  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.println("[BOOT] KlinGhana SmartBin physical firmware starting...");
}

void loop() {
  while (gpsSerial.available() > 0) gps.encode(gpsSerial.read());

  if (millis() - lastTelemetryMs >= 12000) {
    lastTelemetryMs = millis();
    telemetrySequence++;

    long distance = readUltrasonicCm();
    float fill = distanceToFill((float)distance);
    bool hasFix = gps.location.isValid() && gps.location.age() < 10000;

    StaticJsonDocument<512> doc;
    doc["schemaVersion"] = 1;
    doc["messageId"] = String(DEVICE_ID) + "-" + String(telemetrySequence) + "-" + String(millis());
    doc["sequence"] = telemetrySequence;
    doc["deviceId"] = DEVICE_ID;
    doc["timestamp"] = millis();
    doc["fillPercentage"] = fill;
    doc["distanceCm"] = (float)distance;
    doc["rawDistanceCm"] = (float)distance;
    doc["gpsFix"] = hasFix;
    doc["latitude"] = hasFix ? gps.location.lat() : 0.0;
    doc["longitude"] = hasFix ? gps.location.lng() : 0.0;
    doc["satellites"] = hasFix ? gps.satellites.value() : 0;
    doc["wifiRssi"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
    doc["batteryPercentage"] = nullptr;
    doc["temperatureC"] = nullptr;

    String payload;
    serializeJson(doc, payload);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(TELEMETRY_URL);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", SUPABASE_PUBLISHABLE_KEY);
      http.addHeader("X-Device-Id", DEVICE_ID);
      http.addHeader("X-Device-Key", DEVICE_KEY);

      int code = http.POST(payload);
      Serial.printf("[HTTP] POST status: %d\\n", code);
      http.end();
    }
  }
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(arduinoCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadInoFile = () => {
    const blob = new Blob([arduinoCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KlinGhana_${binCode}_Firmware.ino`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-white text-base">Production ESP32 C++ Firmware Exporter</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Physical ESP32 + HC-SR04 + NEO-6M configuration for <strong className="text-white">{binCode}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>

          <button
            onClick={downloadInoFile}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold transition-all shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Download .ino Sketch</span>
          </button>
        </div>
      </div>

      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono">firmware_esp32_smartbin.ino</span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono">C++ (Arduino Core)</span>
        </div>
        <pre className="p-4 max-h-[420px] overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed">
          <code>{arduinoCode}</code>
        </pre>
      </div>
    </div>
  );
};
