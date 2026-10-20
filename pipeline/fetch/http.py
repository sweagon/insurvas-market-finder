"""Cached, rate-limit-aware HTTP client.

Every download goes through :func:`fetch_bytes` so that:

* bytes are hashed (sha256) for the manifest,
* responses are cached on disk keyed by URL,
* a consistent User-Agent identifies the tool,
* retries are bounded and explicit.

Rule R2: we never invent a URL. Callers pass URLs that were verified live and
the resulting hash, final URL and status are recorded.
"""

from __future__ import annotations

import hashlib
import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from pipeline.paths import CACHE

USER_AGENT = "insurvas-market-finder/0.1 (+https://github.com/sweagon/insurvas-market-finder)"
DEFAULT_TIMEOUT = httpx.Timeout(120.0, connect=30.0)
MIN_RELEASE_AGE_DAYS = 14


@dataclass
class FetchResult:
    url: str
    final_url: str
    status_code: int
    sha256: str
    bytes_len: int
    content_type: str
    cached: bool
    retrieved_at: str
    path: Path | None = None

    def manifest_entry(self, *, vintage: str | None = None, **extra: Any) -> dict[str, Any]:
        entry: dict[str, Any] = {
            "url": self.url,
            "final_url": self.final_url,
            "status_code": self.status_code,
            "sha256": self.sha256,
            "bytes": self.bytes_len,
            "content_type": self.content_type,
            "retrieved_at": self.retrieved_at,
        }
        if vintage is not None:
            entry["vintage"] = vintage
        entry.update(extra)
        return entry


def _cache_key(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:32]


def _utc_now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@retry(
    stop=stop_after_attempt(4),
    wait=wait_exponential(multiplier=1.5, min=2, max=30),
    retry=retry_if_exception_type((httpx.TransportError, httpx.HTTPStatusError)),
    reraise=True,
)
def _get(url: str, headers: dict[str, str] | None = None) -> httpx.Response:
    with httpx.Client(
        follow_redirects=True,
        timeout=DEFAULT_TIMEOUT,
        headers={"User-Agent": USER_AGENT, **(headers or {})},
    ) as client:
        resp = client.get(url)
        # Retry only transient server errors; 4xx are surfaced immediately.
        if resp.status_code >= 500:
            resp.raise_for_status()
        return resp


def fetch_bytes(
    url: str,
    *,
    use_cache: bool = True,
    allow_status: tuple[int, ...] = (200,),
    headers: dict[str, str] | None = None,
    suffix: str = ".bin",
) -> FetchResult:
    """Fetch ``url`` with an on-disk cache and return a :class:`FetchResult`.

    Raises ``httpx.HTTPStatusError`` when the status is not in ``allow_status``.
    On a disallowed status we still return metadata via the exception message so
    callers can record a graceful skip (see the ADR on inaccessible sources).
    """
    key = _cache_key(url)
    body_path = CACHE / f"{key}{suffix}"
    meta_path = CACHE / f"{key}.json"

    if use_cache and body_path.exists() and meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        data = body_path.read_bytes()
        return FetchResult(
            url=url,
            final_url=meta.get("final_url", url),
            status_code=meta.get("status_code", 200),
            sha256=hashlib.sha256(data).hexdigest(),
            bytes_len=len(data),
            content_type=meta.get("content_type", ""),
            cached=True,
            retrieved_at=meta.get("retrieved_at", _utc_now()),
            path=body_path,
        )

    resp = _get(url, headers=headers)
    if resp.status_code not in allow_status:
        raise httpx.HTTPStatusError(
            f"{resp.status_code} for {url}",
            request=resp.request,
            response=resp,
        )
    data = resp.content
    body_path.write_bytes(data)
    meta = {
        "url": url,
        "final_url": str(resp.url),
        "status_code": resp.status_code,
        "content_type": resp.headers.get("content-type", ""),
        "retrieved_at": _utc_now(),
    }
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return FetchResult(
        url=url,
        final_url=str(resp.url),
        status_code=resp.status_code,
        sha256=hashlib.sha256(data).hexdigest(),
        bytes_len=len(data),
        content_type=meta["content_type"],
        cached=False,
        retrieved_at=meta["retrieved_at"],
        path=body_path,
    )


@dataclass
class Manifest:
    """Append-only record of every source artefact that entered the build."""

    entries: dict[str, dict[str, Any]] = field(default_factory=dict)

    def record(self, key: str, entry: dict[str, Any]) -> None:
        self.entries[key] = entry

    def note_skip(self, key: str, url: str, reason: str, status: int | None = None) -> None:
        self.entries[key] = {
            "url": url,
            "status": "skipped",
            "status_code": status,
            "reason": reason,
            "retrieved_at": _utc_now(),
        }

    def write(self, path: Path) -> None:
        payload = {
            "generated_at": _utc_now(),
            "tool_version": "0.1.0",
            "entries": dict(sorted(self.entries.items())),
        }
        path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
