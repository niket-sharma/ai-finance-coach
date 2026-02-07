# 🚀 Quick Start Guide

Get the AI Finance Coach running in **under 5 minutes**.

---

## Prerequisites

- Python 3.12+ (✅ You have 3.12.3)
- Node.js 18+ (check: `node --version`)
- npm or yarn

---

## Step 1: Clone & Navigate

```bash
cd ~/.openclaw/workspace/ai-finance-coach
```

---

## Step 2: Backend Setup

```bash
cd backend

# Virtual environment already created — just activate it
source venv/bin/activate

# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

✅ Backend running at: **http://localhost:8000**

Leave this terminal open.

---

## Step 3: Frontend Setup (New Terminal)

```bash
cd ~/.openclaw/workspace/ai-finance-coach/frontend

# Install dependencies (if not already)
npm install

# Start the dev server
npm run dev
```

✅ Frontend running at: **http://localhost:3000**

---

## Step 4: Open in Browser

Visit: **http://localhost:3000**

You'll see:
- 📊 **Dashboard** — Overview with sample data
- 💳 **Transactions** — Add/manage transactions
- 🧠 **AI Insights** — Spending analysis
- 📈 **Investments** — Portfolio tracker
- 🌍 **Market** — Live stock prices
- 💡 **Signals** — Buy/sell recommendations
- ⚙️ **Settings** — Profile & preferences

---

## Step 5: (Optional) Add API Keys

For **live market data** and **AI sentiment analysis**:

1. Get a free Finnhub API key: https://finnhub.io/register
2. Get an OpenAI API key: https://platform.openai.com/api-keys
3. Add to `backend/.env`:

```env
FINNHUB_API_KEY=your_finnhub_key_here
OPENAI_API_KEY=your_openai_key_here
```

4. Restart the backend server

Without these keys:
- Market data falls back to Yahoo Finance (slower, less reliable)
- Recommendations use technicals only (no sentiment analysis)

---

## Using Docker (Alternative)

If you prefer Docker:

```bash
docker-compose up -d
```

Both servers will start automatically:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

---

## What's Next?

1. **Explore the app** — Try adding transactions, investments
2. **Test market data** — Search for stocks (AAPL, TSLA, etc.)
3. **Check recommendations** — See buy/sell signals
4. **Read the docs:**
   - `PRODUCTION_STATUS.md` — Feature list & deployment guide
   - `ROADMAP.md` — Technical deep-dive

---

## Troubleshooting

### Backend won't start
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend won't start
```bash
cd frontend
npm install
```

### Port already in use
```bash
# Kill existing processes
pkill -f "uvicorn main:app"
pkill -f "next dev"
```

---

## 🎉 You're Ready!

The application is **fully functional** with all 4 phases complete:
- ✅ Live Market Data
- ✅ Buy/Sell Recommendations
- ✅ Portfolio Sync (Alpaca)
- ✅ Trading Agent

For production deployment, see `PRODUCTION_STATUS.md`.
