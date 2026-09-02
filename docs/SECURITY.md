# Security & Safety Boundaries

## 1. Non-Negotiable Safety Rule
**Remote lid opening is STRICTLY PROHIBITED.**
* Web dashboards, Mobile applications, Public APIs, and AI Assistants do not expose any actuator trigger or servo manipulation endpoints.
* Servo actuation is strictly executed locally on the physical ESP32 microcontrollers through local ultrasonic proximity detection or physical tactile buttons.

## 2. Device Identity & Authentication
* Each SmartBin has a unique identifier (`SB-001` through `SB-024`) and an encrypted device pre-shared token.
* Tokens are stored hashed on the backend.
* A compromised device token cannot access other devices or general database tables.

## 3. Row Level Security (RLS) & Role-Based Access Control
* **Public / Residents**: Access read-only nearby bin capacities, submit complaints, and view their own complaint history.
* **Collectors**: View assigned collection runs and check off serviced bins.
* **Operations & Super Admins**: Access fleet management, alert acknowledgment, diagnostic requests, and reporting.

## 4. AI Guardrails
* The SmartBin AI assistant operates under strict read-only tool access (`getBinStatus`, `getActiveAlerts`, `getFleetAnalytics`, `searchEducation`).
* The AI engine cannot execute raw SQL or mutate database records.
