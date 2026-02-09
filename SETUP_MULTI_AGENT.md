# 🚀 Multi-Agent System Setup Guide

## Prerequisites

1. **Python 3.9+**
2. **OpenAI API Key** (required for GPT-4 agents)
3. **Finnhub API Key** (optional but recommended for news analysis)
4. **Alpaca Account** (optional, for paper/live trading)

## Step 1: Install Dependencies

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install new dependencies
pip install -r requirements.txt
```

## Step 2: Configure Environment Variables

Create/update `backend/.env`:

```env
# Required
OPENAI_API_KEY=sk-...                  # Get from https://platform.openai.com

# Recommended
FINNHUB_API_KEY=...                    # Get from https://finnhub.io (free tier)

# Optional (for trading execution)
ALPACA_API_KEY=...                     # Get from https://alpaca.markets
ALPACA_SECRET_KEY=...
ALPACA_BASE_URL=https://paper-api.alpaca.markets  # Paper trading (safe)

# Database
DATABASE_URL=sqlite:///./db/finance.db

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Step 3: Test the Multi-Agent System

Run the test script to verify everything is working:

```bash
cd backend
python test_multi_agent.py
```

**Expected output:**
```
==============================================================
🤖 AI Finance Coach - Multi-Agent System Test
==============================================================

1️⃣ Initializing CrewAI Orchestrator...
   ✅ Orchestrator initialized successfully

2️⃣ Checking agent status...
   ✅ Technical Analyst: Technical Analyst
   ✅ Fundamental Researcher: Fundamental Research Analyst
   ✅ Risk Manager: Risk Management Officer
   ✅ LLM Model: gpt-4

3️⃣ Generating sample market data...
   ✅ Generated 90 days of OHLCV data
   ✅ Price range: $149.00 → $194.50

4️⃣ Running multi-agent analysis on AAPL...

==============================================================
📊 ANALYSIS RESULTS
==============================================================

🎯 Final Signal: BUY
🎯 Confidence: 72%
🎯 Combined Score: 1.85
🎯 Agent Agreement: HIGH
🎯 Trade Approved: ✅ YES

...
```

## Step 4: Start the Backend

```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The multi-agent API will be available at `http://localhost:8000/api/multi-agent/`

## Step 5: Try the API Endpoints

### Analyze a Single Symbol

```bash
curl -X POST http://localhost:8000/api/multi-agent/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "portfolio_value": 10000.0,
    "risk_per_trade": 0.02,
    "max_position_pct": 20.0,
    "min_confidence": 0.6
  }'
```

### Get Crew Status

```bash
curl http://localhost:8000/api/multi-agent/crew-status
```

### Scan Watchlist

First, add symbols to your watchlist, then:

```bash
curl -X POST http://localhost:8000/api/multi-agent/watchlist-scan
```

### Get Agent Capabilities

```bash
curl http://localhost:8000/api/multi-agent/agent/technical/capabilities
curl http://localhost:8000/api/multi-agent/agent/fundamental/capabilities
curl http://localhost:8000/api/multi-agent/agent/risk/capabilities
```

## Step 6: Frontend Integration (Optional)

Add a new page in the frontend to display multi-agent analysis:

```typescript
// frontend/app/multi-agent/page.tsx

'use client'

import { useState } from 'react'

export default function MultiAgentPage() {
  const [symbol, setSymbol] = useState('AAPL')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const analyzeSymbol = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/multi-agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          portfolio_value: 10000,
          risk_per_trade: 0.02
        })
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Analysis failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">🤖 Multi-Agent Analysis</h1>
      
      <div className="flex gap-4 mb-6">
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Symbol (e.g., AAPL)"
          className="px-4 py-2 border rounded"
        />
        <button
          onClick={analyzeSymbol}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-4 bg-gray-800 rounded">
            <h2 className="text-xl font-bold mb-2">
              {result.final_signal}
            </h2>
            <p>Confidence: {(result.final_confidence * 100).toFixed(0)}%</p>
            <p>Combined Score: {result.combined_score}</p>
            <p>Agent Agreement: {result.agent_agreement}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="font-bold mb-2">📊 Technical</h3>
              <p>Signal: {result.technical_analysis.signal}</p>
              <p>Confidence: {(result.technical_analysis.confidence * 100).toFixed(0)}%</p>
            </div>

            <div className="p-4 bg-gray-800 rounded">
              <h3 className="font-bold mb-2">📰 Fundamental</h3>
              <p>Signal: {result.fundamental_analysis.signal}</p>
              <p>Sentiment: {result.fundamental_analysis.sentiment}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

## Troubleshooting

### Error: "No module named 'crewai'"

```bash
pip install crewai langchain langchain-openai
```

### Error: "OPENAI_API_KEY not set"

Make sure your `.env` file is in the `backend/` directory and contains:
```env
OPENAI_API_KEY=sk-...
```

### Error: "Insufficient data for technical analysis"

The technical analyst needs at least 30 days of price history. Use the test script to verify with sample data first.

### News Analysis Not Working

If you don't have a Finnhub API key, the fundamental researcher will still work but won't have news data. Set `FINNHUB_API_KEY` in `.env` to enable news analysis.

## Cost Estimation

### OpenAI API Costs

- **GPT-4**: ~$0.03 per 1K tokens (input), ~$0.06 per 1K tokens (output)
- **GPT-4o-mini**: ~$0.00015 per 1K tokens (input), ~$0.0006 per 1K tokens (output)

**Per analysis** (using GPT-4o-mini for sentiment):
- Technical analysis: 0 tokens (local computation)
- Fundamental sentiment: ~500-1000 tokens
- **Estimated cost**: ~$0.01 per symbol

**100 analyses per day** ≈ $1.00/day or $30/month

### Optimization Tips

1. Use `gpt-4o-mini` instead of `gpt-4` for cost savings:
   ```python
   orchestrator = FinanceCrewOrchestrator(model="gpt-4o-mini")
   ```

2. Cache analysis results (5-15 minute TTL)
3. Batch analyze watchlist instead of per-symbol
4. Use lower check intervals (30-60 min instead of 15)

## Next Steps

1. ✅ Test the system with sample data
2. ✅ Verify API endpoints work
3. ⬜ Add symbols to your watchlist
4. ⬜ Configure risk parameters
5. ⬜ Set up autonomous trading loop (optional)
6. ⬜ Build frontend UI for multi-agent analysis

---

**Questions?** See [MULTI_AGENT_ARCHITECTURE.md](MULTI_AGENT_ARCHITECTURE.md) for detailed documentation.
