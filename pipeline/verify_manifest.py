"""Validate the research source manifest without downloading external data."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / "source-manifest.json").read_text())

assert manifest["study_area"] == "Santa Monica, California"
assert len(manifest["sources"]) >= 4

for source in manifest["sources"]:
    for key in ("id", "purpose", "url", "license_note", "required_for_citywide_claims"):
        assert key in source, f"{source.get('id', 'unknown')} is missing {key}"
    assert source["url"].startswith("https://"), f"{source['id']} must use HTTPS"

print(f"Validated {len(manifest['sources'])} documented research data sources.")
