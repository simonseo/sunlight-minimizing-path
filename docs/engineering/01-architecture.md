# Prototype Architecture

## Principle

Move expensive geospatial work out of the request path. The browser consumes prepared research artifacts rather than querying LiDAR, city GIS, or a routing service live.

```text
Offline Python pipeline
  → versioned static artifacts
  → static web host
  → browser map, geocoder, and route comparison
```

## Components

| Component | Technology | Responsibility |
|---|---|---|
| Data pipeline | Python, GDAL, PDAL, GeoPandas, DuckDB | Derive graph, shade, and evaluation artifacts |
| Route engine | TypeScript module | Compute Fastest/Cooler paths on compact graph |
| Web app | React, Vite, TypeScript | Interaction, explanation, and visualization |
| Map | Mapbox GL JS + deck.gl | Base map, search, route and exposure layers |
| Hosting | GitHub Pages initially | Static prototype deployment |

## Runtime flow

1. Load metadata and the compact route graph.
2. Geocode origin/destination through Mapbox Search Box.
3. Snap results to graph nodes.
4. Look up the requested time slot and weather scenario.
5. Run Fastest and Cooler graph searches in-browser.
6. Render paths and computed metrics.

## Constraints

- Do not bundle raw LiDAR or large source rasters into the browser.
- Cache static artifacts using content-hashed filenames.
- Keep the full prototype operable with no backend service.
- Version every artifact and show its age in an About/Data panel.
