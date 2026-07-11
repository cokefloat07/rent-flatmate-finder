from datetime import datetime, timezone
from enum import Enum

from beanie import Document
from pydantic import ConfigDict, EmailStr, Field
from pymongo import ASCENDING, IndexModel


class UserRole(str, Enum):
    owner = "owner"
    tenant = "tenant"
    admin = "admin"


class User(Document):
    name: str
    email: EmailStr
    password_hash: str
    role: UserRole = UserRole.tenant
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = ConfigDict(populate_by_name=True)

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("email", ASCENDING)], unique=True, name="email_unique_idx"),
        ]