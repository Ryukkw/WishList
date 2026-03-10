"""
Simple in-memory rate limiting per client IP.
Use as dependency on scrape and public POST endpoints.
"""
import time
from collections import defaultdict
from typing import Annotated

from fastapi import Depends, HTTPException, Request

# key -> list of timestamps (we prune old ones)
_buckets: dict[str, list[float]] = defaultdict(list)
_CLEANUP_AFTER = 120  # seconds to keep


def _clean_old(bucket: list[float], window: float) -> None:
    now = time.monotonic()
    cutoff = now - window
    while bucket and bucket[0] < cutoff:
        bucket.pop(0)


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def rate_limit_scrape(
    request: Request,
) -> None:
    """Limit /api/scrape: 10 requests per minute per IP."""
    key = f"scrape:{_client_key(request)}"
    window = 60.0
    now = time.monotonic()
    bucket = _buckets[key]
    _clean_old(bucket, window)
    if len(bucket) >= 10:
        raise HTTPException(status_code=429, detail="Слишком много запросов. Подожди минуту.")
    bucket.append(now)


async def rate_limit_public_post(
    request: Request,
) -> None:
    """Limit public reserve/contribute: 30 requests per minute per IP."""
    key = f"public:{_client_key(request)}"
    window = 60.0
    now = time.monotonic()
    bucket = _buckets[key]
    _clean_old(bucket, window)
    if len(bucket) >= 30:
        raise HTTPException(status_code=429, detail="Слишком много действий. Подожди минуту.")
    bucket.append(now)
