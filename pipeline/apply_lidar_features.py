"""Join LiDAR surface obstruction to normalized pedestrian edges.

Run with Homebrew's Python (which ships the GDAL Python bindings):
`/opt/homebrew/bin/python3.14 pipeline/apply_lidar_features.py`.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from osgeo import gdal


ROOT = Path(__file__).resolve().parents[1]
GRAPH = ROOT / "data" / "derived" / "pedestrian-graph.json"
DEM = ROOT / "data" / "derived" / "ground-dem.tif"
DSM = ROOT / "data" / "derived" / "surface-dsm.tif"
OUTPUT = ROOT / "data" / "derived" / "pedestrian-graph-lidar.json"
PUBLIC = ROOT / "public" / "data" / "real-graph.json"
METADATA = ROOT / "public" / "data" / "real-metadata.json"


def web_mercator(longitude: float, latitude: float) -> tuple[float, float]:
    x = longitude * 20037508.34 / 180
    y = math.log(math.tan((90 + latitude) * math.pi / 360)) / (math.pi / 180)
    return x, y * 20037508.34 / 180


def pixel_value(values: np.ndarray, transform: tuple[float, ...], x: float, y: float) -> float:
    column = int((x - transform[0]) / transform[1])
    row = int((y - transform[3]) / transform[5])
    if row < 0 or column < 0 or row >= values.shape[0] or column >= values.shape[1]:
        return float("nan")
    return float(values[row, column])


def main() -> None:
    if not all(path.exists() for path in (GRAPH, DEM, DSM)):
        raise SystemExit("Missing graph or LiDAR rasters. Run `npm run pipeline:lidar` first.")
    graph = json.loads(GRAPH.read_text())
    dem_dataset = gdal.Open(str(DEM))
    dsm_dataset = gdal.Open(str(DSM))
    if not dem_dataset or not dsm_dataset:
        raise SystemExit("GDAL could not open LiDAR rasters.")
    transform = dem_dataset.GetGeoTransform()
    dem = dem_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    dsm = dsm_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    nodes = {node["id"]: node["coordinate"] for node in graph["nodes"]}
    sampled = 0
    for edge in graph["edges"]:
        start, end = nodes.get(edge["from"]), nodes.get(edge["to"])
        if not start or not end:
            continue
        longitude, latitude = (start[0] + end[0]) / 2, (start[1] + end[1]) / 2
        x, y = web_mercator(longitude, latitude)
        height = pixel_value(dsm, transform, x, y) - pixel_value(dem, transform, x, y)
        if not math.isfinite(height) or height <= 1.0:
            continue
        # The DSM-minus-DEM signal includes both buildings and vegetation. Existing
        # tree-inventory cover discounts vegetation before adding obstruction shade.
        edge["buildingShade"] = round(min(0.82, max(0.0, height / 18.0) * (1 - edge["treeCover"] * 0.65)), 3)
        edge["confidence"] = round(max(edge["confidence"], 0.74), 2)
        sampled += 1
    graph["lidar"] = {"dem": "ground-dem.tif", "dsm": "surface-dsm.tif", "resolution_m": 2, "edges_with_obstruction": sampled}
    OUTPUT.write_text(json.dumps(graph) + "\n")
    PUBLIC.write_text(json.dumps(graph) + "\n")
    if METADATA.exists():
        metadata = json.loads(METADATA.read_text())
        metadata["lidar"] = graph["lidar"]
        metadata["limitations"] = [
            "OSM street-centerline edges are a pedestrian-network proxy until sidewalk geometry is separately validated.",
            "Tree cover is derived from the city public-tree inventory canopy attributes.",
            "LiDAR obstruction expresses DSM-minus-DEM height and may include vegetation; tree inventory reduces, but does not eliminate, that overlap.",
        ]
        METADATA.write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"Applied LiDAR obstruction features to {sampled} pedestrian edges.")


if __name__ == "__main__":
    main()
