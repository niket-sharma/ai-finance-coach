from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from database import get_db
from models import Investment
from schemas import InvestmentCreate

router = APIRouter(prefix="/api/investments", tags=["investments"])

VALID_TYPES = ["stock", "crypto", "mutual_fund", "etf"]


def format_investment(inv: Investment) -> dict:
    total_invested = inv.quantity * inv.buy_price
    current_value = inv.quantity * inv.current_price
    gain_loss = current_value - total_invested
    gain_percent = ((gain_loss / total_invested) * 100) if total_invested > 0 else 0

    return {
        "id": inv.id,
        "asset_name": inv.asset_name,
        "type": inv.type,
        "quantity": inv.quantity,
        "buy_price": inv.buy_price,
        "current_price": inv.current_price,
        "total_invested": round(total_invested, 2),
        "current_value": round(current_value, 2),
        "gain_loss": round(gain_loss, 2),
        "gain_percent": round(gain_percent, 2),
        "created_at": inv.created_at.strftime("%Y-%m-%dT%H:%M:%S") if inv.created_at else "",
    }


@router.get("")
def get_investments(db: Session = Depends(get_db)):
    investments = db.query(Investment).order_by(Investment.created_at.desc()).all()
    return [format_investment(inv) for inv in investments]


@router.post("")
def create_investment(
    investment: InvestmentCreate,
    db: Session = Depends(get_db),
):
    if investment.type not in VALID_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid type. Must be one of: {VALID_TYPES}"
        )

    db_investment = Investment(
        asset_name=investment.asset_name,
        type=investment.type,
        quantity=investment.quantity,
        buy_price=investment.buy_price,
        current_price=investment.current_price,
    )
    db.add(db_investment)
    db.commit()
    db.refresh(db_investment)
    return format_investment(db_investment)


@router.delete("/{investment_id}")
def delete_investment(
    investment_id: int,
    db: Session = Depends(get_db),
):
    investment = db.query(Investment).filter(Investment.id == investment_id).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(investment)
    db.commit()
    return {"message": "Investment deleted successfully", "id": investment_id}
