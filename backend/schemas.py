from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class TransactionCreate(BaseModel):
    amount: float = Field(..., gt=0, description="Transaction amount (positive value)")
    category: str
    date: str  # ISO format date string
    description: str = ""
    type: str  # "income" or "expense"


class TransactionResponse(BaseModel):
    id: int
    amount: float
    category: str
    date: str
    description: str
    type: str
    created_at: str

    class Config:
        from_attributes = True


class InvestmentCreate(BaseModel):
    asset_name: str
    type: str  # "stock", "crypto", "mutual_fund", "etf"
    quantity: float = Field(..., gt=0)
    buy_price: float = Field(..., gt=0)
    current_price: float = Field(..., gt=0)


class InvestmentResponse(BaseModel):
    id: int
    asset_name: str
    type: str
    quantity: float
    buy_price: float
    current_price: float
    created_at: str

    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    total_balance: float
    monthly_income: float
    monthly_expenses: float
    category_breakdown: dict
    recent_transactions: list


class InsightItem(BaseModel):
    type: str
    icon: str
    title: str
    description: str
    action: Optional[str] = None


class InsightsResponse(BaseModel):
    insights: list
    generated_at: str
