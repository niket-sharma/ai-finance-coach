# AI Finance Coach — Roadmap: Live Markets & Trading Agent

> Planned: 2026-02-01 | Status: Planning

---

## Overview

Four interconnected features, built in dependency order:

```
Phase 1: Live Market Data          ← foundation, everything else needs this
Phase 2: Buy/Sell Recommendations  ← needs Phase 1 (price history + technicals)
Phase 3: Portfolio Sync            ← needs brokerage OAuth; unblocks Phase 4
Phase 4: Trading Agent             ← needs Phases 1–3 to be useful
```

---

## Phase 1 — Live Market Data

**Goal:** Replace manual price entry with real-time quotes. Show a live market overview.

### Data Source Options (pick one or layer)
| Provider | Free Tier | WebSocket | Notes |
|---|---|---|---|
| **Finnhub** | 60 req/min | ✅ | Best free option; stocks + crypto + news |
| **Yahoo Finance** (yfinance) | Unlimited (scrape) | ❌ | Good for historical; unreliable for real-time |
| **Alpha Vantage** | 25 req/day | ❌ | Too limited for real-time |
| **Alpaca Market Data** | Free (delayed) | ✅ | Free real-time if you have an Alpaca account |

**Recommendation: Finnhub** as primary (free WebSocket, stocks + crypto + news). Alpaca as backup if user connects a brokerage account anyway.

### Backend Changes
- New service: `backend/routes/market.py`
  - `GET /api/market/quote/{symbol}` — single live quote
  - `GET /api/market/quotes` — batch quotes for user's watchlist
  - `GET /api/market/history/{symbol}` — OHLCV candle data (1d, 1w, 1m, 3m, 1y)
  - `GET /api/market/search?q={query}` — symbol search
  - `WS /api/market/ws` — WebSocket stream for live price updates
- New model: `Watchlist` (user's tracked symbols)
- Cache layer: in-memory cache with TTL (avoid hammering API on every frontend poll)
- API key stored as env var: `FINNHUB_API_KEY`

### Frontend Changes
- **Investments page:** Live price badges on each holding (green/red delta)
- **New page: Market** (`/market`)
  - Search bar → add to watchlist
  - Watchlist cards with live prices + 1-day sparkline
  - Market overview: indices (S&P 500, NASDAQ, Dow)
- **Price chart component** — candlestick or line chart with time-range selector
- WebSocket connection via a React context/hook (`useMarket`)

---

## Phase 2 — Buy/Sell Recommendations

**Goal:** Surface actionable trade signals with reasoning the user can trust.

### Recommendation Engine (backend)
New service: `backend/routes/recommendations.py`

**Layer 1 — Technical Analysis** (rule-based, no API cost)
- Moving averages: SMA 20/50/200 crossovers
- RSI (14): overbought >70, oversold <30
- MACD: signal line crossover
- Bollinger Bands: breakout detection
- Volume analysis: unusual volume spikes
- Score each signal → weighted composite score → BUY / SELL / HOLD

**Layer 2 — Sentiment (optional, costs tokens)**
- Pull recent news headlines via Finnhub news API
- Send to OpenAI GPT-4o for sentiment scoring + summary
- Blend sentiment into the composite score
- Gate this behind `OPENAI_API_KEY` — graceful fallback to technicals-only

**Layer 3 — Watchlist Alerts**
- Background job (cron or on-demand) scans watchlist
- Triggers alert when a signal crosses a threshold
- Stores alerts in DB for history

### Data Model
```python
class Recommendation:
    symbol: str
    signal: "BUY" | "SELL" | "HOLD"
    confidence: float          # 0–1
    technicals: dict           # per-indicator scores
    sentiment: dict | None     # null if no API key
    reasoning: str             # human-readable summary
    generated_at: datetime
```

### Frontend Changes
- **Recommendations page** (`/recommendations`)
  - Signal cards: symbol, signal badge, confidence bar, reasoning text
  - Expandable detail: technical indicators breakdown, sentiment summary
  - Filter by signal type
- **Investment cards:** small signal badge next to live price
- Toast notification when a new alert fires

### Endpoints
- `GET /api/recommendations` — all current recommendations for watchlist
- `GET /api/recommendations/{symbol}` — deep analysis for one symbol
- `GET /api/alerts` — historical alert log

---

## Phase 3 — Portfolio Sync (Brokerage Integration)

**Goal:** User connects their brokerage → portfolio auto-syncs. No manual entry.

### Brokerage Candidates
| Broker | API | Auth | Trading | Notes |
|---|---|---|---|---|
| **Alpaca** | ✅ Official | OAuth 2.0 | ✅ Paper + Live | Best for dev; free paper trading |
| **Robinhood** | Unofficial only | Custom auth | ⚠️ | `robin_stocks` works but against ToS; risky |
| **Polymarket** | ✅ Official | API key | ✅ | Prediction markets, not stocks |
| **Interactive Brokers** | ✅ Official | OAuth | ✅ | Complex but legitimate for stocks |

**Recommendation:** Start with **Alpaca** (paper trading for safety, official API, free). Add Polymarket as a second option for prediction market users. Skip Robinhood's unofficial API — too fragile and legally risky.

### OAuth Flow
```
User clicks "Connect Alpaca" →
  Redirect to Alpaca OAuth →
  Callback with code →
  Exchange for access_token + refresh_token →
  Store tokens encrypted in DB (per user) →
  Sync portfolio on connect + every N minutes
```

### Backend Changes
- New service: `backend/routes/brokers.py`
  - `GET /api/brokers/available` — list supported brokers
  - `POST /api/brokers/connect/{broker}` — initiate OAuth
  - `GET /api/brokers/callback` — OAuth callback handler
  - `GET /api/brokers/status` — connected brokers + sync status
  - `DELETE /api/brokers/{broker}` — disconnect
- New models: `BrokerConnection` (stores encrypted tokens, broker type, status)
- Sync job: on connect + periodic (every 5 min) pull positions from brokerage API
- Map brokerage positions → internal `Investment` model (auto-create/update)
- Token encryption: use `cryptography` (Fernet) with a server-side key

### Alpaca Integration Details
```python
# Libraries: alpaca-trade-api or alpaca-py (newer)
from alpaca.trading.client import TradingClient
from alpaca.data.historical import StockHistoricalDataClient

client = TradingClient(api_key, secret_key)
portfolio = client.get_account()
positions = client.get_all_positions()
```

### Polymarket Integration Details
```python
# Polymarket API: REST-based
# GET /api/markets — list prediction markets
# GET /api/positions — user's open positions
# POST /api/orders — place a bet
```

### Frontend Changes
- **Settings page:** "Connected Brokers" section
  - Connect / Disconnect buttons per broker
  - Sync status + last synced timestamp
  - Error states (token expired, etc.)
- Investments page auto-populates from connected brokers
- Visual tag: which holdings are synced vs manual

---

## Phase 4 — Trading Agent

**Goal:** An autonomous agent that analyzes the market, decides trades, and executes them — with user-defined guardrails.

### Architecture

```
┌─────────────────────────────────────────────┐
│                 Trading Agent                 │
│                                               │
│  ┌─────────┐   ┌──────────┐   ┌───────────┐ │
│  │ Analyze │──▶│  Decide  │──▶│  Execute  │ │
│  │ Market  │   │  Trade   │   │   Order   │ │
│  └─────────┘   └──────────┘   └───────────┘ │
│       ↑              ↑               ↓       │
│  Live prices    Recommendations   Brokerage  │
│  + History      Engine (Ph 2)     API (Ph 3) │
│       ↑              ↑               ↓       │
│  Finnhub/WS     Technicals +    Alpaca /    │
│                 Sentiment       Polymarket   │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │          Safety Rails                │    │
│  │  • Max trade size (% of portfolio)   │    │
│  │  • Per-symbol position limits        │    │
│  │  • Stop-loss auto-trigger            │    │
│  │  • Confirmation threshold ($)        │    │
│  │  • Symbol whitelist                  │    │
│  │  • Risk profile (conservative/        │    │
│  │    moderate/aggressive)              │    │
│  │  • Daily loss limit (kill switch)    │    │
│  └──────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Agent Loop (runs every N minutes or on signal trigger)
1. **Fetch** live prices + recent history for watchlist symbols
2. **Analyze** using recommendation engine (technicals + sentiment)
3. **Filter** by user's risk profile and guardrails
4. **Decide** — BUY / SELL / HOLD for each symbol
5. **Check** safety rails (position limits, loss limits, confirmation threshold)
6. **Execute** order via brokerage API (or queue for user confirmation)
7. **Log** everything — decision, reasoning, order details, outcome
8. **Notify** user of any trades taken

### Modes
- **Paper Trading** (default) — simulates trades, no real money. Great for testing.
- **Live Trading** — real orders. Requires explicit user opt-in per session.
- **Advisory** — never trades, only recommends. User clicks to execute manually.

### User Configuration (stored in DB)
```python
class AgentConfig:
    enabled: bool
    mode: "paper" | "live" | "advisory"
    broker: str                    # "alpaca" | "polymarket"
    risk_profile: str              # "conservative" | "moderate" | "aggressive"
    max_trade_pct: float           # max % of portfolio per trade (e.g., 10%)
    max_position_pct: float        # max % in any single stock (e.g., 20%)
    daily_loss_limit_pct: float    # kill switch: stop if daily loss > X%
    confirm_above_usd: float       # trades above this $ need user confirmation
    symbol_whitelist: list[str]    # only trade these symbols (empty = all)
    check_interval_min: int        # how often the agent runs (e.g., 15 min)
```

### Risk Profiles (presets)
| Profile | Max Trade | Max Position | Daily Loss Limit | Confirm Above |
|---|---|---|---|---|
| Conservative | 5% | 10% | 2% | $100 |
| Moderate | 10% | 20% | 5% | $500 |
| Aggressive | 20% | 40% | 10% | $2000 |

### Backend Changes
- New service: `backend/routes/agent.py`
  - `GET /api/agent/config` — current agent config
  - `PUT /api/agent/config` — update config
  - `POST /api/agent/start` — start the agent loop
  - `POST /api/agent/stop` — stop
  - `GET /api/agent/status` — running status + last run info
  - `GET /api/agent/log` — trade log (decisions + executions)
  - `POST /api/agent/confirm/{trade_id}` — user confirms a pending trade
- Background worker: APScheduler or Celery for the agent loop
- Trade execution via Alpaca/Polymarket SDK
- Full audit trail in DB

### Frontend Changes
- **Agent page** (`/agent`)
  - Enable/disable toggle + mode selector (paper / live / advisory)
  - Risk profile picker with description cards
  - Advanced config: trade limits, symbol whitelist, check interval
  - Live status panel: last run, next run, current positions
  - Trade log: chronological feed of decisions + executions
  - Pending confirmations: trades waiting for user approval
- Real-time updates via WebSocket for trade notifications

---

## Tech Stack Additions

| Need | Library/Service |
|---|---|
| Market data | `finnhub` Python client |
| Brokerage (stocks) | `alpaca-py` |
| Brokerage (prediction) | Polymarket REST API (custom client) |
| Sentiment LLM | `openai` (GPT-4o-mini to keep cost low) |
| Technical analysis | `pandas-ta` or `ta` (TA-Lib wrapper) |
| Background jobs | `apscheduler` (lightweight, no Redis needed) |
| Token encryption | `cryptography` (Fernet) |
| Charts (frontend) | `recharts` (already in Next.js ecosystem) |
| WebSocket (frontend) | native `WebSocket` API via React hook |
| WebSocket (backend) | `fastapi` + `starlette.websockets` |

---

## Env Vars Needed

```env
# Market data
FINNHUB_API_KEY=...

# LLM (optional — enables sentiment layer)
OPENAI_API_KEY=...

# Alpaca (set by OAuth flow, but API keys needed for market data)
ALPACA_API_KEY=...
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # paper trading default

# Encryption
ENCRYPTION_KEY=...  # Fernet key for token storage

# Polymarket (optional)
POLYMARKET_API_KEY=...
```

---

## Estimated Effort (rough)

| Phase | Complexity | Estimate |
|---|---|---|
| 1 — Live Market Data | Medium | 4–6h |
| 2 — Recommendations | Medium-High | 5–8h |
| 3 — Portfolio Sync | High (OAuth + crypto) | 6–10h |
| 4 — Trading Agent | High (agent loop + safety) | 8–12h |
| **Total** | | **23–36h** |

---

## Open Questions for Niket
1. **Alpaca vs Robinhood:** Alpaca is the safe/official choice. Robinhood has no official API — worth the risk?
2. **Polymarket:** Is this a priority alongside stocks, or a nice-to-have?
3. **LLM for sentiment:** OK to gate behind OPENAI_API_KEY and use GPT-4o-mini (cheap)?
4. **Paper trading first:** Ship paper mode before wiring live trading?
5. **Confirmation UX:** For trades above the threshold — push notification? In-app modal? Both?
6. **Multi-user:** The current app is single-user. Trading agent implies this stays single-user for now?
