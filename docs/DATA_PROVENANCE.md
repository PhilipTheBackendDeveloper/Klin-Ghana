# Data Provenance

## Runtime Mode

`VITE_DATA_MODE` controls runtime data behavior.

- `live`: production behavior. Start empty, fetch from Supabase, and never fall back to demo fixtures.
- `demo`: local presentation behavior. Uses demo fixtures and localStorage.

Production should set:

```env
VITE_DATA_MODE=live
```

## Supabase Tables

The React app reads these tables through the publishable Supabase client:

- `bins`: asset register and provisioned location.
- `bin_current_state`: latest device telemetry, fill level, connection status, GPS, lid, and sensor readings.
- `alerts`: unresolved device and fleet alerts.
- `complaints`: citizen reports and triage status.
- `collections`: collection history.
- `route_stops`: route manifest rows.

Realtime subscriptions refresh live state on changes to:

- `bin_current_state`
- `alerts`
- `complaints`
- `route_stops`
- `notifications`

## Map Data

Map tiles currently come from CARTO through Leaflet. Live markers are plotted only for bins that have `gpsFix === true` and valid numeric coordinates.

If Google Maps JavaScript is used later, use `VITE_GOOGLE_MAPS_API_KEY` only for browser map rendering. That key is separate from SerpApi.

## SerpApi Boundary

SerpApi is a server-side search API key and must not be exposed as `VITE_*` or shipped to the browser bundle. Keep it as:

```env
SERPAPI_API_KEY=...
```

Use SerpApi only from backend/server code. It is not a map rendering key and it does not replace Google Maps JavaScript API credentials.

## Seeds

- `supabase/seed.sql`: production-safe no-op.
- `supabase/demo.seed.sql`: preserved demo data for local walkthroughs only.

Running the production seed must not create Figma/demo bins.
