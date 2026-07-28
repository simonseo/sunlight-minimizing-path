"""Package the USGS DSM/DEM as a browser-readable grid for 3D sun-ray casting.

The raw 2 m GeoTIFFs are intentionally kept out of the web bundle. This creates a
10 m, decimeter-quantized surface/ground grid that preserves building-scale height
changes while remaining small enough to load on demand in the research prototype.

Run with Homebrew Python/GDAL after `pipeline:lidar`:
`/opt/homebrew/bin/python3.14 pipeline/build_lidar_surface_grid.py`.
"""

from __future__ import annotations

import base64
import json
from pathlib import Path

import numpy as np
from osgeo import gdal


ROOT = Path(__file__).resolve().parents[1]
DEM = ROOT / "data" / "derived" / "ground-dem.tif"
DSM = ROOT / "data" / "derived" / "surface-dsm.tif"
OUTPUT = ROOT / "public" / "data" / "lidar-surface-grid.json"
TARGET_RESOLUTION_METERS = 10
NODATA = 65535


def reduce_grid(values: np.ndarray, factor: int, reducer: str) -> np.ndarray:
    rows = values.shape[0] // factor * factor
    columns = values.shape[1] // factor * factor
    cropped = values[:rows, :columns]
    blocks = cropped.reshape(rows // factor, factor, columns // factor, factor)
    with np.errstate(all="ignore"):
        return np.nanmax(blocks, axis=(1, 3)) if reducer == "max" else np.nanmedian(blocks, axis=(1, 3))


def pack(values: np.ndarray) -> str:
    safe = np.where(np.isfinite(values), np.clip(np.rint(values * 10), 0, NODATA - 1), NODATA).astype("<u2")
    return base64.b64encode(safe.tobytes()).decode("ascii")


def main() -> None:
    if not DEM.exists() or not DSM.exists():
        raise SystemExit("Missing DSM/DEM. Run `npm run pipeline:lidar` first.")
    dem_dataset, dsm_dataset = gdal.Open(str(DEM)), gdal.Open(str(DSM))
    if not dem_dataset or not dsm_dataset:
        raise SystemExit("GDAL could not open LiDAR GeoTIFFs.")
    transform = dem_dataset.GetGeoTransform()
    source_resolution = abs(transform[1])
    factor = round(TARGET_RESOLUTION_METERS / source_resolution)
    if factor < 1 or abs(factor * source_resolution - TARGET_RESOLUTION_METERS) > 0.01:
        raise SystemExit(f"Cannot reduce {source_resolution} m LiDAR grid to {TARGET_RESOLUTION_METERS} m evenly.")
    ground = dem_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    surface = dsm_dataset.GetRasterBand(1).ReadAsArray().astype(np.float32)
    ground_grid = reduce_grid(ground, factor, "median")
    surface_grid = reduce_grid(surface, factor, "max")
    rows, columns = ground_grid.shape
    payload = {
        "version": 1,
        "crs": "EPSG:3857",
        "origin_m": [transform[0], transform[3]],
        "resolution_m": TARGET_RESOLUTION_METERS,
        "width": columns,
        "height": rows,
        "quantization_m": 0.1,
        "nodata": NODATA,
        "ground_decimeters_base64": pack(ground_grid),
        "surface_decimeters_base64": pack(surface_grid),
        "source": "USGS 3DEP CA_LosAngeles_1_B23 DSM/DEM, max surface and median ground resampled from 2 m",
    }
    OUTPUT.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(f"Wrote {columns}x{rows} LiDAR surface grid ({OUTPUT.stat().st_size / 1_000_000:.1f} MB).")


if __name__ == "__main__":
    main()
