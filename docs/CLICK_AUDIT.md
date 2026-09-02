# KlinGhana Click & Interaction Audit

This document records the verification of every interactive element across the KlinGhana SmartBin application.

## Click Audit Matrix

| CONTROL | SCREEN | EXPECTED ACTION | ACTUAL ACTION | TEST | STATUS |
|---|---|---|---|---|---|
| **Overview nav item** | Global Admin Sidebar | Switch view to `/admin` | Navigates to Operations Command Center | Hash set to `#/admin` | **PASS** |
| **Bins nav item** | Global Admin Sidebar | Switch view to `/admin/bins` | Navigates to Bins & Locations fleet list + Map | Hash set to `#/admin/bins` | **PASS** |
| **Device detail nav item** | Global Admin Sidebar | Switch view to `/admin/bins/{code}` | Opens detail view of active bin | Hash set to `#/admin/bins/SB-024` | **PASS** |
| **Alerts nav item** | Global Admin Sidebar | Switch view to `/admin/alerts` | Opens Alerts Workbench with real alert list | Hash set to `#/admin/alerts` | **PASS** |
| **Complaints nav item** | Global Admin Sidebar | Switch view to `/admin/complaints` | Opens Complaints Workbench with ticket dispatch | Hash set to `#/admin/complaints` | **PASS** |
| **Routes nav item** | Global Admin Sidebar | Switch view to `/admin/routes` | Opens Collections & Route Management | Hash set to `#/admin/routes` | **PASS** |
| **Analytics nav item** | Global Admin Sidebar | Switch view to `/admin/analytics` | Opens Analytics and PDF/CSV Export | Hash set to `#/admin/analytics` | **PASS** |
| **Users / Settings nav item** | Global Admin Sidebar | Switch view to `/admin/settings` | Opens Users, Roles & Platform Settings | Hash set to `#/admin/settings` | **PASS** |
| **AI Assistant button** | Global Admin Sidebar | Switch view to `/admin/ai` | Opens AI Waste Assistant with real DB grounding | Hash set to `#/admin/ai` | **PASS** |
| **Global Search input** | Figma Topbar | Query bins, alerts, and tickets in real-time | Renders live dropdown with matching assets & tickets | Type query, click result | **PASS** |
| **Light/Dark theme toggle** | Figma Topbar | Switch theme class on `document.documentElement` | Toggles `.dark` class dynamically | Click Sun/Moon icons | **PASS** |
| **Notifications bell** | Figma Topbar | Display unread alerts count and dropdown | Opens notifications popover with direct alert links | Click Bell icon | **PASS** |
| **Profile avatar** | Figma Topbar | Open profile menu with role details & settings | Opens profile dropdown with link to settings & logout | Click Profile avatar | **PASS** |
| **Logout button** | Figma Topbar | Sign out from Supabase and redirect to login | Calls `supabase.auth.signOut()` and clears state | Click Logout button | **PASS** |
| **Asset row selection** | Bins & Locations | Select bin and open detailed telemetry | Updates `selectedBinId` and opens Bin Detail | Click any bin row | **PASS** |
| **Map marker click** | Live Fleet Map | Select bin and display quick overview card | Selects bin and smoothly recenters map | Click marker pin | **PASS** |
| **Acknowledge Alert** | Alerts Workbench | Mark alert as acknowledged in Supabase | Persists ACK state in database | Click Acknowledge | **PASS** |
| **Assign Alert** | Alerts Workbench | Assign technician to alert | Persists assignment in database | Click Assign | **PASS** |
| **Resolve Alert** | Alerts Workbench | Mark alert resolved | Updates status to `RESOLVED` in Supabase | Click Resolve | **PASS** |
| **Assign Complaint** | Complaints Workbench | Assign technician to citizen ticket | Updates complaint status to `ASSIGNED` in DB | Click Assign | **PASS** |
| **Resolve Complaint** | Complaints Workbench | Mark ticket resolved | Updates complaint status to `RESOLVED` in DB | Click Resolve | **PASS** |
| **Submit Citizen Report** | User Report View | Upload photo & create incident complaint | Inserts row into `complaints` and emits Realtime | Submit form | **PASS** |
| **Citizen Complaints View** | User Complaints View | Display citizen ticket timeline | Live 4-step timeline for reported bins | View `#/user/complaints` | **PASS** |
| **Export CSV Report** | Analytics & Reports | Generate and download real CSV file | Downloads browser Blob with live fleet data | Click Export CSV | **PASS** |
| **Export PDF Report** | Analytics & Reports | Generate and download real PDF report | Generates canvas PDF download | Click Export PDF | **PASS** |
| **Diagnostics Refresh** | System Diagnostics (`/dev/system`) | Re-test Supabase & Realtime connectivity | Queries `bin_current_state` and checks health | Click Check Health | **PASS** |
