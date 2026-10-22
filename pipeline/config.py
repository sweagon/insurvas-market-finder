"""Typed access to config/metrics.yaml - the single source of truth (rule R3).

Nothing in the pipeline, the scorer, the API or the UI may hard-code a metric
definition. Everything is read from this file.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "metrics.yaml"

Direction = Literal["higher_is_better", "lower_is_better"]
Transform = Literal["none", "log", "winsor_log"]
MoeMethod = Literal["none", "acs_api", "derived_prop", "derived_ratio"]
SubScoreId = Literal["size", "affordability", "need", "reachability", "whitespace", "insurability"]
LensId = Literal["volume", "balanced", "final_expense", "legacy_wealth", "spouse_protection"]


class LensWeights(BaseModel):
    """Weight given to each sub-score inside one lens. Must sum to 1.0."""

    size: float
    affordability: float
    need: float
    reachability: float
    whitespace: float
    insurability: float

    def as_dict(self) -> dict[str, float]:
        return {
            "size": self.size,
            "affordability": self.affordability,
            "need": self.need,
            "reachability": self.reachability,
            "whitespace": self.whitespace,
            "insurability": self.insurability,
        }


class Lens(BaseModel):
    id: str = ""
    label: str
    description: str
    default: bool = False
    weights: LensWeights
    flip_insurance_sign: bool = False


class MetricLensWeights(BaseModel):
    """How much this metric contributes inside its own sub-score, per lens."""

    volume: float = 0.0
    balanced: float = 0.0
    final_expense: float = 0.0
    legacy_wealth: float = 0.0
    spouse_protection: float = 0.0


class Metric(BaseModel):
    id: str
    label: str
    subscore: SubScoreId
    source: str
    table_field: str
    vintage: str
    unit: str
    direction: Direction
    transform: Transform
    moe: MoeMethod
    scored: bool = True
    modeled: bool = False
    lens_weights: MetricLensWeights = Field(default_factory=MetricLensWeights)
    caveats: str = ""
    # Per-metric override of the global coverage floor. Set this when a source
    # has a known, documented gap (e.g. a release that does not cover two
    # states) so the QA report can demand what is actually achievable.
    min_coverage: float | None = None


class Params(BaseModel):
    target_age_min: int = 60
    econ_age_min: int = 65
    eligibility_min_60plus: int = 2000
    winsor_lower: float = 0.01
    winsor_upper: float = 0.99
    monte_carlo_draws: int = 500
    monte_carlo_moe_confidence: float = 0.90
    shrinkage: str = "empirical_bayes"
    min_metric_coverage: float = 0.90
    expected_counties: int = 3144
    county_count_tolerance: float = 0.01


class SubScore(BaseModel):
    id: str = ""
    label: str
    description: str


class Source(BaseModel):
    name: str
    url: str
    license: str
    attribution: str
    caveats: str = ""


class Vintages(BaseModel):
    acs: str
    popest: int
    irs: int
    cbp: int
    places: int
    bea: int
    gazetteer: int


class Geography(BaseModel):
    include_pr: bool = False
    fips_length: int = 5
    ct_geo: str = "planning_regions"


class _Raw(BaseModel):
    version: int
    params: Params
    vintages: Vintages
    geography: Geography
    sources: dict[str, Source]
    priors: dict[str, Any]
    subscores: dict[str, SubScore]
    lenses: dict[str, Lens]
    metrics: list[Metric]
    rule_R7: str = ""  # noqa: N815 - matches the config key


class MetricsConfig(_Raw):
    """Fully-loaded, validated metrics configuration."""

    @property
    def metric_by_id(self) -> dict[str, Metric]:
        return {m.id: m for m in self.metrics}

    @property
    def scored_metrics(self) -> list[Metric]:
        return [m for m in self.metrics if m.scored]

    @property
    def default_lens_id(self) -> str:
        for lens in self.lenses.values():
            if lens.default:
                return lens.id
        return "volume"

    def metric(self, metric_id: str) -> Metric:
        try:
            return self.metric_by_id[metric_id]
        except KeyError as exc:
            raise KeyError(f"Unknown metric id: {metric_id!r}") from exc

    def sub_score_ids(self) -> list[str]:
        return ["size", "affordability", "need", "reachability", "whitespace", "insurability"]

    def coverage_floor(self, metric: Metric) -> float:
        """The share of counties a metric must be present for.

        A per-metric override wins over the global floor; the override exists
        for sources with a known, documented gap.
        """
        if metric.min_coverage is not None:
            return float(metric.min_coverage)
        return float(self.params.min_metric_coverage)

    def lens_weights_fraction(self, lens_id: str) -> dict[str, float]:
        """Sub-score weights for a lens as fractions in [0, 1] summing to 1.0."""
        raw = self.lenses[lens_id].weights.as_dict()
        total = sum(raw.values()) or 1.0
        return {k: v / total for k, v in raw.items()}

    def metric_weights_fraction(self, lens_id: str) -> dict[str, float]:
        """Metric weights within each sub-score as fractions summing to 1.0."""
        out: dict[str, float] = {}
        for sub in self.sub_score_ids():
            ids = [m for m in self.scored_metrics if m.subscore == sub]
            weights = {m.id: float(getattr(m.lens_weights, lens_id)) for m in ids}
            total = sum(weights.values())
            if total <= 0:
                continue
            for mid, w in weights.items():
                out[mid] = w / total
        return out


@lru_cache(maxsize=1)
def load_config(path: str | Path | None = None) -> MetricsConfig:
    """Load and validate config/metrics.yaml (cached)."""
    cfg_path = Path(path) if path else CONFIG_PATH
    with cfg_path.open("r", encoding="utf-8") as fh:
        raw = yaml.safe_load(fh)
    _inject_ids(raw)
    cfg = MetricsConfig.model_validate(raw)
    _validate_weights(cfg)
    return cfg


def _inject_ids(raw: dict[str, Any]) -> None:
    """YAML maps are keyed by id; copy the key into each object's ``id`` field."""
    for section in ("subscores", "lenses", "sources"):
        for key, value in (raw.get(section) or {}).items():
            value.setdefault("id", key)


def _validate_weights(cfg: MetricsConfig) -> None:
    """Every lens's sub-score weights must sum to 100; every metric weight >= 0."""
    for lens in cfg.lenses.values():
        total = sum(lens.weights.as_dict().values())
        if abs(total - 100.0) > 1e-6:
            raise ValueError(f"Lens {lens.id!r} sub-score weights sum to {total}, expected 100")
    for metric in cfg.metrics:
        for lens_id, w in metric.lens_weights.model_dump().items():
            if w < 0:
                raise ValueError(f"Metric {metric.id!r} has negative weight in lens {lens_id!r}")
