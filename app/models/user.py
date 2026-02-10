from pydantic import BaseModel, Field

class UserBase(BaseModel):
    username: str
    age: int
    country: str = Field(..., alias="country")

class UserCreate(UserBase):
    password: str = Field(..., max_length=72)

class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(UserBase):
    id: str

class Token(BaseModel):
    access_token: str
    token_type: str
