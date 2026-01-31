from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from models import Transaction
from schemas import TransactionCreate, TransactionResponse

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

VALID_CATEGORIES = [
    "Food", "Transport", "Housing", "Entertainment", "Shopping",
    "Healthcare", "Utilities", "Investment", "Income", "Other"
]
VALID_TYPES = ["income", "expense"]


def format_transaction(t: Transaction) -> dict:
    return {
        "id": t.id,
        "amount": t.amount,
        "category": t.category,
        "date": t.date.strftime("%Y-%m-%d") if isinstance(t.date, datetime) else str(t.date),
        "description": t.description or "",
        "type": t.type,
        "created_at": t.created_at.strftime("%Y-%m-%dT%H:%M:%S") if t.created_at else "",
    }


@router.get("")
def get_transactions(
    category: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction)

    if category:
        query = query.filter(Transaction.category == category)
    if type:
        query = query.filter(Transaction.type == type)
    if start_date:
        query = query.filter(Transaction.date >= datetime.strptime(start_date, "%Y-%m-%d"))
    if end_date:
        query = query.filter(Transaction.date <= datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59))

    transactions = query.order_by(Transaction.date.desc()).all()
    return [format_transaction(t) for t in transactions]


@router.post("")
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
):
    if transaction.category not in VALID_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {VALID_CATEGORIES}")
    if transaction.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be 'income' or 'expense'")

    try:
        date = datetime.strptime(transaction.date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    db_transaction = Transaction(
        amount=transaction.amount,
        category=transaction.category,
        date=date,
        description=transaction.description,
        type=transaction.type,
    )
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return format_transaction(db_transaction)


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
):
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully", "id": transaction_id}
