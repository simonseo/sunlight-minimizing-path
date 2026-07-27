# Geospatial Pipeline Specification

## Inputs and outputs

```text
raw LiDAR + trees + buildings + OSM + weather snapshots
                         ↓
normalized vectors and surface rasters
                         ↓
sidewalk sample points and route graph
                         ↓
solar/shade labels at 15-minute intervals
                         ↓
edge costs, evaluation tables, and web-ready tiles
```

## Stage 1: Normalize

- Convert vectors to GeoParquet.
- Repair invalid geometries and preserve source identifiers.
- Derive a bare-earth elevation model and a digital surface model from LiDAR.
- Produce canopy-height and building-height rasters with provenance metadata.

## Stage 2: Build pedestrian graph

- Extract walkable OSM ways and crossings.
- Split edges at intersections and at no more than 10-meter spacing.
- Add length, slope, bearing, surface/access tags, and a stable edge ID.
- Sample each edge every 5 meters for shade and exposure calculations.

## Stage 3: Compute shade baseline

- Calculate solar azimuth and elevation locally for every 15-minute daylight slot.
- For each sidewalk sample, evaluate building and canopy obstruction using the surface model.
- Store `shade_fraction`, `shade_source`, and `confidence`.
- Aggregate samples to edge-level values using length-weighted means.

## Stage 4: Compute thermal proxy

For each edge/time slot, calculate a transparent relative score:

`edge_cost = walk_seconds × (radiation × exposed_fraction + air_temperature + humidity - wind_relief + grade_effort)`

All coefficients live in a versioned configuration file. The result is a routing score, not an estimate of body temperature or sweat volume.

## Stage 5: Publish artifacts

- `routes.graph.json`: compact pedestrian graph and edge costs.
- `shade.pmtiles`: visualization overlay.
- `study-trips.parquet`: predetermined evaluation trips.
- `metadata.json`: build time, source versions, model version, and known gaps.

## Reproducibility

Every run writes a run ID, git commit, configuration hash, input checksum manifest, and output validation report.
