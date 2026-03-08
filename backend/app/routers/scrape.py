from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.scraper import scrape_url

router = APIRouter(prefix="/api", tags=["scrape"])


class ScrapeRequest(BaseModel):
    url: str  # allow any string; validate in endpoint


class ScrapeResponse(BaseModel):
    title: str | None
    image_url: str | None
    price: float | None
    description: str | None


@router.post("/scrape", response_model=ScrapeResponse)
async def scrape(scrape_req: ScrapeRequest):
    url = scrape_req.url.strip()
    if not url or not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="Invalid URL")
    try:
        data = await scrape_url(url)
        return ScrapeResponse(
            title=data.get("title"),
            image_url=data.get("image_url"),
            price=data.get("price"),
            description=data.get("description"),
        )
    except Exception:
        return ScrapeResponse(title=None, image_url=None, price=None, description=None)
