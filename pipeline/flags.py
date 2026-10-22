"""Derived-data flags shared by the build, QA and the web exporter.

A flag is a boolean column on ``counties.json`` that says an estimate was
imputed or shrunk. The UI must be able to attach the right caveat to the
right metric, so the mapping lives beside the flag list rather than being
re-guessed in the SPA.
"""

from __future__ import annotations

FLAG_COLS = [
    "shrunk_agencies",
    "shrunk_chronic",
    "shrunk_risk",
    "imputed_ssa_share",
    "shrunk_ssa_share",
]

FLAG_DESCRIPTION = {
    "shrunk_agencies": "Small-county agency counts are shrunk toward the state mean.",
    "shrunk_chronic": "Small-county chronic-condition rates are shrunk toward the state mean.",
    "shrunk_risk": "Small-county risk-behaviour rates are shrunk toward the state mean.",
    "imputed_ssa_share": (
        "The county SSA share was outside its plausible range, so the "
        "published state share is used."
    ),
    "shrunk_ssa_share": (
        "The county SSA share is shrunk toward the state share for a small "
        "beneficiary count."
    ),
}

METRIC_FLAGS: dict[str, tuple[str, ...]] = {
    "agencies_per_1000_60plus": ("shrunk_agencies",),
    "chronic_burden_composite": ("shrunk_chronic",),
    "risk_behaviour_composite": ("shrunk_risk",),
    "ssa_beneficiary_share_65plus": ("imputed_ssa_share", "shrunk_ssa_share"),
}
