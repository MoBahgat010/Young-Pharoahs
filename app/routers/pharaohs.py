from fastapi import APIRouter, Depends, HTTPException, Path
from app.routers.query import get_services, ServiceContainer, get_current_user


router = APIRouter(
    prefix="/pharaohs", 
    tags=["Pharaohs"], 
    dependencies=[Depends(get_current_user)]
)

@router.get("/{king_name}")
async def get_pharaoh(
    king_name: str = Path(..., description="Name of the Pharaoh"),
    services: ServiceContainer = Depends(get_services)
):
    collection = services.database_service.get_collection("pharaohs")
    
    # Try exact match first
    pharaoh = await collection.find_one({"king_name": king_name}, {"_id": 0})
    
    if not pharaoh:
        # Try case-insensitive regex match
        # Escape special characters in king_name for regex safety if needed
        import re
        escaped_name = re.escape(king_name)
        pharaoh = await collection.find_one(
            {"king_name": {"$regex": f"^{escaped_name}$", "$options": "i"}}, 
            {"_id": 0}
        )
        
    if not pharaoh:
        raise HTTPException(status_code=404, detail=f"Pharaoh '{king_name}' not found")
        
    return pharaoh
