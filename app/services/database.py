from motor.motor_asyncio import AsyncIOMotorClient
from app.config import Settings

class DatabaseService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client: AsyncIOMotorClient = None
        self.db = None

    def connect(self):
        """Establish connection to MongoDB."""
        self.client = AsyncIOMotorClient(self.settings.mongodb_uri)
        self.db = self.client[self.settings.db_name]
        print(f"Connected to MongoDB: {self.settings.db_name}")

    def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()
            print("Closed MongoDB connection")

    def get_collection(self, name: str):
        """Get a MongoDB collection."""
        if self.db is None:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self.db[name]
