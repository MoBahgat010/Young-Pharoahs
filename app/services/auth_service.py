from datetime import datetime, timedelta, timezone
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorClient

from app.config import Settings
from app.models.user import UserCreate, UserLogin, UserResponse, Token
from app.services.database import DatabaseService

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, settings: Settings, db_service: DatabaseService):
        self.settings = settings
        self.db_service = db_service
        # Collection will serve as the users store
        # Note: In production, consider separating user store logic.
        
    @property
    def users_collection(self):
        return self.db_service.get_collection("users")

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=self.settings.access_token_expire_minutes)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.settings.jwt_secret_key, algorithm=self.settings.jwt_algorithm)
        return encoded_jwt

    async def signup(self, user_create: UserCreate) -> UserResponse:
        existing_user = await self.users_collection.find_one({"username": user_create.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        hashed_password = self.get_password_hash(user_create.password)
        user_dict = user_create.model_dump()
        user_dict["hashed_password"] = hashed_password
        del user_dict["password"]
        
        result = await self.users_collection.insert_one(user_dict)
        
        return UserResponse(**user_dict, id=str(result.inserted_id))

    async def signin(self, user_login: UserLogin) -> Token:
        user = await self.users_collection.find_one({"username": user_login.username})
        if not user or not self.verify_password(user_login.password, user["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        access_token_expires = timedelta(minutes=self.settings.access_token_expire_minutes)
        access_token = self.create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        return Token(access_token=access_token, token_type="bearer")

    async def get_current_user(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.settings.jwt_secret_key, algorithms=[self.settings.jwt_algorithm])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
        except jwt.PyJWTError:
             raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        
        user = await self.users_collection.find_one({"username": username})
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            
        return user
