import asyncio
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = "pharaohs_db"
COLLECTION_NAME = "pharaohs"

async def seed_data():
    if not MONGODB_URI:
        print("Error: MONGODB_URI not found in .env")
        return

    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Load data
    try:
        with open("pharoahs.json", "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Error: pharoahs.json not found")
        return

    # Clear existing data? Or upsert? Let's just insert for now, assuming empty or add check.
    # The user said "upload to the db".
    
    # Check if data already exists to avoid duplicates if run multiple times
    count = await collection.count_documents({})
    if count > 0:
        print(f"Collection {COLLECTION_NAME} already has {count} documents. Skipping seed.")
        return

    result = await collection.insert_many(data)
    print(f"Inserted {len(result.inserted_ids)} documents into {COLLECTION_NAME}")

if __name__ == "__main__":
    asyncio.run(seed_data())
