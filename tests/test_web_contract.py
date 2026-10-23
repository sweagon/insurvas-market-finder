"""The web artefacts are a contract, not a snapshot.

A model change is only safely shipped when the generated catalogue, the
columnar data and the frontend agree. These tests fail when an artefact is
stale, when a metric is missing its UI description, or when a new unit/flag
was not wired through. See docs/design/UI_LIVE_CHANGE_PLAYBOOK.md.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from pipeline import paths
from pipeline.config import load_config
from pipeline.flags import METRIC_FLAGS

WEB = paths.WEB
CATALOG = WEB / "src" / "data" / "catalog.generated.json"
META = paths.WEB_PUBLIC_DATA / "meta.json"
COUNTIES = paths.WEB_PUBLIC_DATA / "counties.json"


@pytest.fixture(scope="module")
def cfg():
    return load_config()


@pytest.fixture(scope="module")
def catalog() -> dict:
    if not CATALOG.exists():
        pytest.skip("web catalogue not generated; run `make build`")
    return json.loads(CATALOG.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def meta() -> dict:
    if not META.exists():
        pytest.skip("dataset not built; run `make build`")
    return json.loads(META.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def counties() -> dict:
    if not COUNTIES.exists():
        pytest.skip("dataset not built; run `make build`")
    return json.loads(COUNTIES.read_text(encoding="utf-8"))


def _config_hash() -> str:
    raw = Path(paths.METRICS_YAML).read_bytes()
    return hashlib.sha256(raw).hexdigest()[:16]


def test_catalogue_is_generated_from_the_current_config(cfg, catalog) -> None:
    assert catalog["version"] == cfg.version
    assert catalog["config_hash"] == _config_hash()
    assert catalog["lens_order"] == cfg.lens_ids()
    assert catalog["subscore_order"] == cfg.sub_score_ids()
    assert catalog["default_lens"] == cfg.default_lens_id
    assert [m["id"] for m in catalog["metrics"]] == [m.id for m in cfg.metrics]


def test_metric_estimate_flags_are_consistent(cfg, catalog, meta) -> None:
    catalogue = {m["id"]: m["flags"] for m in catalog["metrics"]}
    served = {m["id"]: m["flags"] for m in meta["metrics"]}
    for metric in cfg.metrics:
        expected = list(METRIC_FLAGS.get(metric.id, ()))
        assert catalogue[metric.id] == expected
        assert served[metric.id] == expected


def test_every_metric_has_a_ui_description(cfg, meta) -> None:
    descriptions = {m["id"]: m["description"] for m in meta["metrics"]}
    for metric in cfg.metrics:
        assert descriptions.get(metric.id), f"{metric.id} has no meta description"


def test_catalogue_and_meta_agree(cfg, catalog, meta) -> None:
    assert catalog["lens_order"] == meta["lens_order"]
    assert catalog["subscore_order"] == meta["subscore_order"]
    assert catalog["default_lens"] == meta["default_lens"]
    assert {m["id"] for m in catalog["metrics"]} == {m["id"] for m in meta["metrics"]}
    assert set(catalog["units"]) == set(meta["units"])


def test_meta_is_not_stale(cfg, meta) -> None:
    current = _config_hash()
    assert meta["meta"]["config_hash"] == current, (
        "web/public/data is older than config/metrics.yaml: "
        "run `make build` before shipping"
    )


def test_every_metric_and_flag_is_served(cfg, catalog, counties) -> None:
    columns = set(counties["columns"])
    missing = {m.id for m in cfg.metrics} - columns
    assert not missing, f"metrics missing from counties.json: {sorted(missing)}"
    missing_flags = set(catalog["flags"]) - columns
    assert not missing_flags, f"flags missing from counties.json: {sorted(missing_flags)}"
    assert counties["length"] == len(counties["columns"]["fips"])


def test_every_declared_unit_has_a_contract(cfg, catalog) -> None:
    """A unit must be declared and non-empty; the TS test covers formatting."""
    assert catalog["units"], "no units declared"
    for metric in cfg.metrics:
        assert metric.unit in catalog["units"]


def test_public_model_config_is_current() -> None:
    served = paths.WEB_PUBLIC_DATA / "metrics.yaml"
    assert served.exists(), "run `make build-data` to serve the model config"
    assert served.read_bytes() == Path(paths.METRICS_YAML).read_bytes()
