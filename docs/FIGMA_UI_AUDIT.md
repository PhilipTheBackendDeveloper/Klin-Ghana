# Figma UI Audit

Source file: SmartBin Intelligence - Admin User Experience  
File key: `r811lzqyXRT6xX3MDhJl2Y`  
Root canvas: `47:2`

## Current Pass

Figma MCP was used for `get_design_context` on:

- `57:12` Login
- `64:2` Operations Command Center
- `91:100` User Report

Figma variables were extracted from `64:2` and centralized in `src/index.css`.

Reference screenshots saved locally:

- `docs/figma-verification/figma-login-57-12.png`
- `docs/figma-verification/figma-operations-64-2.png`
- `docs/figma-verification/figma-bins-75-242.png`
- `docs/figma-verification/figma-user-report-91-100.png`

## Screen Status

| Screen | Node | Figma dimensions | App route | Browser viewport | Screenshot path | Status | Notes |
|---|---:|---:|---|---:|---|---|---|
| Login | `57:12` | 1440 x 1040 | `/#/login` | 1440 x 1040 planned | `docs/figma-verification/figma-login-57-12.png` | PARTIAL | Rebuilt with Figma coordinates and downloaded image asset. Browser screenshot comparison not available in this workspace. |
| Operations Command Center | `64:2` | 1440 x 1040 | `/#/admin` | 1440 x 1040 planned | `docs/figma-verification/figma-operations-64-2.png` | PARTIAL | Rebuilt fixed admin shell and dashboard with Figma labels/geometry. Dynamic runtime values preserved. |
| Bins & Locations | `75:242` | 1440 x 1040 | `/#/admin/bins` | 1440 x 1040 planned | `docs/figma-verification/figma-bins-75-242.png` | PENDING_SCREENSHOT_COMPARE | Figma reference captured. Existing route functional, still visually generic in places. |
| Bin Detail & Telemetry | `75:486` | 1440 x 1040 | `/#/admin/bins/SB-024` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional. Needs node-level Figma reconstruction. |
| Alerts & Incidents | `75:742` | 1440 x 1040 | `/#/admin/alerts` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional. Needs persisted acknowledge/assign/resolve wiring. |
| Complaints Workbench | `75:995` | 1440 x 1040 | `/#/admin/complaints` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional through local context. Needs visual pass. |
| Collections & Routes | `75:1203` | 1440 x 1040 | `/#/admin/routes` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional through local context. Needs visual pass. |
| Analytics & Reports | `75:1386` | 1440 x 1040 | `/#/admin/analytics` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing route can generate reports locally. Needs visual pass. |
| Users, Roles & Settings | `77:1592` | 1440 x 1040 | `/#/admin/settings` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Needs remote auth/RLS verification once Supabase project access is available. |
| ChatBot AI | `100:1042` | 1440 x 1040 | `/#/admin/ai` | 1440 x 1040 planned | pending | PENDING_FIGMA_CONTEXT | Existing UI has local assistant behavior. External AI key not verified. |
| User Report | `91:100` | 1440 x 1382 | `/#/user/report` | 1440 x 1382 planned | `docs/figma-verification/figma-user-report-91-100.png` | PARTIAL | Rebuilt with Figma coordinates and working complaint submission. Browser screenshot comparison not available. |
| User / Nearby Bins | `98:408` | 1440 x 1382 | `/#/user/bins` | 1440 x 1382 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional. Needs full Figma reconstruction. |
| User Bin Detail | `98:515` | 1440 x 1382 | `/#/user/bins/SB-024` | 1440 x 1382 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional. Needs full Figma reconstruction. |
| User Complaints | `98:706` | 1440 x 1382 | `/#/user/complaints` | 1440 x 1382 planned | pending | PENDING_FIGMA_CONTEXT | Existing route functional. Needs full Figma reconstruction. |

## Verification Notes

- `MATCHED` is intentionally not used. No browser screenshot diff was performed because Playwright/Chromium are not installed and no browser connector is available in this session.
- Vite dev server was started and served the app plus downloaded Figma assets with HTTP 200.
- Production build and Vitest passed after the UI changes.
