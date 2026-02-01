import time
from datetime import datetime
from typing import Optional

import numpy as np
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Watchlist
from routes.market import fetch_history

router = APIRouter(prefix="/api/recommendations", tags=["recommendations"])

# Cache: symbol -> {"data": {...}, "fetched_at": timestamp}
_rec_cache: dict = {}
REC_CACHE_TTL = 300  # 5 minutes


# ---------------------------------------------------------------------------
# Technical indicators
# ---------------------------------------------------------------------------

def _sma(prices: pd.Series, period: int) -> pd.Series:
    return prices.rolling(window=period).mean()


def _rsi(prices: pd.Series, period: int = 14) -> pd.Series:
    delta = prices.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = (-delta).where(delta < 0, 0.0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def _macd(prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    ema_fast = prices.ewm(span=fast, adjust=False).mean()
    ema_slow = prices.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def _bollinger(prices: pd.Series, period: int = 20, std_dev: float = 2.0):
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    return sma + (std * std_dev), sma, sma - (std * std_dev)


# ---------------------------------------------------------------------------
# Analysis engine
# ---------------------------------------------------------------------------

def analyze_technicals(candles: list) -> dict:
    """Full technical analysis → BUY / SELL / HOLD signal."""
    if len(candles) < 30:
        return {
            "signal": "HOLD", "confidence": 0.0, "composite_score": 0.0,
            "indicators": [], "reasoning": "Insufficient price history (need ≥ 30 days).",
            "price": 0, "analyzed_at": datetime.utcnow().isoformat(),
        }

    df = pd.DataFrame(candles)
    df["close"] = pd.to_numeric(df["close"])
    df["volume"] = pd.to_numeric(df["volume"])
    df = df.sort_values("date").reset_index(drop=True)

    prices = df["close"]
    current_price = float(prices.iloc[-1])
    scores: list[float] = []
    indicators: list[dict] = []

    # --- SMA 20 & 50 ---
    sma20 = _sma(prices, 20)
    sma50 = _sma(prices, 50)

    if not pd.isna(sma20.iloc[-1]):
        val = float(sma20.iloc[-1])
        if current_price > val:
            scores.append(0.5)
            indicators.append({"indicator": "SMA 20", "value": round(val, 2), "signal": "bullish",
                               "detail": f"Price ${current_price:.2f} is above SMA20 ${val:.2f}"})
        else:
            scores.append(-0.5)
            indicators.append({"indicator": "SMA 20", "value": round(val, 2), "signal": "bearish",
                               "detail": f"Price ${current_price:.2f} is below SMA20 ${val:.2f}"})

    if len(prices) > 50 and not pd.isna(sma20.iloc[-1]) and not pd.isna(sma50.iloc[-1]):
        s20, s50 = float(sma20.iloc[-1]), float(sma50.iloc[-1])
        if s20 > s50:
            scores.append(1.0)
            indicators.append({"indicator": "SMA Crossover", "value": round(s20 - s50, 2), "signal": "bullish",
                               "detail": "Golden cross: SMA20 above SMA50"})
        else:
            scores.append(-1.0)
            indicators.append({"indicator": "SMA Crossover", "value": round(s50 - s20, 2), "signal": "bearish",
                               "detail": "Death cross: SMA20 below SMA50"})

    # --- RSI ---
    rsi = _rsi(prices)
    if not pd.isna(rsi.iloc[-1]):
        rsi_val = float(rsi.iloc[-1])
        if rsi_val < 30:
            scores.append(1.5)
            indicators.append({"indicator": "RSI", "value": round(rsi_val, 1), "signal": "bullish",
                               "detail": f"RSI {rsi_val:.1f} — oversold (< 30), potential reversal"})
        elif rsi_val < 45:
            scores.append(0.5)
            indicators.append({"indicator": "RSI", "value": round(rsi_val, 1), "signal": "neutral",
                               "detail": f"RSI {rsi_val:.1f} — approaching oversold"})
        elif rsi_val > 70:
            scores.append(-1.5)
            indicators.append({"indicator": "RSI", "value": round(rsi_val, 1), "signal": "bearish",
                               "detail": f"RSI {rsi_val:.1f} — overbought (> 70), caution warranted"})
        elif rsi_val > 55:
            scores.append(-0.5)
            indicators.append({"indicator": "RSI", "value": round(rsi_val, 1), "signal": "neutral",
                               "detail": f"RSI {rsi_val:.1f} — approaching overbought"})
        else:
            scores.append(0.0)
            indicators.append({"indicator": "RSI", "value": round(rsi_val, 1), "signal": "neutral",
                               "detail": f"RSI {rsi_val:.1f} — neutral range (45–55)"})

    # --- MACD ---
    if len(prices) > 26:
        macd_line, signal_line, histogram = _macd(prices)
        if not pd.isna(macd_line.iloc[-1]) and not pd.isna(signal_line.iloc[-1]):
            ml = float(macd_line.iloc[-1])
            sl = float(signal_line.iloc[-1])
            hist = float(histogram.iloc[-1])
            if ml > sl:
                strength = 1.0 if ml > 0 else 0.5
                scores.append(strength)
                indicators.append({"indicator": "MACD", "value": round(ml, 3), "signal": "bullish",
                                   "detail": f"MACD above signal line (histogram: {hist:.3f})"})
            else:
                strength = -1.0 if ml < 0 else -0.5
                scores.append(strength)
                indicators.append({"indicator": "MACD", "value": round(ml, 3), "signal": "bearish",
                                   "detail": f"MACD below signal line (histogram: {hist:.3f})"})

    # --- Bollinger Bands ---
    upper, middle, lower = _bollinger(prices)
    if not pd.isna(upper.iloc[-1]) and not pd.isna(lower.iloc[-1]):
        up, lo = float(upper.iloc[-1]), float(lower.iloc[-1])
        if current_price < lo:
            scores.append(1.0)
            indicators.append({"indicator": "Bollinger Bands", "value": round(lo, 2), "signal": "bullish",
                               "detail": f"Price ${current_price:.2f} below lower band ${lo:.2f} — potential bounce"})
        elif current_price > up:
            scores.append(-1.0)
            indicators.append({"indicator": "Bollinger Bands", "value": round(up, 2), "signal": "bearish",
                               "detail": f"Price ${current_price:.2f} above upper band ${up:.2f} — potential pullback"})
        else:
            band_width = up - lo
            position = (current_price - lo) / band_width if band_width > 0 else 0.5
            scores.append(0.0)
            indicators.append({"indicator": "Bollinger Bands", "value": round(position * 100, 1), "signal": "neutral",
                               "detail": f"Price at {position * 100:.0f}% of band width — within normal range"})

    # --- Volume ---
    if len(df["volume"]) > 20:
        avg_vol = float(df["volume"].iloc[-20:].mean())
        cur_vol = float(df["volume"].iloc[-1])
        if avg_vol > 0:
            vol_ratio = cur_vol / avg_vol
            prev_price = float(prices.iloc[-2]) if len(prices) > 1 else current_price
            if vol_ratio > 2.0 and current_price > prev_price:
                scores.append(0.5)
                indicators.append({"indicator": "Volume", "value": round(vol_ratio, 1), "signal": "bullish",
                                   "detail": f"Volume {vol_ratio:.1f}× average with price up — strong buying pressure"})
            elif vol_ratio > 2.0 and current_price < prev_price:
                scores.append(-0.5)
                indicators.append({"indicator": "Volume", "value": round(vol_ratio, 1), "signal": "bearish",
                                   "detail": f"Volume {vol_ratio:.1f}× average with price down — strong selling pressure"})
            else:
                scores.append(0.0)
                indicators.append({"indicator": "Volume", "value": round(vol_ratio, 1), "signal": "neutral",
                                   "detail": f"Volume {vol_ratio:.1f}× average — normal activity"})

    # ---------------------------------------------------------------------------
    # Composite signal
    # ---------------------------------------------------------------------------
    if not scores:
        return {
            "signal": "HOLD", "confidence": 0.0, "composite_score": 0.0,
            "indicators": indicators, "reasoning": "No indicators could be computed.",
            "price": round(current_price, 2), "analyzed_at": datetime.utcnow().isoformat(),
        }

    composite = sum(scores) / len(scores)
    confidence = min(1.0, max(0.0, abs(composite) / 1.5))

    if composite > 0.3:
        signal = "BUY"
    elif composite < -0.3:
        signal = "SELL"
    else:
        signal = "HOLD"

    bullish_count = sum(1 for ind in indicators if ind["signal"] == "bullish")
    bearish_count = sum(1 for ind in indicators if ind["signal"] == "bearish")

    if signal == "BUY":
        reasoning = (f"{bullish_count} of {len(indicators)} indicators are bullish. "
                     "Technical momentum supports a buy entry.")
    elif signal == "SELL":
        reasoning = (f"{bearish_count} of {len(indicators)} indicators are bearish. "
                     "Technical weakness suggests reducing or exiting the position.")
    else:
        reasoning = (f"Mixed signals ({bullish_count} bullish, {bearish_count} bearish). "
                     "Market lacks a clear directional bias.")

    return {
        "signal": signal,
        "confidence": round(confidence, 2),
        "composite_score": round(composite, 3),
        "indicators": indicators,
        "reasoning": reasoning,
        "price": round(current_price, 2),
        "analyzed_at": datetime.utcnow().isoformat(),
    }


# ---------------------------------------------------------------------------
# Cached recommendation fetcher
# ---------------------------------------------------------------------------

async def get_recommendation(symbol: str) -> dict:
    now = time.time()
    cached = _rec_cache.get(symbol)
    if cached and (now - cached["fetched_at"]) < REC_CACHE_TTL:
        return cached["data"]

    try:
        candles = await fetch_history(symbol, "1y")
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Could not fetch history for {symbol}: {e}")

    if not candles or len(candles) < 30:
        raise HTTPException(status_code=422, detail=f"Insufficient history for {symbol} (need ≥ 30 days)")

    analysis = analyze_technicals(candles)
    analysis["symbol"] = symbol

    _rec_cache[symbol] = {"data": analysis, "fetched_at": now}
    return analysis


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("")
async def get_recommendations(db: Session = Depends(get_db)):
    watchlist = db.query(Watchlist).all()
    symbols = [item.symbol for item in watchlist]

    if not symbols:
        return {
            "recommendations": [],
            "generated_at": datetime.utcnow().isoformat(),
            "note": "Add symbols to your watchlist to receive recommendations.",
        }

    recommendations = []
    for symbol in symbols:
        try:
            rec = await get_recommendation(symbol)
            recommendations.append(rec)
        except Exception:
            recommendations.append({
                "symbol": symbol, "signal": "HOLD", "confidence": 0.0,
                "indicators": [], "reasoning": "Could not analyze — check back later.",
                "price": 0, "analyzed_at": datetime.utcnow().isoformat(),
            })

    recommendations.sort(key=lambda x: x.get("confidence", 0), reverse=True)
    return {"recommendations": recommendations, "generated_at": datetime.utcnow().isoformat()}


@router.get("/{symbol}")
async def get_symbol_recommendation(symbol: str):
    symbol = symbol.upper()
    return await get_recommendation(symbol)
