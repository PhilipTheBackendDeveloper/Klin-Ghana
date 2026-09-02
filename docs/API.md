# IoT Telemetry & Backend API Contract

## 1. Device Telemetry Ingestion Endpoint

### `POST /iot/v1/telemetry`
Published periodically by physical ESP32 or multi-bin fleet simulator (every 12 seconds under normal operation).

#### Headers:
```http
Content-Type: application/json
X-Device-Id: SB-024
X-Device-Token: hmac_sha256_token
```

#### Request Body Schema:
```json
{
  "schemaVersion": 1,
  "deviceId": "SB-024",
  "timestamp": "2026-09-01T19:50:00Z",
  "fillPercentage": 101.2,
  "distanceCm": 4.5,
  "binStatus": "OVERFLOW",
  "lidState": "CLOSED",
  "latitude": 5.6037,
  "longitude": -0.1870,
  "gpsAccuracyM": 6.2,
  "wifiRssi": -64,
  "batteryPercentage": 82,
  "temperatureC": 31.4,
  "firmwareVersion": "v2.4.1-ESP32"
}
```

#### Response:
```json
{
  "success": true,
  "status": "ACCEPTED",
  "serverTimestamp": "2026-09-01T19:50:01Z",
  "acknowledgedThreshold": "OVERFLOW"
}
```

---

## 2. Device Critical Event Ingestion

### `POST /iot/v1/events`
Immediately dispatched on edge trigger (e.g. Ultrasonic fill threshold crossed, Proximity trigger, Low battery, Lid fault).

#### Request Body:
```json
{
  "schemaVersion": 1,
  "deviceId": "SB-024",
  "eventType": "OVERFLOW_DETECTED",
  "severity": "P1",
  "timestamp": "2026-09-01T19:50:00Z",
  "data": {
    "fillPercentage": 101.2,
    "distanceCm": 4.5,
    "consecutiveReadings": 5
  }
}
```

---

## 3. Administrative Safe Operations (No Remote Lid Opening)

* `POST /api/v1/admin/diagnostics/request` &mdash; Request sensor calibration & health echo.
* `POST /api/v1/admin/alerts/:id/acknowledge` &mdash; Mark alert acknowledged.
* `POST /api/v1/admin/complaints/:id/assign` &mdash; Assign maintenance technician.
* `POST /api/v1/admin/routes/dispatch` &mdash; Generate optimal garbage truck collection circuit.
