from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.routers.query import get_services, ServiceContainer

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user: UserCreate, services: ServiceContainer = Depends(get_services)):
    return await services.auth_service.signup(user)

@router.post("/signin", response_model=Token)
async def signin(user: UserLogin, services: ServiceContainer = Depends(get_services)):
    return await services.auth_service.signin(user)
