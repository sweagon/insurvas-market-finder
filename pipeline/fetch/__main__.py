"""Fetch every source and write the manifest. Run: ``python -m pipeline.fetch``."""

from __future__ import annotations

from pipeline import paths
from pipeline.fetch import cbp, census_acs, geography, irs_soi, places, popest
from pipeline.fetch.bea import fetch_bea
from pipeline.fetch.http import Manifest


def main() -> None:
    manifest = Manifest()

    print("- population estimates (PEP Vintage 2025)")
    pep = popest.fetch_popest(manifest)
    print(f"  {pep.height} counties")

    print("- ACS 2020-2024 5-year (table-based Summary File)")
    acs = census_acs.fetch_acs_wide(manifest)
    print(f"  {acs.height} counties x {acs.width} columns")

    print("- geography (cartographic boundaries + gazetteer)")
    geography.fetch_geography(manifest)

    print("- IRS SOI county income (TY2023)")
    irs = irs_soi.fetch_irs(manifest)
    print(f"  {irs.height} counties")

    print("- County Business Patterns (NAICS 524210)")
    cb = cbp.fetch_cbp(manifest)
    print(f"  {cb.height} counties")

    print("- CDC PLACES 2025")
    pl = places.fetch_places(manifest)
    print(f"  {pl.height} counties")

    print("- BEA CAINC4 (dividends, interest, rent)")
    bea = fetch_bea(manifest)
    print(f"  {bea.height} counties")

    manifest.write(paths.MANIFEST)
    print(f"manifest -> {paths.MANIFEST}")


if __name__ == "__main__":
    main()
