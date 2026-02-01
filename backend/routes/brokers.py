import os
from datetime import datetime

import httpx
from cryptography.fernet import Fernet
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import BrokerConnection, Investment

router = APIRouter(prefix="/api/brokers", tags=["brokers"])

# ---------------------------------------------------------------------------
# Encryption helpers
# ---------------------------------------------------------------------------
# Generate a stable key at import time if ENCRYPTION_KEY not set (dev only).
_RAW_KEY = os.getenv("ENCRYPTION_KEY", "").encode()
if not _RAW_KEY:
    _RAW_KEY = Fernet.generate_key()
    print("[brokers] WARNING: ENCRYPTION_KEY not set — using ephemeral key (dev mode).")

_FERNET = Fernet(_RAW_KEY)


def _encrypt(value: str) -> str:
    return _FERNET.encrypt(value.encode()).decode()


def _decrypt(value: str) -> str:
    return _FERNET.decrypt(value.encode()).decode()


# ---------------------------------------------------------------------------
# Alpaca helpers
# ---------------------------------------------------------------------------
ALPACA_PAPER_BASE = "https://paper-api.alpaca.markets/v2"
ALPACA_LIVE_BASE = "https://api.alpaca.markets/v2"


def _alpaca_headers(api_key: str, secret_key: str) -> dict:
    return {"APCA-API-KEY-ID": api_key, "APCA-API-SECRET-KEY": secret_key}


async def alpaca_get_account(api_key: str, secret_key: str, is_paper: bool = True) -> dict:
    base = ALPACA_PAPER_BASE if is_paper else ALPACA_LIVE_BASE
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base}/account", headers=_alpaca_headers(api_key, secret_key), timeout=10.0)
        resp.raise_for_status()
        return resp.json()


async def alpaca_get_positions(api_key: str, secret_key: str, is_paper: bool = True) -> list:
    base = ALPACA_PAPER_BASE if is_paper else ALPACA_LIVE_BASE
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{base}/positions", headers=_alpaca_headers(api_key, secret_key), timeout=10.0)
        resp.raise_for_status()
        return resp.json()


async def alpaca_place_order(api_key: str, secret_key: str, is_paper: bool, order_data: dict) -> dict:
    base = ALPACA_PAPER_BASE if is_paper else ALPACA_LIVE_BASE
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{base}/orders",
            headers={**_alpaca_headers(api_key, secret_key), "Content-Type": "application/json"},
            json=order_data,
            timeout=15.0,
        )
        resp.raise_for_status()
        return resp.json()


# ---------------------------------------------------------------------------
# Position sync
# ---------------------------------------------------------------------------

async def sync_positions(db: Session, conn: BrokerConnection) -> int:
    try:
        api_key = _decrypt(conn.api_key_enc)
        secret_key = _decrypt(conn.secret_key_enc)
        positions = await alpaca_get_positions(api_key, secret_key, conn.is_paper)
    except Exception as e:
        conn.status = "error"
        db.commit()
        print(f"[brokers] sync failed: {e}")
        return 0

    # Remove previously synced investments
    db.query(Investment).filter(Investment.source == "alpaca").delete()

    count = 0
    for pos in positions:
        qty = float(pos.get("qty", 0) or 0)
        if qty <= 0:
            continue
        inv = Investment(
            asset_name=pos.get("symbol", ""),
            type="stock",
            quantity=qty,
            buy_price=float(pos.get("avg_entry_price", 0) or 0),
            current_price=float(pos.get("current_price", 0) or 0),
            source="alpaca",
        )
        db.add(inv)
        count += 1

    conn.last_synced_at = datetime.utcnow()
    conn.status = "connected"
    db.commit()
    return count


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

class BrokerConnectRequest(BaseModel):
    broker: str
    api_key: str
    secret_key: str
    is_paper: bool = True


@router.get("/status")
def get_broker_status(db: Session = Depends(get_db)):
    connections = db.query(BrokerConnection).all()
    result = []
    for conn in connections:
        # Decrypt account_info for buying_power display
        result.append({
            "id": conn.id,
            "broker": conn.broker_type,
            "is_paper": conn.is_paper,
            "status": conn.status,
            "connected_at": conn.connected_at.isoformat() if conn.connected_at else None,
            "last_synced_at": conn.last_synced_at.isoformat() if conn.last_synced_at else None,
            "account_info": conn.account_info,
        })
    return {"brokers": result}


@router.post("/connect")
async def connect_broker(request: BrokerConnectRequest, db: Session = Depends(get_db)):
    if request.broker != "alpaca":
        raise HTTPException(status_code=400, detail="Only Alpaca is supported")

    # Validate credentials
    try:
        account = await alpaca_get_account(request.api_key, request.secret_key, request.is_paper)
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=401, detail=f"Alpaca auth failed ({e.response.status_code})")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not reach Alpaca: {e}")

    # Remove existing connection
    existing = db.query(BrokerConnection).filter(BrokerConnection.broker_type == "alpaca").first()
    if existing:
        db.delete(existing)
        db.commit()

    conn = BrokerConnection(
        broker_type="alpaca",
        api_key_enc=_encrypt(request.api_key),
        secret_key_enc=_encrypt(request.secret_key),
        is_paper=request.is_paper,
        status="connected",
        connected_at=datetime.utcnow(),
        account_info=str({
            "id": account.get("id"),
            "buying_power": account.get("buying_power"),
            "portfolio_value": account.get("portfolio_value"),
            "cash": account.get("cash"),
        }),
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    synced = await sync_positions(db, conn)

    return {
        "broker": "alpaca",
        "is_paper": request.is_paper,
        "status": "connected",
        "account_id": account.get("id", ""),
        "buying_power": account.get("buying_power", "0"),
        "portfolio_value": account.get("portfolio_value", "0"),
        "positions_synced": synced,
    }


@router.delete("/disconnect")
def disconnect_broker(broker: str = "alpaca", db: Session = Depends(get_db)):
    conn = db.query(BrokerConnection).filter(BrokerConnection.broker_type == broker).first()
    if not conn:
        raise HTTPException(status_code=404, detail=f"No {broker} connection")
    db.delete(conn)
    db.commit()
    return {"message": f"{broker} disconnected"}


@router.post("/sync")
async def sync_broker(db: Session = Depends(get_db)):
    conn = db.query(BrokerConnection).filter(BrokerConnection.broker_type == "alpaca").first()
    if not conn:
        raise HTTPException(status_code=404, detail="No broker connected")
    synced = await sync_positions(db, conn)
    return {"message": f"Synced {synced} positions", "synced_at": datetime.utcnow().isoformat()}
