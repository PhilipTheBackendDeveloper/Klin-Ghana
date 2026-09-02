# Production Data Audit

## Result

Production screens now render from live application state instead of Figma/demo fleet fixtures.

In `VITE_DATA_MODE=live`:

- `SmartBinProvider` starts with empty arrays.
- Supabase tables are the source of truth for bins, alerts, complaints, collections, and route stops.
- Missing Supabase configuration produces an empty UI plus a configuration message.
- Demo data is not loaded as a fallback.
- `supabase/seed.sql` is intentionally empty and will not create demo bins.

In `VITE_DATA_MODE=demo`:

- Demo fixtures can be loaded for presentation and local walkthroughs.
- The old six-bin Supabase fixture seed was preserved as `supabase/demo.seed.sql`.

## High-Risk Fixtures Removed From Production Screens

- `src/components/admin/BinsAndLocationsView.tsx`: removed six hardcoded Figma bins and the fixed `130 Assets` count.
- `src/components/admin/OperationsCommandCenter.tsx`: removed default SB-024 selection, fake incident queue, fake complaints table, fixed heartbeat, and fixed route summary.
- `src/components/admin/BinDetailView.tsx`: removed static SB-024 telemetry, fake event log, and fake successful sensor diagnostics.
- `src/components/admin/AlertsWorkbench.tsx`: removed hardcoded incident columns and timeline rows.
- `src/components/admin/ComplaintsWorkbench.tsx`: removed hardcoded tickets, fake reporter names, and Unsplash evidence preview.
- `src/components/admin/CollectionsAndRoutesView.tsx`: removed hardcoded trucks and fixed route polyline.
- `src/components/admin/AnalyticsAndReportsView.tsx`: removed fixed KPI numbers, hotspot rows, and generated report list.
- `src/components/admin/ChatBotAiView.tsx`: removed canned sample fleet cards and fake route dispatch claims.
- `src/components/citizen/UserBinsView.tsx`: removed hardcoded nearby bins.
- `src/components/citizen/UserReportView.tsx`: removed default SB-024 location and static bin options.
- `src/components/citizen/UserBinDetailView.tsx`: removed static SB-024 detail rendering.
- `src/App.tsx`: removed `defaultSB024`; routed bin pages now resolve only real context records.

## Regression Guard

Run:

```bash
npm run audit:production-data
```

The audit scans production source for screen-level Figma/demo fleet fixtures such as `figmaAssets`, `defaultSB024`, the extra demo bin IDs, fake ticket IDs, static Accra location names, and Unsplash complaint evidence.

Allowed exceptions:

- `src/data/initialBins.ts` for explicit demo mode.
- `src/context/SmartBinContext.tsx` lines inside the `DEMO_*` fixtures.
- `src/components/simulator/**` for simulator-only flows.

## Remaining External Limits

Remote Supabase contents cannot be proven from code alone unless the CLI session or MCP account has access to project `ufnwwgilqxvjrzrmydes`. The UI behavior is now correct for any returned row count: zero rows shows empty, one row shows one bin, and six rows shows six bins only if six rows actually exist in Supabase.
