# Pipeline runner

The initial browser prototype uses a compact study mesh until the real graph passes ingestion checks. The real-ingestion command downloads public Santa Monica tree data, an OSM pedestrian/building extract, and USGS LiDAR EPT metadata; then it produces a browser-ready graph with actual tree-canopy features.

Run `npm run pipeline:verify` to validate source provenance metadata. Run `npm run pipeline:ingest` to acquire and normalize the public sources. This creates ignored snapshots under `data/raw/`, normalized artifacts under `data/derived/`, and `public/data/real-graph.json`; the browser prefers that graph automatically when it exists.

`npm run pipeline:lidar` additionally runs the generated ground-DEM and surface-DSM PDAL pipelines against the official USGS EPT dataset. The EPT reader is bounded to Santa Monica *before* streaming and requests 2 m research resolution; it requires a local `pdal` executable and can still take substantial time/disk. Then run `npm run pipeline:lidar-features` to join DSM-minus-DEM obstruction height to each pedestrian edge and promote the browser graph to the LiDAR-enhanced version.

Run `npm run pipeline:shadows` after the LiDAR stage to create deployable OSM building footprints and LiDAR-derived building/tree heights for the interactive shadow map layer.

Run `npm run pipeline:lidar-grid` after the LiDAR stage to package the DSM and DEM into a 10 m browser-readable elevation grid. The client uses this compact surface model to ray-cast from walking edges toward the live sun position; a surface intersection means that edge is physically occluded by terrain, buildings, or canopy in the LiDAR surface model.
