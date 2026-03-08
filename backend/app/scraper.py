import re
import time
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup

# In-memory cache: url -> (result_dict, expiry_timestamp)
_scrape_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL = 3600  # 1 hour
_CACHE_MAX_SIZE = 500

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def _cache_get(url: str) -> dict | None:
    now = time.time()
    if url in _scrape_cache:
        data, expiry = _scrape_cache[url]
        if now < expiry:
            return data
        del _scrape_cache[url]
    return None


def _cache_set(url: str, data: dict) -> None:
    while len(_scrape_cache) >= _CACHE_MAX_SIZE and _scrape_cache:
        oldest = next(iter(_scrape_cache))
        del _scrape_cache[oldest]
    _scrape_cache[url] = (data, time.time() + _CACHE_TTL)


def _price_from_ld_product(ld: dict) -> float | None:
    offers = ld.get("offers")
    if isinstance(offers, dict) and offers.get("price") is not None:
        try:
            return float(offers["price"])
        except (TypeError, ValueError):
            pass
    if isinstance(offers, list) and offers:
        first = offers[0] if isinstance(offers[0], dict) else None
        if first and first.get("price") is not None:
            try:
                return float(first["price"])
            except (TypeError, ValueError):
                pass
    return None


def _extract_price(soup: BeautifulSoup, html: str) -> float | None:
    # meta product:price:amount
    meta = soup.find("meta", property="product:price:amount")
    if meta and meta.get("content"):
        try:
            return float(meta["content"].replace(",", ".").strip())
        except ValueError:
            pass
    # JSON-LD Product
    import json
    for script in soup.find_all("script", type="application/ld+json"):
        if not script.string:
            continue
        try:
            ld = json.loads(script.string)
            if isinstance(ld, list):
                for item in ld:
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        p = _price_from_ld_product(item)
                        if p is not None:
                            return p
            elif isinstance(ld, dict):
                if ld.get("@type") == "Product":
                    p = _price_from_ld_product(ld)
                    if p is not None:
                        return p
                for item in ld.get("@graph", []):
                    if isinstance(item, dict) and item.get("@type") == "Product":
                        p = _price_from_ld_product(item)
                        if p is not None:
                            return p
        except (json.JSONDecodeError, TypeError, ValueError):
            continue
    # Regex: digits with optional ,. and currency
    patterns = [
        r'(\d+[.,]?\d*)\s*[₽]',
        r'[\$€](\d+[.,]?\d*)',
        r'(\d+[.,]?\d*)\s*[€$]',
    ]
    for pat in patterns:
        m = re.search(pat, html)
        if m:
            try:
                return float(m.group(1).replace(",", "."))
            except ValueError:
                continue
    return None


async def scrape_url(url: str) -> dict:
    """Fetch URL and extract og:title, og:image, og:description, price. Cached 1 hour."""
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        return {"title": None, "image_url": None, "price": None, "description": None}
    normalized = url.split("#")[0].split("?")[0]
    cached = _cache_get(normalized)
    if cached is not None:
        return cached

    result = {"title": None, "image_url": None, "price": None, "description": None}
    try:
        async with httpx.AsyncClient(
            follow_redirects=True,
            timeout=5.0,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            html = resp.text
    except Exception:
        _cache_set(normalized, result)
        return result

    soup = BeautifulSoup(html, "html.parser")

    # Open Graph
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        result["title"] = og_title["content"].strip()
    if not result["title"]:
        title_tag = soup.find("title")
        if title_tag and title_tag.string:
            result["title"] = title_tag.string.strip()[:512]

    og_image = soup.find("meta", property="og:image")
    if og_image and og_image.get("content"):
        result["image_url"] = og_image["content"].strip()

    og_desc = soup.find("meta", property="og:description")
    if og_desc and og_desc.get("content"):
        result["description"] = og_desc["content"].strip()[:2000]

    result["price"] = _extract_price(soup, html)
    _cache_set(normalized, result)
    return result
