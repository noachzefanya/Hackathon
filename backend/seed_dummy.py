import asyncio
import uuid
import random
from datetime import datetime, timedelta, timezone
import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.core.database import AsyncSessionLocal
from backend.models.db_models import Transaction, Device, Alert, RiskLevel, TxStatus, AlertSeverity

def now_naive():
    return datetime.now(timezone.utc).replace(tzinfo=None)

def random_date(days_back=7):
    return now_naive() - timedelta(days=random.randint(0, days_back), hours=random.randint(0, 23), minutes=random.randint(0, 59))

async def seed_data():
    async with AsyncSessionLocal() as db:
        print("Memulai proses seed data dummy...")
        
        # 1. Buat Dummy Devices
        devices = []
        users = [f"user_00{i}" for i in range(1, 11)]
        
        for user_id in users:
            dev = Device(
                id=str(uuid.uuid4()),
                fingerprint_hash=f"hash_{uuid.uuid4().hex[:8]}",
                user_id=user_id,
                first_seen=random_date(30),
                last_seen=now_naive(),
                trust_score=random.randint(40, 100),
                ip_history=["192.168.1.1", "10.0.0.1"],
                city_history=["Jakarta", "Bandung"]
            )
            devices.append(dev)
            db.add(dev)
        
        # 2. Buat Dummy Transactions & Alerts
        merchants = ["Tokopedia", "Shopee", "Traveloka", "Gojek", "Grab", "Steam", "Netflix"]
        
        for i in range(50):
            user_id = random.choice(users)
            dev = random.choice(devices)
            
            # Determine Risk
            score = random.randint(10, 95)
            if score > 80:
                level = RiskLevel.high
                status = TxStatus.blocked
            elif score > 60:
                level = RiskLevel.medium
                status = TxStatus.flagged
            else:
                level = RiskLevel.low
                status = TxStatus.approved
                
            tx_id = str(uuid.uuid4())
            tx = Transaction(
                id=tx_id,
                user_id=user_id,
                merchant_id=random.choice(merchants),
                amount=random.uniform(50000, 5000000),
                currency="IDR",
                device_id=dev.id,
                ip_address="192.168.1.x",
                location_lat=-6.200000 + random.uniform(-0.1, 0.1),
                location_lng=106.816666 + random.uniform(-0.1, 0.1),
                risk_score=score,
                risk_level=level,
                status=status,
                xai_reasons=[{"feature": "Amount", "description": "Unusually high amount", "impact": 0.4}] if score > 60 else [],
                created_at=random_date(2)
            )
            db.add(tx)
            
            # 3. Create Alerts for High/Medium risk
            if score > 60:
                alert = Alert(
                    id=str(uuid.uuid4()),
                    transaction_id=tx_id,
                    severity=AlertSeverity.critical if score > 80 else AlertSeverity.high,
                    reason="Suspicious transaction detected by AI Model",
                    created_at=tx.created_at
                )
                db.add(alert)

        await db.commit()
        print("Selesai! 10 Devices dan 50 Transaksi (beserta Alerts) berhasil ditambahkan ke Supabase.")

if __name__ == "__main__":
    asyncio.run(seed_data())
