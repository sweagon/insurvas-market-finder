"""Download and unpack the geography inputs used by the pipeline and the web map.

Outputs under ``data/raw/geo/``:
  cb_2024_us_county_5m/   (counties incl. the 9 CT planning regions)
  cb_2024_us_state_5m/
  gazetteer/2024_Gaz_counties_national.txt

The Node script ``web/scripts/build-topo.mjs`` turns the shapefiles into the
pre-projected ``web/public/data/topo.json``.
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

from pipeline.fetch.http import Manifest, fetch_bytes
from pipeline.paths import RAW

COUNTY_ZIP = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_county_5m.zip"
STATE_ZIP = "https://www2.census.gov/geo/tiger/GENZ2024/shp/cb_2024_us_state_5m.zip"
GAZETTEER_ZIP = (
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/"
    "2024_Gaz_counties_national.zip"
)

GEO_DIR = RAW / "geo"


def _download_zip(url: str, dest: Path, manifest: Manifest, key: str) -> Path:
    result = fetch_bytes(url, suffix=".zip")
    manifest.record(key, result.manifest_entry(vintage="2024", source="geo", geography="county"))
    assert result.path is not None
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(result.path.read_bytes())) as zf:
        zf.extractall(dest)
    return dest


def fetch_geography(manifest: Manifest) -> dict[str, Path]:
    county = _download_zip(COUNTY_ZIP, GEO_DIR / "cb_2024_us_county_5m", manifest, "geo_county_5m")
    state = _download_zip(STATE_ZIP, GEO_DIR / "cb_2024_us_state_5m", manifest, "geo_state_5m")
    gaz_dir = GEO_DIR / "gazetteer"
    _download_zip(GAZETTEER_ZIP, gaz_dir, manifest, "geo_gazetteer_2024")
    gazetteer = next(gaz_dir.glob("*.txt"))
    return {"county": county, "state": state, "gazetteer": gazetteer}
