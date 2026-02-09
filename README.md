# 💰 AI Finance Coach

A modern, AI-powered personal finance tracking application with **Multi-Agent System** for autonomous trading. Built with **CrewAI**, **LangChain**, Next.js, and FastAPI.

![AI Finance Coach](https://via.placeholder.com/800x400/0f1117/6366f1?text=AI+Finance+Coach+Dashboard)

## ✨ Features

- **📊 Dashboard** — Overview of balance, income, expenses, and spending breakdown
- **💳 Transactions** — Full CRUD with filtering by category, type, and date range
- **🧠 AI Insights** — Rule-based spending analysis with trend detection and savings recommendations
- **📈 Investments** — Portfolio tracker for stocks, crypto, mutual funds, and ETFs
- **🤖 Multi-Agent Trading** — Autonomous trading system with specialized agents:
  - **Technical Analysis Agent** — Chart patterns, indicators, and price action
  - **Fundamental Research Agent** — News sentiment and company analysis
  - **Risk Management Agent** — Position sizing and trade validation
- **🔄 Autonomous Loops** — APScheduler-based periodic trading execution
- **📡 Real-time Market Data** — Alpaca API integration for live prices and execution
- **⚙️ Settings** — Profile configuration and preference management

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS (dark theme) |
| Backend | Python FastAPI |
| AI Framework | CrewAI + LangChain |
| LLM | OpenAI GPT-4 |
| Market Data | Alpaca API + Finnhub |
| Database | SQLite via SQLAlchemy |
| Scheduling | APScheduler |
| Deployment | Docker Compose |

## 🤖 Multi-Agent System

The AI Finance Coach uses a **Multi-Agent System** powered by CrewAI and LangChain. Three specialized agents collaborate to generate trading signals:

1. **Technical Analysis Agent**
   - Moving Averages (SMA/EMA)
   - RSI, MACD, Bollinger Bands
   - Volume analysis
   
2. **Fundamental Research Agent**
   - News sentiment analysis (via GPT-4)
   - Company events and market context
   - Finnhub API integration
   
3. **Risk Management Agent**
   - Position sizing recommendations
   - Portfolio risk assessment
   - Trade validation and stop-loss calculation

**See [MULTI_AGENT_ARCHITECTURE.md](MULTI_AGENT_ARCHITECTURE.md) for detailed documentation.**

## 🚀 Quick Start

### Option A: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/niket-sharma/ai-finance-coach.git
cd ai-finance-coach

# Start everything
docker-compose up -d

# Open in browser
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

### Option B: Manual Setup

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server (creates SQLite DB automatically)
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:3000
```

## 📁 Project Structure

```
ai-finance-coach/
├── frontend/                    # Next.js 14 application
│   ├── app/                     # App Router pages
│   │   ├── layout.tsx           # Root layout + global styles
│   │   ├── page.tsx             # Dashboard (home)
│   │   ├── transactions/        # Transaction management
│   │   ├── insights/            # AI-powered insights
│   │   ├── investments/         # Portfolio tracker
│   │   └── settings/            # User settings
│   ├── components/              # Reusable UI components
│   │   ├── sidebar.tsx          # Navigation sidebar
│   │   ├── dashboard-cards.tsx  # Summary cards & category breakdown
│   │   ├── transaction-list.tsx # Transaction display component
│   │   ├── add-transaction-modal.tsx  # Transaction form modal
│   │   ├── insights-panel.tsx   # Insights engine & display
│   │   └── investment-tracker.tsx     # Portfolio management
│   ├── package.json
│   ├── tailwind.config.js
│   └── next.config.js
├── backend/                     # FastAPI application
│   ├── main.py                  # App entry + dashboard endpoint
│   ├── models.py                # SQLAlchemy database models
│   ├── schemas.py               # Pydantic request/response schemas
│   ├── database.py              # DB connection & session management
│   ├── routes/                  # API route handlers
│   │   ├── transactions.py      # CRUD for transactions
│   │   ├── investments.py       # CRUD for investments
│   │   └── insights.py          # Insight computation engine
│   ├── requirements.txt
│   └── .env.example
├── docker-compose.yml           # Full-stack Docker setup
└── README.md
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Dashboard summary stats |
| GET | `/api/transactions` | List transactions (supports filters) |
| POST | `/api/transactions` | Create transaction |
| DELETE | `/api/transactions/{id}` | Delete transaction |
| GET | `/api/investments` | List investments |
| POST | `/api/investments` | Create investment |
| DELETE | `/api/investments/{id}` | Delete investment |
| GET | `/api/insights` | Get computed insights |
| GET | `/api/health` | Health check |

### Query Parameters for GET `/api/transactions`

- `category` — Filter by category (Food, Transport, Housing, etc.)
- `type` — Filter by type (`income` or `expense`)
- `start_date` — Start date filter (YYYY-MM-DD)
- `end_date` — End date filter (YYYY-MM-DD)

## 🎯 Roadmap (v2)

- [ ] **OpenAI Integration** — GPT-4 powered financial insights and advice
- [ ] **Live Price Feeds** — Auto-update investment prices via Yahoo Finance / Alpha Vantage
- [ ] **Bank Account Sync** — Plaid integration for automatic transaction import
- [ ] **Export** — PDF/CSV export of reports and statements
- [ ] **Multi-user** — Authentication and per-user data isolation
- [ ] **Recurring Transactions** — Auto-log bills and subscriptions
- [ ] **Budget Goals** — Set monthly spending limits per category

## 📝 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
DATABASE_URL=sqlite:///./db/finance.db
FRONTEND_URL=http://localhost:3000

# Future: OpenAI integration
# OPENAI_API_KEY=sk-your-key-here
```

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

*Built with ❤️ for developers who want clean, fast financial tracking.*
