# SmartBin Intelligence — End-to-End Demo Runbook

Follow these exact steps to demonstrate the end-to-end functionality of the platform:

## 1. Login & Brand Experience
1. Open the web portal at `http://localhost:3000/`.
2. Inspect the **KlinGhana Login Screen** matching the exact Figma typography, blue dustbin logo glyph, illustration, and "Admin access" form.
3. Click **"Enter command center"** to log in as Operations Admin.

## 2. Operations Command Center (Figma 1:1)
1. View top KPI row: **Fleet Fill (80.5%)**, **Full Bins (4)**, **Incidents (1)**, **In Route (3)**, **Sensor Uptime (91%)**.
2. Inspect the live GPS map and quick incident queue.

## 3. Bin Detail & Telemetry (101% Overflow Demonstration)
1. Navigate to **"Bins & Locations"** or click on **SB-024 (Oxford Street)**.
2. View the **101% OVERFLOW** card with real-time ultrasonic distance ($4\text{ cm}$), battery voltage, RSSI signal, and 24-hour fill history bar chart.
3. Click **"Request Diagnostic"** to simulate a safe sensor health ping.

## 4. Alerts & Incidents Workbench
1. Navigate to **"Alerts & Incidents"**.
2. View prioritized P1 (Critical Overflow), P2 (Warning), and P3 (Info) alerts.
3. Click **"Acknowledge"** or **"Assign Route"** to dispatch the municipal sanitation team.

## 5. Citizen Experience & Complaint Workflow
1. Switch to **Resident / Citizen Mode** via the Topbar role switcher.
2. Navigate to **"Report Issue"** (Figma 1:1 screen).
3. Select problem button (e.g. `Overflow` or `Full bin`), enter description, select priority, preview the evidence upload box, and click **"Submit report"**.
4. Switch back to **Admin Mode** -> **"Complaints Workbench"** to observe the ticket appear live with real-time assignment controls.

## 6. Collections & Garbage Truck Circuit Routing
1. Navigate to **"Collections & Routes"**.
2. View the automatically computed optimal route connecting all full bins ($\ge 80\%$) starting from the municipal depot.

## 7. Automated PDF / CSV Reports
1. Navigate to **"Analytics & Reports"**.
2. Click **"Generate Full PDF Report"** to download the certified research and municipal audit report.

## 8. SmartBin AI Assistant
1. Navigate to **"AI Assistant"**.
2. Query: *"Which bins are above 80%?"* -> AI queries the read-only operational telemetry and lists them.
3. Query: *"How do I recycle pure water sachets in Accra?"* -> AI provides grounded educational guidelines.
