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

CONFIG = ROOT / "config"
METRICS_YAML = CONFIG / "metrics.yaml"

WEB = ROOT / "web"
WEB_PUBLIC_DATA = WEB / "public" / "data"

DOCS = ROOT / "docs"
ADR_DIR = DOCS / "adr"

for _d in (DATA, RAW, CACHE, PROCESSED):
    _d.mkdir(parents=True, exist_ok=True)
