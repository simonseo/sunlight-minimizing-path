"""Build real building/tree geometry and heights for the interactive shadow layer."""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from osgeo import gdal


ROOT = Path(__file__).resolve().parents[1]
OSM = ROOT / "data" / "raw" / "osm-overpass.json"
TREES = ROOT / "data" / "derived" / "trees-normalized.json"
DEM = ROOT / "data" / "derived" / "ground-dem.tif"
DSM = ROOT / "data" / "derived" / "surface-dsm.tif"
OUTPUT = ROOT / "public" / "data" / "environmental-features.json"


def web_mercator(longitude: float, latitude: float) -> tuple[float, float]:
    x = longitude * 20037508.34 / 180
    y = math.log(math.tan((90 + latitude) * math.pi / 360)) / (math.pi / 180)
    return x, y * 20037508.34 / 180


def height_at(values: np.ndarray, transform: tuple[float, ...], coordinate: list[float]) -> float:
    x, y = web_mercator(coordinate[0], coordinate[1])
    column = int((x - transform[0]) / transform[1])
    row = int((y - transform[3]) / transform[5])
    if row < 0 or column < 0 or row >= values.shape[0] or column >= values.shape[1]:
        return 0.0
    return float(values[row, column])


def building_height(dem: np.ndarray, dsm: np.ndarray, transform: tuple[float, ...], ring: list[list[float]], tags: dict[str, str]) -> float:
    if tags.get("height"):
        try:
            return float(tags["height"].replace("m", "").strip())
        except ValueError:
            pass
    if tags.get("building:levels"):
        try:
            return float(tags["building:levels"]) * 3.1
        except ValueError:
            pass
    samples = [max(0.0, height_at(dsm, transform, point) - height_at(dem, transform, point)) for point in ring[:-1]]
    return float(np.percentile(samples, 75)) if samples else 0.0


def main() -> None:
    if not all(path.exists() for path in (OSM, TREES, DEM, DSM)):
        raise SystemExit("Missing OSM, tree, or LiDAR inputs. Run the public ingestion and LiDAR pipeline first.")
    raw = json.loads(OSM.read_text())
    tree_rows = json.loads(TREES.read_text())
    dem_dataset, dsm_dataset = gdal.Open(str(DEM)), gdal.Open(str(DSM))
    if not dem_dataset or not dsm_dataset:
        raise SystemExit("GDAL could not read LiDAR rasters.")
    transform = dem_dataset.GetGeoTransform()
    dem = dem_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    dsm = dsm_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    nodes = {item["id"]: [item["lon"], item["lat"]] for item in raw["elements"] if item.get("type") == "node"}
    buildings = []
    for way in raw["elements"]:
        tags = way.get("tags", {})
        if way.get("type") != "way" or "building" not in tags:
            continue
        ring = [nodes[node_id] for node_id in way.get("nodes", []) if node_id in nodes]
        if len(ring) < 3:
            continue
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        height = building_height(dem, dsm, transform, ring, tags)
        if height < 2.0:
            continue
        buildings.append({"id": str(way["id"]), "ring": ring, "height_m": round(min(height, 150.0), 1)})
    trees = []
    for tree in tree_rows:
        lidar_height = max(0.0, height_at(dsm, transform, tree["coordinate"]) - height_at(dem, transform, tree["coordinate"]))
        declared_height = float(tree.get("height_ft", 0.0)) * 0.3048
        height = declared_height if declared_height > 2 else lidar_height
        if height > 1:
            trees.append({"id": tree["id"], "coordinate": tree["coordinate"], "height_m": round(min(height, 80.0), 1), "crown_radius_m": round(tree["crown_radius_km"] * 1000, 1)})
    OUTPUT.write_text(json.dumps({"buildings": buildings, "trees": trees, "source": "OSM footprints + USGS LiDAR DSM/DEM + Santa Monica tree inventory"}) + "\n")
    print(f"Wrote {len(buildings)} buildings and {len(trees)} trees for modeled shadows.")


if __name__ == "__main__":
    main()
