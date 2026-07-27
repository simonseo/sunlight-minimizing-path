"""Download and normalize public Santa Monica routing inputs.

The command intentionally separates source acquisition from expensive LiDAR raster
processing. It can produce a browser-ready graph with real OSM and tree-inventory
features immediately, then adds LiDAR-derived DSM/DEM rasters when PDAL is
available. All outputs include a provenance report and are ignored by Git.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
DERIVED = ROOT / "data" / "derived"
PUBLIC = ROOT / "public" / "data"

# City envelope with a small buffer. It is only used for acquisition/cropping.
BBOX = (33.9900, -118.5250, 34.0550, -118.4350)  # south, west, north, east
OVERPASS_URL = "https://overpass-api.de/api/interpreter"
TREE_QUERY_URL = "https://gis.santamonica.gov/server/rest/services/Trees/FeatureServer/0/query"
LIDAR_EPT_URL = "https://usgs-lidar-public.s3.amazonaws.com/CA_LosAngeles_1_B23/ept.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def ensure_directories() -> None:
    for directory in (RAW, DERIVED, PUBLIC):
        directory.mkdir(parents=True, exist_ok=True)


def fetch_bytes(url: str, *, data: Optional[bytes] = None) -> bytes:
    request = Request(url, data=data, headers={"User-Agent": "heat-route-research-prototype/0.1"})
    with urlopen(request, timeout=180) as response:  # nosec B310: fixed public provider endpoints
        return response.read()


def write_bytes(path: Path, content: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(content)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def download_osm() -> Path:
    south, west, north, east = BBOX
    query = f"""[out:json][timeout:180];
(
  way[\"highway\"~\"^(footway|path|pedestrian|residential|unclassified|tertiary|secondary|primary|living_street|steps)$\"]({south},{west},{north},{east});
  way[\"building\"]({south},{west},{north},{east});
);
(._;>;);
out body;"""
    destination = RAW / "osm-overpass.json"
    write_bytes(destination, fetch_bytes(OVERPASS_URL, data=urlencode({"data": query}).encode()))
    return destination


def download_trees() -> Path:
    features: List[Dict[str, Any]] = []
    offset = 0
    page_size = 2000
    fields = "objectid,inventoryid,commonname,botanicalname,actualheight,actualcrown,canopy_spread__ft_,height,street"
    while True:
        parameters = {
            "where": "1=1",
            "outFields": fields,
            "returnGeometry": "true",
            "f": "geojson",
            "outSR": "4326",
            "resultOffset": str(offset),
            "resultRecordCount": str(page_size),
            "orderByFields": "objectid",
        }
        payload = json.loads(fetch_bytes(f"{TREE_QUERY_URL}?{urlencode(parameters)}").decode())
        batch = payload.get("features", [])
        features.extend(batch)
        if len(batch) < page_size:
            break
        offset += len(batch)
    destination = RAW / "trees.geojson"
    destination.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    return destination


def download_lidar_metadata() -> Path:
    destination = RAW / "lidar-ept.json"
    write_bytes(destination, fetch_bytes(LIDAR_EPT_URL))
    return destination


def coordinate_in_bbox(coordinate: Sequence[float]) -> bool:
    longitude, latitude = coordinate[0], coordinate[1]
    south, west, north, east = BBOX
    return west <= longitude <= east and south <= latitude <= north


def kilometers_between(a: Sequence[float], b: Sequence[float]) -> float:
    longitude_scale = 92.1
    latitude_scale = 111.1
    return math.hypot((a[0] - b[0]) * longitude_scale, (a[1] - b[1]) * latitude_scale)


def value_as_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalized_trees(tree_collection: Dict[str, Any]) -> List[Dict[str, Any]]:
    trees = []
    for feature in tree_collection.get("features", []):
        coordinate = feature.get("geometry", {}).get("coordinates")
        if not coordinate or not coordinate_in_bbox(coordinate):
            continue
        properties = feature.get("properties", {})
        crown_diameter_feet = max(
            value_as_float(properties.get("canopy_spread__ft_")),
            value_as_float(properties.get("actualcrown")),
            16.0,
        )
        trees.append({
            "id": str(properties.get("objectid") or properties.get("inventoryid")),
            "coordinate": [round(coordinate[0], 7), round(coordinate[1], 7)],
            "crown_radius_km": round((crown_diameter_feet * 0.3048 / 2) / 1000, 5),
            "height_ft": value_as_float(properties.get("actualheight")),
            "common_name": properties.get("commonname") or "Unknown tree",
            "street": properties.get("street") or "",
        })
    if len(trees) < 1000:
        raise ValueError(f"Tree query returned only {len(trees)} in-boundary features; refusing to build a misleading graph.")
    return trees


def tree_grid(trees: Iterable[Dict[str, Any]]) -> Dict[Tuple[int, int], List[Dict[str, Any]]]:
    grid: Dict[Tuple[int, int], List[Dict[str, Any]]] = {}
    for tree in trees:
        coordinate = tree["coordinate"]
        key = (math.floor(coordinate[0] / 0.002), math.floor(coordinate[1] / 0.002))
        grid.setdefault(key, []).append(tree)
    return grid


def tree_cover(midpoint: Sequence[float], grid: Dict[Tuple[int, int], List[Dict[str, Any]]]) -> float:
    origin = (math.floor(midpoint[0] / 0.002), math.floor(midpoint[1] / 0.002))
    influence = 0.0
    for longitude_cell in range(origin[0] - 1, origin[0] + 2):
        for latitude_cell in range(origin[1] - 1, origin[1] + 2):
            for tree in grid.get((longitude_cell, latitude_cell), []):
                radius = tree["crown_radius_km"]
                distance = kilometers_between(midpoint, tree["coordinate"])
                influence += max(0.0, 1 - distance / (radius + 0.012)) * 0.24
    return round(min(0.92, influence), 3)


def normalize_osm(osm: Dict[str, Any], trees: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = {item["id"]: item for item in osm.get("elements", []) if item.get("type") == "node"}
    tree_index = tree_grid(trees)
    graph_nodes: Dict[int, Dict[str, Any]] = {}
    graph_edges: List[Dict[str, Any]] = []
    pedestrian_highways = {"footway", "path", "pedestrian", "residential", "unclassified", "tertiary", "secondary", "primary", "living_street", "steps"}

    for way in osm.get("elements", []):
        tags = way.get("tags", {})
        highway = tags.get("highway")
        if way.get("type") != "way" or highway not in pedestrian_highways or tags.get("foot") == "no":
            continue
        way_nodes = way.get("nodes", [])
        for index, (start_id, end_id) in enumerate(zip(way_nodes, way_nodes[1:])):
            start = nodes.get(start_id)
            end = nodes.get(end_id)
            if not start or not end:
                continue
            start_coordinate = [start["lon"], start["lat"]]
            end_coordinate = [end["lon"], end["lat"]]
            if not coordinate_in_bbox(start_coordinate) or not coordinate_in_bbox(end_coordinate):
                continue
            for node in (start, end):
                graph_nodes[node["id"]] = {
                    "id": str(node["id"]),
                    "coordinate": [round(node["lon"], 7), round(node["lat"], 7)],
                    "label": tags.get("name") or tags.get("ref") or highway,
                }
            midpoint = [(start_coordinate[0] + end_coordinate[0]) / 2, (start_coordinate[1] + end_coordinate[1]) / 2]
            length_km = kilometers_between(start_coordinate, end_coordinate)
            graph_edges.append({
                "id": f"osm-{way['id']}-{index}",
                "from": str(start_id),
                "to": str(end_id),
                "minutes": round(max(0.08, length_km / 0.0833), 3),
                "treeCover": tree_cover(midpoint, tree_index),
                "buildingShade": 0.0,
                "confidence": 0.58 if highway in {"footway", "path", "pedestrian"} else 0.43,
                "corridor": tags.get("name") or tags.get("ref") or highway,
            })
    if len(graph_edges) < 500:
        raise ValueError(f"OSM normalization produced only {len(graph_edges)} edges; check Overpass response or bbox.")
    return {"nodes": list(graph_nodes.values()), "edges": graph_edges}


def web_mercator(longitude: float, latitude: float) -> Tuple[float, float]:
    x = longitude * 20037508.34 / 180
    y = math.log(math.tan((90 + latitude) * math.pi / 360)) / (math.pi / 180)
    return x, y * 20037508.34 / 180


def lidar_pipeline(output_name: str, classification: str, output_type: str) -> Dict[str, Any]:
    south, west, north, east = BBOX
    min_x, min_y = web_mercator(west, south)
    max_x, max_y = web_mercator(east, north)
    bounds = f"([{min_x:.2f},{max_x:.2f}],[{min_y:.2f},{max_y:.2f}])"
    return {
        "pipeline": [
            {
                "type": "readers.ept",
                "filename": LIDAR_EPT_URL,
                "bounds": bounds,
                "resolution": 2.0,
            },
            {"type": "filters.range", "limits": f"Classification[{classification}]"},
            {
                "type": "writers.gdal",
                "filename": str(DERIVED / output_name),
                "resolution": 2.0,
                "output_type": output_type,
                "gdaldriver": "GTiff",
            },
        ]
    }


def write_lidar_configs(run_lidar: bool) -> None:
    ground = DERIVED / "lidar-ground-dem.pipeline.json"
    surface = DERIVED / "lidar-surface-dsm.pipeline.json"
    ground.write_text(json.dumps(lidar_pipeline("ground-dem.tif", "2:2", "min"), indent=2) + "\n")
    surface.write_text(json.dumps(lidar_pipeline("surface-dsm.tif", "1:6", "max"), indent=2) + "\n")
    if not run_lidar:
        return
    executable = shutil.which("pdal")
    if not executable:
        raise RuntimeError("PDAL is required for --run-lidar. Install it, then rerun this command.")
    for pipeline in (ground, surface):
        subprocess.run([executable, "pipeline", str(pipeline)], check=True)


def write_report(inputs: Sequence[Path], graph: Dict[str, Any]) -> None:
    report = {
        "generated_at": utc_now(),
        "study_area": "Santa Monica, California",
        "source_files": [{"path": str(path.relative_to(ROOT)), "sha256": sha256(path)} for path in inputs],
        "graph": {"nodes": len(graph["nodes"]), "edges": len(graph["edges"])},
        "limitations": [
            "OSM street-centerline edges are a pedestrian-network proxy until sidewalk geometry is separately validated.",
            "Tree coverage is derived from public inventory canopy attributes.",
            "Building shade remains zero until the PDAL-generated DSM/DEM difference is incorporated.",
        ],
    }
    (DERIVED / "ingestion-report.json").write_text(json.dumps(report, indent=2) + "\n")
    (PUBLIC / "real-metadata.json").write_text(json.dumps(report, indent=2) + "\n")


def run(download: bool, run_lidar: bool) -> None:
    ensure_directories()
    osm_path = RAW / "osm-overpass.json"
    tree_path = RAW / "trees.geojson"
    lidar_path = RAW / "lidar-ept.json"
    if download:
        print("Downloading OpenStreetMap pedestrian/building data…")
        osm_path = download_osm()
        print("Downloading Santa Monica tree inventory…")
        tree_path = download_trees()
        print("Downloading USGS 3DEP EPT metadata…")
        lidar_path = download_lidar_metadata()
    for path in (osm_path, tree_path, lidar_path):
        if not path.exists():
            raise FileNotFoundError(f"Missing {path.relative_to(ROOT)}. Run with --download first.")

    trees = normalized_trees(json.loads(tree_path.read_text()))
    graph = normalize_osm(json.loads(osm_path.read_text()), trees)
    (DERIVED / "trees-normalized.json").write_text(json.dumps(trees) + "\n")
    (DERIVED / "pedestrian-graph.json").write_text(json.dumps(graph) + "\n")
    (PUBLIC / "real-graph.json").write_text(json.dumps(graph) + "\n")
    write_lidar_configs(run_lidar)
    write_report((osm_path, tree_path, lidar_path), graph)
    print(f"Wrote {len(graph['nodes'])} nodes and {len(graph['edges'])} edges from public Santa Monica sources.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--download", action="store_true", help="Download fresh public source snapshots before normalizing them.")
    parser.add_argument("--run-lidar", action="store_true", help="Run generated PDAL EPT-to-raster pipelines after normalization.")
    arguments = parser.parse_args()
    try:
        run(download=arguments.download, run_lidar=arguments.run_lidar)
    except (OSError, ValueError, RuntimeError, json.JSONDecodeError) as error:
        print(f"Ingestion failed: {error}", file=sys.stderr)
        raise SystemExit(1)
