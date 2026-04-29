import asyncio
import uuid
from datetime import datetime, timezone
import sys
import os

# Add the parent directory to sys.path so we can import backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import AsyncSessionLocal, create_tables
from backend.models.db_models import User, UserRole
from backend.core.security import hash_password
from sqlalchemy import select

async def main():
    print("Initialize database tables...")
    await create_tables()
    
    username = "admin_demo_guardianflow"
    password = "SecureGuard2026!"
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == username))
        existing = result.scalar_one_or_none()
        
        if existing:
            print(f"User '{username}' already exists. Updating password...")
            existing.hashed_password = hash_password(password)
            await db.commit()
            print(f"Password updated successfully.")
        else:
            print(f"Creating new user '{username}'...")
            new_user = User(
                id=str(uuid.uuid4()),
                email=username,
                hashed_password=hash_password(password),
                role=UserRole.admin,
                is_active=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(new_user)
            await db.commit()
            print(f"Successfully created admin user!")

if __name__ == "__main__":
    asyncio.run(main())
