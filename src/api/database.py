from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

MONGO_URI = "mongodb://localhost:27017"

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

database = client["cleancity"]
complaints_collection = database["complaints"]


def check_database_connection():
    try:
        client.admin.command("ping")
        return True
    except ConnectionFailure:
        return False