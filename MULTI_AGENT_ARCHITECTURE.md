# 🤖 Multi-Agent System Architecture

## Overview

The AI Finance Coach uses a **Multi-Agent System** powered by **CrewAI** and **LangChain** to provide comprehensive trading analysis. Three specialized agents collaborate to generate informed trading signals:

1. **Technical Analysis Agent** - Chart patterns and indicators
2. **Fundamental Research Agent** - News sentiment and company analysis  
3. **Risk Management Agent** - Position sizing and trade validation

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Multi-Agent Trading System                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │   Technical      │  │   Fundamental    │  │      Risk     │ │
│  │   Analyst        │  │   Researcher     │  │   Manager     │ │
│  │                  │  │                  │  │               │ │
│  │ • SMA/EMA        │  │ • News Sentiment │  │ • Position    │ │
│  │ • RSI            │  │ • Company Events │  │   Sizing      │ │
│  │ • MACD           │  │ • Market Context │  │ • Stop-Loss   │ │
│  │ • Bollinger      │  │ • GPT Analysis   │  │ • Portfolio   │ │
│  │   Bands          │  │ • Finnhub API    │  │   Limits      │ │
│  │ • Volume         │  │                  │  │ • Validation  │ │
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘ │
│           │                     │                     │         │
│           └─────────────────────┼─────────────────────┘         │
│                                 │                               │
│                    ┌────────────▼──────────────┐                │
│                    │  CrewAI Orchestrator      │                │
│                    │  • Signal Combination     │                │
│                    │  • Weighted Analysis      │                │
│                    │  • Consensus Building     │                │
│                    └────────────┬──────────────┘                │
│                                 │                               │
│                    ┌────────────▼──────────────┐                │
│                    │   Trading Recommendation  │                │
│                    │   • Signal (BUY/SELL)     │                │
│                    │   • Confidence Score      │                │
│                    │   • Position Size         │                │
│                    │   • Risk Assessment       │                │
│                    └───────────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │   Execution (via Alpaca)   │
                    │   • Paper Trading          │
                    │   • Live Trading           │
                    │   • Advisory Mode          │
                    └────────────────────────────┘
```

## Agent Details

### 1. Technical Analysis Agent

**Role:** Chart pattern recognition and indicator analysis

**Tools:**
- Moving Averages (SMA 20/50/200)
- Exponential Moving Averages (EMA 12/26)
- RSI (Relative Strength Index)
- MACD (Moving Average Convergence Divergence)
- Bollinger Bands
- Volume Analysis

**Output:**
- Signal: STRONG_BUY | BUY | HOLD | SELL | STRONG_SELL
- Confidence: 0.0 - 1.0
- Technical Score: Composite indicator score
- Reasoning: Detailed breakdown of each indicator

**Example Analysis:**
```python
{
  "signal": "BUY",
  "confidence": 0.75,
  "score": 2.5,
  "reasoning": "Bullish: Price above SMA20 and SMA50; Oversold: RSI at 28.3 (< 30); Bullish: MACD above signal line",
  "indicators": {
    "current_price": 150.25,
    "sma20": 148.50,
    "sma50": 145.30,
    "rsi": 28.3,
    "macd": 0.45
  }
}
```

### 2. Fundamental Research Agent

**Role:** News sentiment analysis and company research

**Data Sources:**
- Finnhub API (news headlines & summaries)
- OpenAI GPT-4 (sentiment analysis)
- Market context data

**Output:**
- Signal: BUY | WEAK_BUY | HOLD | WEAK_SELL | SELL
- Sentiment: VERY_POSITIVE | POSITIVE | NEUTRAL | NEGATIVE | VERY_NEGATIVE
- Sentiment Score: -1.0 to +1.0
- Reasoning: AI-generated summary of news impact
- News Count: Number of articles analyzed

**Example Analysis:**
```python
{
  "signal": "BUY",
  "confidence": 0.68,
  "sentiment": "POSITIVE",
  "sentiment_score": 0.65,
  "reasoning": "Recent earnings beat expectations, positive analyst upgrades, and favorable market conditions",
  "news_count": 8
}
```

### 3. Risk Management Agent

**Role:** Position sizing, portfolio limits, and trade validation

**Responsibilities:**
- Calculate optimal position size based on portfolio risk
- Validate trades against risk parameters
- Assess portfolio concentration
- Set stop-loss and take-profit levels
- Enforce daily loss limits

**Risk Parameters:**
- Max position size (% of portfolio)
- Max sector exposure
- Risk per trade (% of capital at risk)
- Daily loss limit (kill switch)
- Minimum confidence threshold

**Output:**
- Approved: true/false
- Position Size: Number of shares
- Position Value: Dollar amount
- Stop-Loss Level: Price level
- Warnings/Violations: Risk alerts

**Example Analysis:**
```python
{
  "approved": true,
  "status": "APPROVED",
  "recommended_shares": 25,
  "position_value": 3756.25,
  "position_pct": 18.8,
  "risk_amount": 200.0,
  "stop_loss": 142.50,
  "warnings": []
}
```

## Signal Combination Logic

The **CrewAI Orchestrator** combines agent outputs using a weighted approach:

### Weighting
- Technical Analysis: **60%**
- Fundamental Research: **40%**

### Scoring
Each signal is mapped to a numeric score:
- STRONG_BUY: +2.0
- BUY: +1.0
- WEAK_BUY: +0.5
- HOLD: 0.0
- WEAK_SELL: -0.5
- SELL: -1.0
- STRONG_SELL: -2.0

### Combined Score Calculation
```
Combined Score = (Technical Score × Technical Confidence × 0.6) + 
                 (Fundamental Score × Fundamental Confidence × 0.4)
```

### Final Signal Thresholds
- `combined_score > 1.5` → STRONG_BUY
- `combined_score > 0.5` → BUY
- `combined_score > 0.2` → WEAK_BUY
- `combined_score < -1.5` → STRONG_SELL
- `combined_score < -0.5` → SELL
- `combined_score < -0.2` → WEAK_SELL
- Otherwise → HOLD

### Agent Agreement
- **HIGH**: Both agents agree (score difference < 0.5)
- **MODERATE**: Slight disagreement (difference 0.5-1.5)
- **LOW**: Significant disagreement (difference > 1.5)

## API Endpoints

### 1. Single Symbol Analysis
```http
POST /api/multi-agent/analyze
Content-Type: application/json

{
  "symbol": "AAPL",
  "portfolio_value": 10000.0,
  "risk_per_trade": 0.02,
  "max_position_pct": 20.0,
  "min_confidence": 0.6
}
```

**Response:**
```json
{
  "symbol": "AAPL",
  "final_signal": "BUY",
  "final_confidence": 0.72,
  "combined_score": 1.8,
  "approved": true,
  "agent_agreement": "HIGH",
  "technical_analysis": { ... },
  "fundamental_analysis": { ... },
  "position_sizing": { ... },
  "risk_validation": { ... }
}
```

### 2. Batch Analysis
```http
POST /api/multi-agent/batch-analyze
Content-Type: application/json

{
  "symbols": ["AAPL", "GOOGL", "MSFT", "TSLA"],
  "portfolio_value": 10000.0,
  "risk_per_trade": 0.02
}
```

### 3. Watchlist Scan
```http
POST /api/multi-agent/watchlist-scan
```

Returns top trading opportunities from your watchlist, ranked by signal strength.

### 4. Crew Status
```http
GET /api/multi-agent/crew-status
```

Returns information about all agents and their capabilities.

### 5. Agent Capabilities
```http
GET /api/multi-agent/agent/technical/capabilities
GET /api/multi-agent/agent/fundamental/capabilities
GET /api/multi-agent/agent/risk/capabilities
```

## Autonomous Trading Loop

The system includes an **Autonomous Loop** using **APScheduler** that:

1. Runs at configurable intervals (default: every 15 minutes)
2. Scans the watchlist for trading opportunities
3. Runs multi-agent analysis on each symbol
4. Filters for high-confidence signals
5. Validates trades with the Risk Manager
6. Executes approved trades via Alpaca API

### Trading Modes

- **Advisory Mode**: Generates recommendations only (no execution)
- **Paper Trading**: Simulated trades (default, safe for testing)
- **Live Trading**: Real money (requires explicit opt-in)

### Safety Features

- **Daily Loss Limit**: Automatic kill switch if losses exceed threshold
- **Position Limits**: Max % of portfolio per position
- **Confirmation Threshold**: Large trades require manual approval
- **Symbol Whitelist**: Restrict trading to approved symbols only
- **Risk Validation**: Every trade vetted by Risk Manager

## Configuration

### Environment Variables
```env
# Required
OPENAI_API_KEY=sk-...          # For GPT-4 agents and sentiment analysis
FINNHUB_API_KEY=...            # For market data and news

# Alpaca (for trading execution)
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # Paper trading

# Optional
DATABASE_URL=sqlite:///./db/finance.db
FRONTEND_URL=http://localhost:3000
```

### Agent Configuration
```python
# In backend/agents/crew_orchestrator.py
orchestrator = FinanceCrewOrchestrator(
    model="gpt-4"  # or "gpt-4o-mini" for cost savings
)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Multi-Agent Framework | CrewAI 0.1+ |
| LLM Orchestration | LangChain |
| AI Model | OpenAI GPT-4 |
| Technical Analysis | Pandas, NumPy |
| Market Data | Finnhub API |
| News Analysis | OpenAI GPT-4o-mini |
| Brokerage API | Alpaca Trade API |
| Scheduling | APScheduler |
| Backend | FastAPI |
| Frontend | Next.js 14 |

## Usage Example

### Python
```python
from agents import FinanceCrewOrchestrator

# Initialize orchestrator
orchestrator = FinanceCrewOrchestrator(model="gpt-4")

# Prepare data
market_data = {
    'candles': fetch_price_history('AAPL', '3mo'),
    'news': []  # Auto-fetched by fundamental researcher
}

portfolio_data = {
    'total_value': 10000.0,
    'positions': []
}

risk_params = {
    'risk_per_trade': 0.02,
    'max_position_pct': 20.0,
    'min_confidence': 0.6
}

# Run multi-agent analysis
result = await orchestrator.analyze_symbol(
    symbol='AAPL',
    market_data=market_data,
    portfolio_data=portfolio_data,
    risk_params=risk_params
)

print(f"Signal: {result['final_signal']}")
print(f"Confidence: {result['final_confidence']}")
print(f"Approved: {result['approved']}")
```

### cURL
```bash
curl -X POST http://localhost:8000/api/multi-agent/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "portfolio_value": 10000.0,
    "risk_per_trade": 0.02
  }'
```

## Performance & Cost

### Latency
- Technical Analysis: ~1-2 seconds (local computation)
- Fundamental Research: ~3-5 seconds (API calls + GPT-4)
- Risk Management: <1 second (local computation)
- **Total**: ~5-8 seconds per symbol

### API Costs (per analysis)
- Finnhub (news): Free tier (60 req/min)
- OpenAI GPT-4o-mini (sentiment): ~$0.01 per analysis
- Alpaca (market data): Free

**Estimated cost**: ~$0.01 per symbol analyzed

## Future Enhancements

- [ ] **Portfolio Backtesting**: Test agent strategies on historical data
- [ ] **Agent Learning**: Fine-tune agents based on past performance
- [ ] **Additional Agents**: Sentiment from social media, earnings analysis
- [ ] **Real-time WebSocket**: Live price updates and instant alerts
- [ ] **Multi-asset Support**: Crypto, forex, commodities
- [ ] **Advanced Risk Models**: VaR, Sharpe ratio, correlation analysis

---

**Built with** CrewAI, LangChain, OpenAI GPT-4, Alpaca API, and FastAPI ❤️
