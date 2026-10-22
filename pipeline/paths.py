"""Canonical filesystem locations. Everything that touches disk goes through here."""

from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

DATA = ROOT / "data"
RAW = DATA / "raw"
CACHE = DATA / "cache"
PROCESSED = DATA / "processed"
MANIFEST = DATA / "manifest.json"
QA_REPORT = DATA / "qa_report.md"
DB = DATA / "market.duckdb"
BUILD_META = DATA / "build.json"

CONFIG = ROOT / "config"
METRICS_YAML = CONFIG / "metrics.yaml"

WEB = ROOT / "web"
WEB_PUBLIC_DATA = WEB / "public" / "data"

DOCS = ROOT / "docs"
ADR_DIR = DOCS / "adr"


def ensure_dirs() -> None:
    """Create the writable directories. Called explicitly, never at import.

    Creating directories as an import side effect breaks wheel installs (the
    package directory is read-only) and makes merely importing the module a
    write to the user's disk.
    """
    for directory in (DATA, RAW, CACHE, PROCESSED):
        directory.mkdir(parents=True, exist_ok=True)

