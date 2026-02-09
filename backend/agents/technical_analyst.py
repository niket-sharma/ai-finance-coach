"""
Technical Analysis Agent
Specialized in chart patterns, indicators, and price action analysis.
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime
from crewai import Agent, Task
from langchain.tools import Tool
from langchain_openai import ChatOpenAI


class TechnicalAnalystAgent:
    """
    Agent specialized in technical analysis using multiple indicators:
    - Moving Averages (SMA, EMA)
    - RSI (Relative Strength Index)
    - MACD (Moving Average Convergence Divergence)
    - Bollinger Bands
    - Volume Analysis
    """
    
    def __init__(self, llm: Optional[ChatOpenAI] = None):
        self.llm = llm or ChatOpenAI(temperature=0.3, model="gpt-4")
        self.agent = self._create_agent()
    
    def _calculate_sma(self, prices: pd.Series, period: int) -> pd.Series:
        """Calculate Simple Moving Average."""
        return prices.rolling(window=period).mean()
    
    def _calculate_ema(self, prices: pd.Series, period: int) -> pd.Series:
        """Calculate Exponential Moving Average."""
        return prices.ewm(span=period, adjust=False).mean()
    
    def _calculate_rsi(self, prices: pd.Series, period: int = 14) -> pd.Series:
        """Calculate Relative Strength Index."""
        delta = prices.diff()
        gain = delta.where(delta > 0, 0.0)
        loss = (-delta).where(delta < 0, 0.0)
        avg_gain = gain.rolling(window=period).mean()
        avg_loss = loss.rolling(window=period).mean()
        rs = avg_gain / avg_loss
        return 100 - (100 / (1 + rs))
    
    def _calculate_macd(self, prices: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
        """Calculate MACD indicator."""
        ema_fast = prices.ewm(span=fast, adjust=False).mean()
        ema_slow = prices.ewm(span=slow, adjust=False).mean()
        macd_line = ema_fast - ema_slow
        signal_line = macd_line.ewm(span=signal, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram
    
    def _calculate_bollinger_bands(self, prices: pd.Series, period: int = 20, std_dev: float = 2.0):
        """Calculate Bollinger Bands."""
        sma = prices.rolling(window=period).mean()
        std = prices.rolling(window=period).std()
        return sma + (std * std_dev), sma, sma - (std * std_dev)
    
    def analyze_technical_indicators(self, market_data: Dict) -> Dict:
        """
        Perform comprehensive technical analysis on market data.
        
        Args:
            market_data: Dictionary containing 'symbol', 'candles' (OHLCV data)
        
        Returns:
            Dictionary with technical signals and scores
        """
        symbol = market_data.get('symbol', 'UNKNOWN')
        candles = market_data.get('candles', [])
        
        if len(candles) < 30:
            return {
                "symbol": symbol,
                "signal": "HOLD",
                "confidence": 0.0,
                "reasoning": "Insufficient data for technical analysis (< 30 periods)",
                "indicators": {}
            }
        
        df = pd.DataFrame(candles)
        df['close'] = pd.to_numeric(df['close'])
        df['volume'] = pd.to_numeric(df['volume'])
        df = df.sort_values('date').reset_index(drop=True)
        
        prices = df['close']
        volumes = df['volume']
        current_price = float(prices.iloc[-1])
        
        # Calculate all indicators
        sma20 = self._calculate_sma(prices, 20)
        sma50 = self._calculate_sma(prices, 50)
        sma200 = self._calculate_sma(prices, 200)
        ema12 = self._calculate_ema(prices, 12)
        ema26 = self._calculate_ema(prices, 26)
        rsi = self._calculate_rsi(prices)
        macd_line, signal_line, histogram = self._calculate_macd(prices)
        upper_band, middle_band, lower_band = self._calculate_bollinger_bands(prices)
        
        # Generate signals
        signals = []
        score = 0.0
        
        # Moving Average Analysis
        if not pd.isna(sma20.iloc[-1]) and not pd.isna(sma50.iloc[-1]):
            if current_price > sma20.iloc[-1] > sma50.iloc[-1]:
                signals.append("Bullish: Price above SMA20 and SMA50")
                score += 1.0
            elif current_price < sma20.iloc[-1] < sma50.iloc[-1]:
                signals.append("Bearish: Price below SMA20 and SMA50")
                score -= 1.0
        
        # RSI Analysis
        if not pd.isna(rsi.iloc[-1]):
            rsi_val = float(rsi.iloc[-1])
            if rsi_val < 30:
                signals.append(f"Oversold: RSI at {rsi_val:.1f} (< 30)")
                score += 1.5
            elif rsi_val > 70:
                signals.append(f"Overbought: RSI at {rsi_val:.1f} (> 70)")
                score -= 1.5
        
        # MACD Analysis
        if not pd.isna(macd_line.iloc[-1]) and not pd.isna(signal_line.iloc[-1]):
            if macd_line.iloc[-1] > signal_line.iloc[-1] and macd_line.iloc[-1] > 0:
                signals.append("Bullish: MACD above signal line")
                score += 1.0
            elif macd_line.iloc[-1] < signal_line.iloc[-1] and macd_line.iloc[-1] < 0:
                signals.append("Bearish: MACD below signal line")
                score -= 1.0
        
        # Bollinger Bands Analysis
        if not pd.isna(lower_band.iloc[-1]) and not pd.isna(upper_band.iloc[-1]):
            if current_price < lower_band.iloc[-1]:
                signals.append("Oversold: Price below lower Bollinger Band")
                score += 1.0
            elif current_price > upper_band.iloc[-1]:
                signals.append("Overbought: Price above upper Bollinger Band")
                score -= 1.0
        
        # Volume Analysis
        avg_volume = volumes.tail(20).mean()
        current_volume = volumes.iloc[-1]
        if current_volume > avg_volume * 1.5:
            signals.append("High volume: Potential breakout")
            score += 0.5
        
        # Determine overall signal
        if score > 2.0:
            signal = "STRONG_BUY"
            confidence = min(abs(score) / 5.0, 1.0)
        elif score > 0.5:
            signal = "BUY"
            confidence = min(abs(score) / 5.0, 1.0)
        elif score < -2.0:
            signal = "STRONG_SELL"
            confidence = min(abs(score) / 5.0, 1.0)
        elif score < -0.5:
            signal = "SELL"
            confidence = min(abs(score) / 5.0, 1.0)
        else:
            signal = "HOLD"
            confidence = 0.5
        
        return {
            "symbol": symbol,
            "signal": signal,
            "confidence": round(confidence, 2),
            "score": round(score, 2),
            "reasoning": "; ".join(signals),
            "indicators": {
                "current_price": round(current_price, 2),
                "sma20": round(float(sma20.iloc[-1]), 2) if not pd.isna(sma20.iloc[-1]) else None,
                "sma50": round(float(sma50.iloc[-1]), 2) if not pd.isna(sma50.iloc[-1]) else None,
                "rsi": round(float(rsi.iloc[-1]), 2) if not pd.isna(rsi.iloc[-1]) else None,
                "macd": round(float(macd_line.iloc[-1]), 3) if not pd.isna(macd_line.iloc[-1]) else None,
                "volume_ratio": round(float(current_volume / avg_volume), 2) if avg_volume > 0 else None,
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _create_agent(self) -> Agent:
        """Create the CrewAI agent for technical analysis."""
        
        technical_analysis_tool = Tool(
            name="technical_analysis",
            func=self.analyze_technical_indicators,
            description="Analyzes price charts and technical indicators to generate trading signals"
        )
        
        return Agent(
            role="Technical Analyst",
            goal="Analyze price charts, identify trends, and generate accurate trading signals based on technical indicators",
            backstory="""You are an expert technical analyst with years of experience in chart pattern 
            recognition and indicator analysis. You specialize in identifying entry and exit points using 
            moving averages, RSI, MACD, Bollinger Bands, and volume analysis. Your recommendations are 
            data-driven and based on proven technical analysis principles.""",
            tools=[technical_analysis_tool],
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )
    
    def create_analysis_task(self, market_data: Dict) -> Task:
        """Create a CrewAI task for technical analysis."""
        return Task(
            description=f"""Perform comprehensive technical analysis on {market_data.get('symbol', 'the given symbol')}.
            Analyze price trends, momentum indicators, and volume patterns.
            Provide a clear BUY, SELL, or HOLD recommendation with confidence level and detailed reasoning.""",
            agent=self.agent,
            expected_output="Technical analysis report with signal, confidence, and reasoning based on multiple indicators"
        )
