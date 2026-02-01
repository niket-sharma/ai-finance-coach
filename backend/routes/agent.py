import json
import asyncio
from datetime import datetime
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import AgentConfig as AgentConfigModel, Trade, BrokerConnection, Watchlist
from routes.brokers import _decrypt, alpaca_place_order, alpaca_get_account

router = APIRouter(prefix="/api/agent", tags=["agent"])

# ---------------------------------------------------------------------------
# Background scheduler (one instance, module-level)
# ---------------------------------------------------------------------------
_scheduler = BackgroundScheduler()
_scheduler.start()

_last_run: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Risk presets
# ---------------------------------------------------------------------------
RISK_PROFILES = {
    "conservative": {"max_trade_pct": 5, "max_position_pct": 10, "daily_loss_limit_pct": 2, "confirm_above_usd": 100},
    "moderate":     {"max_trade_pct": 10, "max_position_pct": 20, "daily_loss_limit_pct": 5, "confirm_above_usd": 500},
    "aggressive":   {"max_trade_pct": 20, "max_position_pct": 40, "daily_loss_limit_pct": 10, "confirm_above_usd": 2000},
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_or_create_config(db: Session) -> AgentConfigModel:
    config = db.query(AgentConfigModel).first()
    if not config:
        config = AgentConfigModel(
            enabled=False, mode="advisory", risk_profile="moderate",
            max_trade_pct=10, max_position_pct=20, daily_loss_limit_pct=5,
            confirm_above_usd=500, symbol_whitelist="[]", check_interval_min=15,
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def _format_config(config: AgentConfigModel) -> dict:
    return {
        "enabled": config.enabled,
        "mode": config.mode,
        "risk_profile": config.risk_profile,
        "max_trade_pct": config.max_trade_pct,
        "max_position_pct": config.max_position_pct,
        "daily_loss_limit_pct": config.daily_loss_limit_pct,
        "confirm_above_usd": config.confirm_above_usd,
        "symbol_whitelist": json.loads(config.symbol_whitelist) if config.symbol_whitelist else [],
        "check_interval_min": config.check_interval_min,
    }


def _format_trade(trade: Trade) -> dict:
    return {
        "id": trade.id,
        "symbol": trade.symbol,
        "action": trade.action,
        "quantity": trade.quantity,
        "price": trade.price,
        "total": trade.total,
        "status": trade.status,
        "mode": trade.mode,
        "reasoning": trade.reasoning,
        "created_at": trade.created_at.isoformat() if trade.created_at else None,
        "executed_at": trade.executed_at.isoformat() if trade.executed_at else None,
    }


def _update_schedule(config: AgentConfigModel):
    """Start or stop the periodic agent job based on config."""
    if _scheduler.has_job("trading_agent"):
        _scheduler.remove_job("trading_agent")
    if config.enabled:
        _scheduler.add_job(
            _run_agent_sync,
            "interval",
            minutes=config.check_interval_min,
            id="trading_agent",
            replace_existing=True,
        )


def _run_agent_sync():
    """Synchronous wrapper for the async agent cycle (called by APScheduler)."""
    db = SessionLocal()
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(_run_agent_cycle(db))
        loop.close()
    except Exception as e:
        print(f"[agent] background run error: {e}")
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Core agent cycle
# ---------------------------------------------------------------------------

async def _run_agent_cycle(db: Session) -> dict:
    global _last_run
    _last_run = datetime.utcnow()

    config = _get_or_create_config(db)
    if not config.enabled:
        return {"status": "disabled"}

    # Symbols to analyze
    watchlist = db.query(Watchlist).all()
    symbols = [item.symbol for item in watchlist]
    whitelist = json.loads(config.symbol_whitelist) if config.symbol_whitelist else []
    if whitelist:
        symbols = [s for s in symbols if s in whitelist]
    if not symbols:
        return {"status": "no_symbols", "message": "Watchlist is empty (or whitelist filters everything)"}

    # Portfolio value
    portfolio_value = 10000.0  # default paper portfolio
    broker_conn = db.query(BrokerConnection).first()
    if broker_conn and config.mode != "advisory":
        try:
            api_key = _decrypt(broker_conn.api_key_enc)
            secret_key = _decrypt(broker_conn.secret_key_enc)
            account = await alpaca_get_account(api_key, secret_key, broker_conn.is_paper)
            portfolio_value = float(account.get("portfolio_value", 10000))
        except Exception:
            pass

    # Daily loss check
    today_start = datetime(_last_run.year, _last_run.month, _last_run.day)
    today_executed = db.query(Trade).filter(
        Trade.created_at >= today_start,
        Trade.status == "executed",
        Trade.mode != "advisory",
    ).all()
    daily_pnl = sum(
        t.price * t.quantity * (1 if t.action == "sell" else -1)
        for t in today_executed
    )
    loss_limit = portfolio_value * (config.daily_loss_limit_pct / 100)
    if daily_pnl < -loss_limit:
        return {"status": "killed", "message": f"Daily loss limit hit: ${daily_pnl:.2f} (limit −${loss_limit:.2f})"}

    # Lazy import to avoid circular at module level
    from routes.recommendations import get_recommendation
    from routes.market import get_quote

    decisions = []
    for symbol in symbols:
        try:
            rec = await get_recommendation(symbol)
            signal = rec.get("signal", "HOLD")
            confidence = rec.get("confidence", 0.0)
            reasoning = rec.get("reasoning", "")

            if signal == "HOLD" or confidence < 0.3:
                continue

            quote = await get_quote(symbol)
            current_price = quote.get("price", 0)
            if current_price <= 0:
                continue

            max_trade_value = portfolio_value * (config.max_trade_pct / 100)
            quantity = int(max_trade_value / current_price)
            if quantity < 1:
                continue

            trade_value = round(quantity * current_price, 2)
            needs_confirmation = trade_value > config.confirm_above_usd

            if config.mode == "advisory":
                status = "advisory"
            elif needs_confirmation:
                status = "pending"
            else:
                status = "ready"

            decisions.append({
                "symbol": symbol,
                "action": "buy" if signal == "BUY" else "sell",
                "quantity": quantity,
                "price": current_price,
                "total": trade_value,
                "confidence": confidence,
                "reasoning": reasoning,
                "status": status,
                "mode": config.mode,
            })
        except Exception:
            continue

    # Persist decisions & execute ready ones
    executed = 0
    for dec in decisions:
        trade = Trade(
            symbol=dec["symbol"], action=dec["action"], quantity=dec["quantity"],
            price=dec["price"], total=dec["total"], status=dec["status"],
            mode=dec["mode"], reasoning=dec["reasoning"],
        )
        db.add(trade)
        db.commit()
        db.refresh(trade)

        if dec["status"] == "ready":
            await _execute_trade(db, trade, config, broker_conn)
            executed += 1

    return {
        "status": "completed",
        "symbols_analyzed": len(symbols),
        "decisions": len(decisions),
        "executed": executed,
        "timestamp": _last_run.isoformat(),
    }


async def _execute_trade(db: Session, trade: Trade, config: AgentConfigModel, broker_conn: Optional[BrokerConnection]):
    """Execute a single trade."""
    if config.mode == "advisory":
        return  # Never executes in advisory

    if config.mode == "paper" and not broker_conn:
        # Simulated paper trade — no broker needed
        trade.status = "executed"
        trade.executed_at = datetime.utcnow()
        db.commit()
        return

    if not broker_conn:
        trade.status = "failed"
        trade.reasoning += " | No broker connected"
        db.commit()
        return

    try:
        api_key = _decrypt(broker_conn.api_key_enc)
        secret_key = _decrypt(broker_conn.secret_key_enc)
        order_data = {
            "symbol": trade.symbol,
            "qty": str(trade.quantity),
            "side": trade.action,
            "type": "market",
            "time_in_force": "day",
        }
        await alpaca_place_order(api_key, secret_key, broker_conn.is_paper, order_data)
        trade.status = "executed"
        trade.executed_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        trade.status = "failed"
        trade.reasoning += f" | Execution error: {e}"
        db.commit()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

class AgentConfigUpdate(BaseModel):
    enabled: Optional[bool] = None
    mode: Optional[str] = None
    risk_profile: Optional[str] = None
    max_trade_pct: Optional[float] = None
    max_position_pct: Optional[float] = None
    daily_loss_limit_pct: Optional[float] = None
    confirm_above_usd: Optional[float] = None
    symbol_whitelist: Optional[list] = None
    check_interval_min: Optional[int] = None


@router.get("/config")
def get_agent_config(db: Session = Depends(get_db)):
    return _format_config(_get_or_create_config(db))


@router.put("/config")
def update_agent_config(update: AgentConfigUpdate, db: Session = Depends(get_db)):
    config = _get_or_create_config(db)

    if update.risk_profile is not None:
        if update.risk_profile not in RISK_PROFILES:
            raise HTTPException(status_code=400, detail=f"Must be one of: {list(RISK_PROFILES.keys())}")
        preset = RISK_PROFILES[update.risk_profile]
        config.risk_profile = update.risk_profile
        config.max_trade_pct = preset["max_trade_pct"]
        config.max_position_pct = preset["max_position_pct"]
        config.daily_loss_limit_pct = preset["daily_loss_limit_pct"]
        config.confirm_above_usd = preset["confirm_above_usd"]

    # Individual overrides (applied after preset so they can fine-tune)
    if update.enabled is not None:
        config.enabled = update.enabled
    if update.mode is not None:
        if update.mode not in ("advisory", "paper", "live"):
            raise HTTPException(status_code=400, detail="mode must be advisory | paper | live")
        config.mode = update.mode
    if update.max_trade_pct is not None:
        config.max_trade_pct = update.max_trade_pct
    if update.max_position_pct is not None:
        config.max_position_pct = update.max_position_pct
    if update.daily_loss_limit_pct is not None:
        config.daily_loss_limit_pct = update.daily_loss_limit_pct
    if update.confirm_above_usd is not None:
        config.confirm_above_usd = update.confirm_above_usd
    if update.symbol_whitelist is not None:
        config.symbol_whitelist = json.dumps(update.symbol_whitelist)
    if update.check_interval_min is not None:
        config.check_interval_min = update.check_interval_min

    db.commit()
    _update_schedule(config)
    return _format_config(config)


@router.post("/run")
async def run_agent(db: Session = Depends(get_db)):
    """Manually trigger one agent cycle."""
    return await _run_agent_cycle(db)


@router.get("/status")
def get_agent_status(db: Session = Depends(get_db)):
    config = _get_or_create_config(db)
    return {
        "enabled": config.enabled,
        "mode": config.mode,
        "last_run": _last_run.isoformat() if _last_run else None,
        "scheduled": _scheduler.has_job("trading_agent"),
    }


@router.get("/trades")
def get_agent_trades(
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    limit: int = 50,
):
    query = db.query(Trade).order_by(Trade.created_at.desc())
    if status:
        query = query.filter(Trade.status == status)
    return {"trades": [_format_trade(t) for t in query.limit(limit).all()]}


@router.post("/confirm/{trade_id}")
async def confirm_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status != "pending":
        raise HTTPException(status_code=400, detail=f"Status is '{trade.status}', not 'pending'")

    config = _get_or_create_config(db)
    broker_conn = db.query(BrokerConnection).first()
    trade.status = "ready"
    db.commit()

    await _execute_trade(db, trade, config, broker_conn)
    db.refresh(trade)
    return _format_trade(trade)


@router.post("/cancel/{trade_id}")
def cancel_trade(trade_id: int, db: Session = Depends(get_db)):
    trade = db.query(Trade).filter(Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status not in ("pending", "ready", "advisory"):
        raise HTTPException(status_code=400, detail=f"Cannot cancel status '{trade.status}'")
    trade.status = "cancelled"
    db.commit()
    return _format_trade(trade)
