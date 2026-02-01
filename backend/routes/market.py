import os
import time
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import httpx

from database import get_db
from models import Watchlist

router = APIRouter(prefix="/api/market", tags=["market"])

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
FINNHUB_BASE = "https://finnhub.io/api/v1"
YAHOO_BASE = "https://query2.finance.yahoo.com"

# In-memory quote cache: symbol -> {"data": {...}, "fetched_at": timestamp}
_quote_cache: dict = {}
CACHE_TTL = 15  # seconds


# ---------------------------------------------------------------------------
# Quote fetching
# ---------------------------------------------------------------------------

async def _fetch_quote_finnhub(symbol: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{FINNHUB_BASE}/quote",
            params={"symbol": symbol, "token": FINNHUB_API_KEY},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        if not data or data.get("c") is None:
            return {}
        return {
            "symbol": symbol,
            "price": data["c"],
            "open": data["o"],
            "high": data["h"],
            "low": data["l"],
            "prev_close": data["pc"],
            "change": round(data["d"], 2) if data["d"] else 0,
            "change_pct": round(data["dp"], 2) if data["dp"] else 0,
            "volume": data.get("v", 0),
            "timestamp": data.get("t", 0),
        }


async def _fetch_quote_yahoo(symbol: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{YAHOO_BASE}/v6/finance/quote",
            params={"symbols": symbol},
            headers={"User-Agent": "Mozilla/5.0 (compatible; FinanceCoach/1.0)"},
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("quoteResponse", {}).get("result", [])
        if not results:
            return {}
        q = results[0]
        price = q.get("regularMarketPrice", 0) or 0
        prev_close = q.get("regularMarketPreviousClose", price) or price
        change = price - prev_close
        change_pct = (change / prev_close * 100) if prev_close else 0
        return {
            "symbol": symbol,
            "name": q.get("shortName", ""),
            "price": round(price, 2),
            "open": round(q.get("regularMarketOpen", 0) or 0, 2),
            "high": round(q.get("regularMarketDayHigh", 0) or 0, 2),
            "low": round(q.get("regularMarketDayLow", 0) or 0, 2),
            "prev_close": round(prev_close, 2),
            "change": round(change, 2),
            "change_pct": round(change_pct, 2),
            "volume": q.get("regularMarketVolume", 0) or 0,
            "timestamp": int(time.time()),
        }


async def get_quote(symbol: str) -> dict:
    """Get a live quote with caching."""
    now = time.time()
    cached = _quote_cache.get(symbol)
    if cached and (now - cached["fetched_at"]) < CACHE_TTL:
        return cached["data"]

    try:
        data = await _fetch_quote_finnhub(symbol) if FINNHUB_API_KEY else await _fetch_quote_yahoo(symbol)
    except Exception as e:
        if cached:
            return cached["data"]
        raise HTTPException(status_code=503, detail=f"Market data unavailable: {e}")

    if data:
        _quote_cache[symbol] = {"data": data, "fetched_at": now}
    return data


# ---------------------------------------------------------------------------
# History fetching
# ---------------------------------------------------------------------------

async def fetch_history(symbol: str, period: str = "3m") -> list:
    """Fetch OHLCV candle history. Always uses Yahoo (reliable for history)."""
    range_map = {"1w": "7d", "1m": "1mo", "3m": "3mo", "6m": "6mo", "1y": "1y"}
    range_val = range_map.get(period, "3mo")

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{YAHOO_BASE}/v8/finance/chart/{symbol}",
            params={"range": range_val, "interval": "1d"},
            headers={"User-Agent": "Mozilla/5.0 (compatible; FinanceCoach/1.0)"},
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()

    result = data.get("chart", {}).get("result", [])
    if not result:
        return []

    chart = result[0]
    timestamps = chart.get("timestamp", [])
    quote = chart.get("indicators", {}).get("quote", [{}])[0]
    closes = quote.get("close", [])
    opens = quote.get("open", [])
    highs = quote.get("high", [])
    lows = quote.get("low", [])
    volumes = quote.get("volume", [])

    candles = []
    for i in range(len(timestamps)):
        if closes[i] is None:
            continue
        candles.append({
            "date": datetime.fromtimestamp(timestamps[i]).strftime("%Y-%m-%d"),
            "open": round(opens[i], 2) if opens[i] else 0,
            "high": round(highs[i], 2) if highs[i] else 0,
            "low": round(lows[i], 2) if lows[i] else 0,
            "close": round(closes[i], 2),
            "volume": volumes[i] if volumes[i] else 0,
        })
    return candles


# ---------------------------------------------------------------------------
# Routes — Quotes
# ---------------------------------------------------------------------------

@router.get("/quote/{symbol}")
async def get_market_quote(symbol: str):
    symbol = symbol.upper()
    data = await get_quote(symbol)
    if not data:
        raise HTTPException(status_code=404, detail=f"Symbol {symbol} not found")
    return data


@router.get("/quotes")
async def get_market_quotes(symbols: str = Query(..., description="Comma-separated symbols")):
    symbol_list = [s.strip().upper() for s in symbols.split(",") if s.strip()]
    results = {}
    for sym in symbol_list:
        try:
            data = await get_quote(sym)
            if data:
                results[sym] = data
        except Exception:
            pass
    return results


@router.get("/history/{symbol}")
async def get_market_history(
    symbol: str,
    period: str = Query("3m", description="1w | 1m | 3m | 6m | 1y"),
):
    symbol = symbol.upper()
    try:
        candles = await fetch_history(symbol, period)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"History unavailable: {e}")
    if not candles:
        raise HTTPException(status_code=404, detail=f"No history for {symbol}")
    return {"symbol": symbol, "period": period, "candles": candles}


@router.get("/indices")
async def get_market_indices():
    """Fetch major indices via Yahoo (Finnhub doesn't support ^-prefixed symbols)."""
    indices = {"S&P 500": "^GSPC", "NASDAQ": "^IXIC", "Dow Jones": "^DJI"}
    results = []
    for name, symbol in indices.items():
        try:
            data = await _fetch_quote_yahoo(symbol)
            if data:
                results.append({"name": name, "symbol": symbol, **data})
        except Exception:
            pass
    return {"indices": results}


# ---------------------------------------------------------------------------
# Routes — Search
# ---------------------------------------------------------------------------

@router.get("/search")
async def search_symbols(q: str = Query(..., min_length=1)):
    q = q.strip()
    try:
        if FINNHUB_API_KEY:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{FINNHUB_BASE}/symbol/search",
                    params={"query": q, "token": FINNHUB_API_KEY},
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
                results = []
                for item in data.get("result", [])[:10]:
                    results.append({
                        "symbol": item.get("symbol", ""),
                        "name": item.get("displaySymbol", "") or item.get("description", ""),
                        "type": item.get("type", ""),
                    })
                return {"results": results}
        else:
            # Yahoo Finance search
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    "https://query1.finance.yahoo.com/v7/finance/quote",
                    params={"symbols": q.upper()},
                    headers={"User-Agent": "Mozilla/5.0 (compatible; FinanceCoach/1.0)"},
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
                results_raw = data.get("quoteResponse", {}).get("result", [])
                results = []
                for item in results_raw[:10]:
                    sym = item.get("symbol", "")
                    if sym:
                        results.append({
                            "symbol": sym,
                            "name": item.get("shortName", sym),
                            "type": item.get("quoteType", ""),
                        })
                # If no results, return the query as a possible symbol
                if not results:
                    results = [{"symbol": q.upper(), "name": q, "type": ""}]
                return {"results": results}
    except Exception:
        return {"results": [{"symbol": q.upper(), "name": q, "type": ""}]}


# ---------------------------------------------------------------------------
# Routes — Watchlist
# ---------------------------------------------------------------------------

@router.get("/watchlist")
def get_watchlist(db: Session = Depends(get_db)):
    items = db.query(Watchlist).order_by(Watchlist.added_at.desc()).all()
    return {"watchlist": [{"symbol": item.symbol, "added_at": item.added_at.isoformat()} for item in items]}


@router.post("/watchlist")
def add_to_watchlist(body: dict, db: Session = Depends(get_db)):
    symbol = (body.get("symbol") or "").strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    existing = db.query(Watchlist).filter(Watchlist.symbol == symbol).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"{symbol} already in watchlist")
    item = Watchlist(symbol=symbol)
    db.add(item)
    db.commit()
    return {"symbol": symbol, "added_at": item.added_at.isoformat()}


@router.delete("/watchlist/{symbol}")
def remove_from_watchlist(symbol: str, db: Session = Depends(get_db)):
    symbol = symbol.upper()
    item = db.query(Watchlist).filter(Watchlist.symbol == symbol).first()
    if not item:
        raise HTTPException(status_code=404, detail=f"{symbol} not in watchlist")
    db.delete(item)
    db.commit()
    return {"message": f"{symbol} removed"}
