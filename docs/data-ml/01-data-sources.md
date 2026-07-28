# Data Sources and Acquisition Plan

## Required source data

| Dataset | Provider | Purpose | Refresh cadence | Storage |
|---|---|---|---|---|
| LiDAR point cloud / derived surface model | USGS 3DEP / LA County | Building and canopy height | Prototype snapshot | Raw object store/local archive |
| Public tree inventory | City of Santa Monica | Species, location, available crown attributes | At build time | GeoParquet |
| Pedestrian network | OpenStreetMap | Paths, crossings, stairs, access tags | Build time | PBF + normalized GeoParquet |
| Building footprints | OSM plus available municipal GIS | Building masks and QA | Build time | GeoParquet |
| Live weather and radiation | Open-Meteo forecast API | Current temperature, apparent temperature, humidity, wind, cloud, direct/diffuse/shortwave radiation, sunrise/sunset | Browser refresh every 10 min | Transient JSON |

## Acquisition procedure

1. Record source URL, access date, license, spatial reference, and dataset version in a manifest.
2. Download raw files without manually editing them.
3. Compute a SHA-256 checksum for every raw artifact.
4. Reproject all geometry to a single local metric CRS before spatial analysis.
5. Store cleaned derivatives separately from raw source files.
6. Never fetch external geodata in response to a user route request.

## Data quality checks

- Confirm LiDAR covers the entire city boundary and record collection date.
- Compare tree points with canopy surface values; flag missing or implausible heights.
- Check OSM pedestrian edges for disconnected components and one-way mistakes.
- Check building footprints for overlaps and invalid geometry.
- Record gaps instead of silently filling them with invented data.

## Licensing rule

Before public hosting, review each source's current license and attribution requirement. Derived artifacts must include required attribution in the app and repository documentation.
