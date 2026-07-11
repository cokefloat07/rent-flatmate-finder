"""
One-time script to create the admin user.

Usage:
    cd server/
    python scripts/seed_admin.py

The admin user is NOT creatable through the public /api/auth/register endpoint.
Credentials come from environment variables or are prompted interactively.
"""
import asyncio
import os
import sys

# Ensure the `server/` directory is on the path when running as a script
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv

load_dotenv()

from app.core.security import hash_password
from app.db.mongodb import connect_db
from app.models.user import User, UserRole


async def seed():
    await connect_db()

    name = os.getenv("ADMIN_NAME") or input("Admin name: ").strip()
    email = os.getenv("ADMIN_EMAIL") or input("Admin email: ").strip()
    password = os.getenv("ADMIN_PASSWORD") or input("Admin password (min 8 chars): ").strip()

    if len(password) < 8:
        print("❌ Password must be at least 8 characters.")
        return

    existing = await User.find_one(User.email == email)
    if existing:
        print(f"⚠️  A user with email {email} already exists (role={existing.role.value}).")
        return

    admin = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        role=UserRole.admin,
    )
    await admin.insert()
    print(f"✅ Admin user created: {name} <{email}> (id={admin.id})")


if __name__ == "__main__":
    asyncio.run(seed())