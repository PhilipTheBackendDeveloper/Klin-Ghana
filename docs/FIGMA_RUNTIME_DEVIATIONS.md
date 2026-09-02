# Figma Runtime Deviations

- Login uses real inputs and a submit button over the Figma layout. Supabase Auth is invoked only when `VITE_SUPABASE_PUBLISHABLE_KEY` is configured.
- Operations KPI text is runtime-driven from `SmartBinContext`, but the Figma labels and geometry are preserved.
- The operations map uses the downloaded Figma raster map asset for visual fidelity in the first pass. The existing Leaflet implementation remains available in older screens, but the Figma dashboard view prioritizes visual match.
- User Report keeps real form controls, so native select/input behavior may differ slightly from Figma static rectangles.
- Full visual matching remains pending until browser screenshots can be captured and compared at exact Figma dimensions.
