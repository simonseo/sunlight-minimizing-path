# Web Client Build Plan

## Application structure

```text
src/
  app/          application shell and state
  features/     search, time, routing, route comparison
  map/          Mapbox/deck.gl layers
  data/         artifact loaders and types
  lib/          solar, scoring, and graph utilities
```

## Pages

- `/`: interactive research map.
- `/about`: methodology, data sources, limitations, and attribution.
- `/results`: optional fixed evaluation visualizations; no user data persistence.

## State model

Keep only transient client state: selected locations, departure time, weather scenario, selected route, and loading/error state. Do not add authentication or analytics at this stage.

## Map layers

1. Base map.
2. Shade/exposure overlay for selected time.
3. Fastest route.
4. Cooler route.
5. Start/end markers.
6. Optional confidence/hatching overlay.

## Environment configuration

Read `VITE_MAPBOX_ACCESS_TOKEN` from the ignored local `.env` file. Provide `.env.example` with the variable name only. Never hard-code a token or include it in source maps, screenshots, documentation, or test fixtures.

## Design quality bar

Use a restrained coastal palette, responsive desktop/mobile layout, meaningful loading states, and legible typography. A simple interface with accurate explanation is preferred over a feature-dense dashboard.
