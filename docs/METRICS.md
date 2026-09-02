# Metrics

All dashboard metrics are calculated from the live `SmartBinContext` arrays.

## Fleet Health

Source: `bins`, `alerts`

Formula:

- `0` when there are no bins.
- Otherwise starts with online percentage: `online bins / total bins * 100`.
- Subtracts 5 points for each stale bin where `lastUpdated` is older than 15 minutes.
- Subtracts 5 points for each unread danger alert.
- Clamped at a minimum of `0`.

## Overflow

Source: `bins`

Counts bins where either:

- `hardwareFillStatus === 'OVERFLOW'`, or
- UI status is `overflow`.

## Offline

Source: `bins`

Counts bins where either:

- `wifiConnected` is false, or
- UI status is `offline`.

## SLA Risk

Source: `alerts`, `citizenReports`

Counts:

- unread danger and warning alerts, plus
- unresolved citizen reports.

Resolved statuses are `Resolved` and `Closed`.

## Route Load

Source: `routeStops`

Formula:

- `0` when there are no route stops.
- Otherwise `collected stops / total stops * 100`.

## Analytics KPIs

- Waste volume: sum of `collections.weightCollectedKg`.
- Overflow rate: `overflow bins / total bins * 100`, or `0` with no bins.
- Sensor uptime: same value as Fleet Health.
- SLA met: resolved citizen reports divided by total citizen reports, or `0` with no reports.

No metric uses static Figma values in live mode.
