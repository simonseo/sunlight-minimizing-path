"""Build a tiny, deterministic fixture report for the browser prototype.

This does not substitute for the documented LiDAR/OSM ingestion pipeline. It makes
the current study-mesh status explicit until the larger source snapshots arrive.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
output = ROOT / "public" / "data" / "study-metadata.json"
output.parent.mkdir(parents=True, exist_ok=True)
payload = {
    "artifact_version": "study-mesh-v1",
    "generated_at": datetime.now(timezone.utc).isoformat(),
    "coverage": "Central Santa Monica study mesh; not citywide ground truth",
    "shade_method": "Deterministic research proxy using time, corridor canopy, and orientation features",
    "next_required_input": "LiDAR/tree/OSM normalized snapshots",
}
output.write_text(json.dumps(payload, indent=2) + "\n")
print(f"Wrote {output.relative_to(ROOT)}")
