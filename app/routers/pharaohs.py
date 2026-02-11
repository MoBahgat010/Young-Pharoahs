import re
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from app.routers.query import get_services, ServiceContainer, get_current_user
from app.services.places_service import PlacesService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pharaohs", 
    tags=["Pharaohs"]
)


async def _find_pharaoh(king_name: str, services: ServiceContainer) -> dict:
    """Look up a pharaoh by name (exact match, then case-insensitive)."""
    collection = services.database_service.get_collection("pharaohs")

    pharaoh = await collection.find_one({"king_name": king_name}, {"_id": 0})

    if not pharaoh:
        escaped_name = re.escape(king_name)
        pharaoh = await collection.find_one(
            {"king_name": {"$regex": f"^{escaped_name}$", "$options": "i"}},
            {"_id": 0}
        )

    if not pharaoh:
        raise HTTPException(status_code=404, detail=f"Pharaoh '{king_name}' not found")

    return pharaoh


def _find_monument(pharaoh: dict, monument_name: str) -> dict:
    """Find a monument by name (case-insensitive) within a pharaoh document."""
    for monument in pharaoh.get("monuments", []):
        if monument.get("name", "").lower() == monument_name.lower():
            return monument
    raise HTTPException(
        status_code=404,
        detail=f"Monument '{monument_name}' not found for {pharaoh['king_name']}",
    )


@router.get("/")
async def get_all_pharaohs(
    services: ServiceContainer = Depends(get_services)
):
    """List all pharaohs (including monuments with Uber links)."""
    collection = services.database_service.get_collection("pharaohs")
    cursor = collection.find({}, {"_id": 0})
    pharaohs = await cursor.to_list(length=None)
    
    for p in pharaohs:
        if "monuments" in p:
            for m in p["monuments"]:
                _enrich_monument_with_uber(m, services)
                
    return {"pharaohs": pharaohs}


@router.get("/search")
async def search_pharaohs(
    q: str = Query(..., description="Search query for pharaoh name"),
    services: ServiceContainer = Depends(get_services)
):
    """Search for pharaohs by name."""
    collection = services.database_service.get_collection("pharaohs")
    # Case-insensitive regex search
    cursor = collection.find(
        {"king_name": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    )
    results = await cursor.to_list(length=None)
    
    for p in results:
        if "monuments" in p:
            for m in p["monuments"]:
                _enrich_monument_with_uber(m, services)
                
    return {"results": results}


@router.get("/{king_name}")
async def get_pharaoh(
    king_name: str = Path(..., description="Name of the Pharaoh"),
    services: ServiceContainer = Depends(get_services)
):
    pharaoh = await _find_pharaoh(king_name, services)
    if "monuments" in pharaoh:
        for m in pharaoh["monuments"]:
            _enrich_monument_with_uber(m, services)
    return pharaoh


@router.get("/{king_name}/monuments")
async def get_pharaoh_monuments(
    king_name: str = Path(..., description="Name of the Pharaoh"),
    services: ServiceContainer = Depends(get_services)
):
    """Return only the monuments list for a given pharaoh."""
    pharaoh = await _find_pharaoh(king_name, services)
    monuments = pharaoh.get("monuments", [])
    for m in monuments:
        _enrich_monument_with_uber(m, services)
    return {"king_name": pharaoh["king_name"], "monuments": monuments}


@router.get("/{king_name}/monuments/{monument_name}/nearby")
async def get_nearby_places(
    king_name: str = Path(..., description="Name of the Pharaoh"),
    monument_name: str = Path(..., description="Name of the monument"),
    type: str = Query("both", description="Place type: restaurant, hotel, or both"),
    radius: Optional[int] = Query(None, description="Search radius in meters (default 5000)"),
    services: ServiceContainer = Depends(get_services),
):
    """
    Get nearby restaurants and/or hotels for a specific monument.
    Extracts the monument's coordinates from its location_url and
    queries the Google Places API.
    """
    if services.places_service is None:
        raise HTTPException(status_code=500, detail="Places service not configured")

    if type not in ("restaurant", "hotel", "both"):
        raise HTTPException(status_code=400, detail="type must be 'restaurant', 'hotel', or 'both'")

    # 1. Find the pharaoh and monument
    pharaoh = await _find_pharaoh(king_name, services)
    monument = _find_monument(pharaoh, monument_name)

    # 2. Extract coordinates from location_url
    location_url = monument.get("location_url")
    if not location_url:
        raise HTTPException(status_code=400, detail="Monument has no location URL")

    try:
        lat, lng = PlacesService.extract_coords_from_url(location_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # 3. Query Google Places
    try:
        nearby = services.places_service.get_nearby_services(lat, lng, place_type=type, radius=radius)
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))

    # 4. Generate Uber deep link
    uber_link = None
    # if services.uber_service:
    #     uber_link = services.uber_service.get_deep_link(lat, lng, nickname=monument["name"])

    return {
        "king_name": pharaoh["king_name"],
        "monument": monument["name"],
        "location": {"lat": lat, "lng": lng},
        "uber_link": uber_link,
        **nearby,
    }

def _enrich_monument_with_uber(monument: dict, services: ServiceContainer):
    """Add Uber deep link to monument if location_url is present."""
    if not services.uber_service:
        return monument
        
    location_url = monument.get("location_url")
    if location_url:
        try:
            lat, lng = PlacesService.extract_coords_from_url(location_url)
            # monument["uber_link"] = services.uber_service.get_deep_link(lat, lng, nickname=monument.get("name"))
        except ValueError:
            pass # Skip if coords cannot be parsed
    return monument

