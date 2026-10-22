"""The manifest is the provenance record: rule R2 compliance is a contract.

These tests pin the shape of ``data/manifest.json`` and the provenance of
every entry, so a fetch that loses its url/sha256/retrieved_at fails here
rather than in a review.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from pipeline import paths
from pipeline.config import load_config
from pipeline.fetch.http import Manifest

REQUIRED_ENTRY_FIELDS = ("url", "sha256", "retrieved_at", "vintage", "source", "status")


@pytest.fixture(scope="module")
def built_manifest() -> dict:
    path = Path(paths.MANIFEST)
    if not path.exists():
        pytest.skip("dataset not built; run `make build`")
    return json.loads(path.read_text(encoding="utf-8"))


def test_every_entry_records_its_provenance(built_manifest: dict) -> None:
    entries = built_manifest["entries"]
    assert entries, "the manifest records no fetches"
    for name, entry in entries.items():
        for field in REQUIRED_ENTRY_FIELDS:
            assert field in entry, f"entry {name} has no {field}"
        assert entry["status"] == "ok", f"{name} has status {entry['status']}"
        assert entry["url"].startswith("https://")
        assert len(entry["sha256"]) == 64
        assert entry["retrieved_at"]


def test_manifest_covers_every_configured_source(built_manifest: dict) -> None:
    cfg = load_config()
    recorded = {e["source"] for e in built_manifest["entries"].values()}
    missing = set(cfg.sources) - recorded
    assert not missing, f"config sources never fetched: {sorted(missing)}"


def test_manifest_records_the_build_and_its_metric_sources(built_manifest: dict) -> None:
    cfg = load_config()
    build = built_manifest.get("build")
    assert build is not None, "the manifest has no build block"
    assert build["counties"] > 0
    assert build["config_hash"]
    assert built_manifest["config_sources"], "no config source list"
    metric_sources = built_manifest["metric_sources"]
    assert set(metric_sources) == {m.id for m in cfg.metrics}
    for m in cfg.metrics:
        entry = metric_sources[m.id]
        assert entry["source"] == m.source
        assert entry["vintage"] == m.vintage
        assert entry["source"] in cfg.sources


def test_manifest_write_keeps_extra_metadata(tmp_path: Path) -> None:
    manifest = Manifest()
    manifest.record(
        "test",
        {
            "url": "https://example.com/x",
            "sha256": "0" * 64,
            "retrieved_at": "2026-01-01T00:00:00+00:00",
            "vintage": "2024",
            "source": "acs",
            "status": "ok",
        },
    )
    target = tmp_path / "manifest.json"
    manifest.write(target, extra={"build": {"counties": 3}})
    written = json.loads(target.read_text(encoding="utf-8"))
    assert written["build"]["counties"] == 3
    assert written["entries"]["test"]["source"] == "acs"
