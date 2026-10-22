"""The API contract: what a client may rely on.

These tests run against the built dataset. They cover the endpoints that the
web app depends on and the two failure modes that matter: a dataset that is
not built, and a county that does not exist.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.main import app
from pipeline import paths

pytestmark = pytest.mark.skipif(
    not paths.DB.exists(), reason="dataset not built; run `make build`"
)


@pytest.fixture(scope="module")
def client() -> TestClient:
    return TestClient(app)


def test_health_reports_the_build(client: TestClient) -> None:
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"ok", "stale"}
    assert body["built_at"]


def test_manifest_endpoint_serves_the_provenance_record(client: TestClient) -> None:
    resp = client.get("/api/manifest")
    assert resp.status_code == 200
    body = resp.json()
    assert body["entries"], "the manifest is empty"
    for name, entry in body["entries"].items():
        assert entry["url"].startswith("https://"), name
        assert entry["status"] == "ok", name


def test_meta_lists_every_configured_metric(client: TestClient) -> None:
    resp = client.get("/api/meta")
    assert resp.status_code == 200
    body = resp.json()
    ids = {m["id"] for m in body["metrics"]}
    assert "pop_60plus" in ids
    assert "non_earned_income_per_capita" in ids
    assert set(body["lenses"]) == {"volume", "balanced", "final_expense", "legacy_wealth",
                                   "spouse_protection"}


def test_rankings_are_ordered_and_scored(client: TestClient) -> None:
    resp = client.get("/api/rankings?lens=volume")
    assert resp.status_code == 200
    body = resp.json()
    rows = body["results"]
    assert rows
    assert body["total"] >= len(rows)
    totals = [r["total"] for r in rows if r["total"] is not None]
    assert totals == sorted(totals, reverse=True)
    assert all(0 <= r["coverage"] <= 1 for r in rows)
    assert all(r["partial"] is not None for r in rows)


def test_rankings_pagination_does_not_overlap(client: TestClient) -> None:
    first = client.get("/api/rankings?lens=volume&limit=10&offset=0").json()["results"]
    second = client.get("/api/rankings?lens=volume&limit=10&offset=10").json()["results"]
    assert {r["fips"] for r in first}.isdisjoint({r["fips"] for r in second})


def test_county_returns_its_own_metric_values(client: TestClient) -> None:
    resp = client.get("/api/county/37019")
    assert resp.status_code == 200
    body = resp.json()
    assert body["county"]["fips"] == "37019"
    assert body["scores"], "no scores for an existing county"
    metrics = body["metrics"]
    assert "pop_60plus" in metrics
    assert metrics["pop_60plus"] is not None


def test_unknown_county_is_a_404(client: TestClient) -> None:
    assert client.get("/api/county/00000").status_code == 404


def test_unknown_lens_is_a_400(client: TestClient) -> None:
    assert client.get("/api/rankings?lens=nope").status_code == 400
