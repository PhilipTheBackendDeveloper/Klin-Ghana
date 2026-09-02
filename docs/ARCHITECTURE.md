# SmartBin Intelligence — System Architecture Specification

## 1. Executive Overview
**SmartBin Intelligence** (branded in Ghana municipal deployments as **KlinGhana**) is a production-grade, end-to-end IoT Smart Waste Management platform. The platform connects physical smart bins equipped with dual-ultrasonic sensing and ESP32 microcontrollers to a resilient cloud backend and rich administrative / citizen web interfaces.

---

## 2. High-Level Architecture Diagram

```mermaid
graph TD
    subgraph Physical_Hardware ["Physical Layer (ESP32 SmartBin)"]
        US_Prox["HC-SR04 Proximity Sensor (User Approach)"]
        Servo["SG90 Servo Actuator (Lid Open/Close)"]
        Btn["Local Manual Button"]
        US_Fill["HC-SR04 Fill-Level Sensor (Waste Depth)"]
        GPS["NEO-6M GPS Module"]
        ESP32["ESP32 Microcontroller Core"]
        
        US_Prox -->|Proximity Trigger (<25cm)| ESP32
        Btn -->|Local Toggle Interrupt| ESP32
        ESP32 -->|Local PWM (No Remote Lid)| Servo
        US_Fill -->|Echo Time-of-Flight| ESP32
        GPS -->|NMEA Coordinates| ESP32
    end

    subgraph IoT_Ingestion ["IoT Security & Ingestion Layer"]
        AuthIngest["Device Token Authentication & Rate Limiting"]
        SchemaValidator["Telemetry Schema Validator (Zod)"]
        HysteresisEngine["Alert Hysteresis & Debounce Filter"]
        
        ESP32 -->|HTTPS POST /iot/v1/telemetry| AuthIngest
        ESP32 -->|HTTPS POST /iot/v1/events| AuthIngest
        AuthIngest --> SchemaValidator
        SchemaValidator --> HysteresisEngine
    end

    subgraph Data_Layer ["PostgreSQL Database & Realtime (Supabase)"]
        DB_Current["bin_current_state (Fast Denormalized Snapshot)"]
        DB_TimeSeries["telemetry (Historical Time-Series)"]
        DB_Alerts["alerts & alert_updates (P1/P2/P3 Lifecycle)"]
        DB_Complaints["complaints & complaint_media (Citizen Tickets)"]
        DB_Routes["collection_runs & route_stops (Dispatches)"]
        DB_RBAC["profiles & organization_members (RLS RBAC)"]
        
        HysteresisEngine --> DB_Current
        HysteresisEngine --> DB_TimeSeries
        HysteresisEngine --> DB_Alerts
    end

    subgraph Application_Layer ["Figma-Accurate User & Admin Applications"]
        AdminWeb["Admin Operations Command Center & Workbench"]
        CitizenWeb["Citizen Clean Ghana Portal & Issue Reporting"]
        AIAssistant["SmartBin AI Assistant (Read-Only Tools + Education)"]
        Simulator["Multi-Bin Fleet Simulator (SB-001 to SB-024)"]
        
        DB_Current <-->|Supabase Realtime WebSocket| AdminWeb
        DB_Alerts <-->|Realtime Events| AdminWeb
        DB_Complaints <-->|Status Tracking| CitizenWeb
        AIAssistant -->|Read-Only Diagnostic Queries| DB_Current
        Simulator -->|IoT Ingestion Endpoint| AuthIngest
    end
```

---

## 3. Subsystem Specifications

### A. Physical Layer & Local Safety Actuation
* **Proximity Ultrasonic Sensor**: Detects hand/citizen approach at $\le 25\text{ cm}$. Triggers 90° lid opening.
* **Auto-Close Timer**: Automatically counts down 5 seconds upon hand withdrawal and rotates lid back to 0° (Closed).
* **Manual Local Button**: Tactile button providing physical override for users and sanitation crews.
* **Separate Fill-Level Ultrasonic Sensor**: Located at bin ceiling, directed downward to calculate waste depth.
* **SAFETY RULE**: Remote opening of the lid via Web, Mobile, AI, or API is **strictly prohibited**. The ESP32 firmware executes all servo actuation locally.

### B. Ingestion & Security
* Every physical bin is assigned a unique `deviceId` (e.g. `SB-001`, `SB-024`) and an encrypted device API token.
* Ingestion endpoint verifies HMAC/bearer token, validates JSON schema, updates `bin_current_state`, writes to `telemetry`, and evaluates alert trigger rules.

### C. Database & Realtime Synchronization
* **`bin_current_state`**: Single-row-per-bin latest snapshot for high-speed sub-millisecond dashboard queries.
* **`telemetry`**: Append-only historical log for analytics and trend analysis.
* **Realtime**: WebSocket change subscriptions push live telemetry, lid states, and incident triggers to the frontend without manual refresh.

### D. Alert Engine & Complaint Workflow
* **Thresholds**:
  * $0\% - 79\%$: `NORMAL`
  * $80\% - 94\%$: `FILLING / WARNING` (P2 Alert)
  * $\ge 95\%$: `CRITICAL / OVERFLOW` (P1 Alert, Audible alarm, Route auto-assignment)
* **Debounce / Hysteresis**: Prevents repeated alert generation when sensor floats around $80\%$ or $95\%$.
* **Citizen Complaints**: Support image/video upload, GPS tagging, ticket tracking, and direct linking to fleet routes.

### E. AI Intelligence & Safety Boundary
* Curated RAG knowledge base for waste classification (Plastics, Pure Water Sachets, Organic Biomass, Hazardous E-waste).
* Read-only operational tool calling: `getBinStatus()`, `getBinsAboveThreshold()`, `getActiveAlerts()`, `getFleetAnalytics()`.
* Zero actuator control in AI tool definitions.
