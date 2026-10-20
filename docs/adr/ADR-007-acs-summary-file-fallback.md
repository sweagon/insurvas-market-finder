# ADR-007: ACS data via the table-based Summary File, not the API

- Status: Accepted
- Date: 2026-10-20
- Owners: Insurvas data team

## Context

The American Community Survey 5-year estimates (2020-2024) supply most of the
affordability, need and reachability metrics. The obvious access path is the
Census data API (`api.census.gov/data/2024/acs/acs5`).

During initial recon this endpoint responded **without a key**. By build time it
had changed: every request now returns an HTML `missing_key.html` page, i.e. the
API requires a registered key for all callers. The key supplied by the
stakeholder (`27130be7...c0f0`) validates as **invalid** against the API.

Options considered:

1. **Request a new API key and block the build.** Rejected: introduces an
   out-of-band human dependency and a secret to manage; unacceptable for a build
   that must run unattended.
2. **Scrape the API unkeyed.** Impossible: the endpoint refuses unkeyed calls.
3. **Use the table-based Summary File.** A fully public, key-less bulk download
   published on `www2.census.gov` with identical estimates.

## Decision

We pull ACS 2020-2024 5-year county estimates from the **table-based Summary
File**:

```
https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/data/5YRData/
```

Concretely: `acsdt5y2024-b{XX}.dat` table files plus the geography lookup, for
the six tables we need (B09021, B19037, B19049, B25027, B25077, B28005). The
parsed wide frame is cached under `data/cache` and verified to contain 3,144
county-equivalents (including the nine Connecticut planning regions) plus the
national sentinel rows, which are dropped.

If a valid API key is configured later, `pipeline/fetch/census_acs.py` is the
single place that must change; the output schema is identical.

## Consequences

- The build is fully reproducible with no secrets and no key management.
- The Summary File ships margins of error alongside estimates; we keep them so
  the MOE arithmetic (ADR-003, `transform/moe.py`) and Monte Carlo stay honest.
- The download is larger than an API pull (hundreds of MB), but it is cached and
  re-verified by sha256 in the fetch manifest.
- Vintage is pinned to 2020-2024 in `config/metrics.yaml`; the annual release
  roll-forward is a one-line change to `YEAR` in the fetcher plus a rebuild.
