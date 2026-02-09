"""
Multi-Agent Analysis Endpoint
Uses CrewAI orchestrator with specialized agents for comprehensive trading analysis.
"""

import asyncio
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Watchlist, BrokerConnection
from agents import FinanceCrewOrchestrator
from routes.market import fetch_history, get_quote
from routes.brokers import _decrypt, alpaca_get_account

router = APIRouter(prefix="/api/multi-agent", tags=["multi-agent"])

# Global orchestrator instance
_orchestrator: Optional[FinanceCrewOrchestrator] = None


def get_orchestrator() -> FinanceCrewOrchestrator:
    """Get or create the multi-agent orchestrator."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = FinanceCrewOrchestrator(model="gpt-4")
    return _orchestrator


class AnalysisRequest(BaseModel):
    """Request body for multi-agent analysis."""
    symbol: str
    portfolio_value: Optional[float] = 10000.0
    risk_per_trade: Optional[float] = 0.02
    max_position_pct: Optional[float] = 20.0
    min_confidence: Optional[float] = 0.6


@router.post("/analyze")
async def analyze_symbol(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):
    """
    Perform multi-agent analysis on a symbol.
    
    This endpoint orchestrates three specialized agents:
    1. Technical Analyst - Chart patterns and indicators
    2. Fundamental Researcher - News sentiment analysis
    3. Risk Manager - Position sizing and validation
    
    Returns comprehensive analysis with trading recommendation.
    """
    try:
        orchestrator = get_orchestrator()
        
        # Fetch market data (price history)
        candles = await fetch_history(request.symbol, period="3mo")
        if not candles:
            raise HTTPException(status_code=404, detail=f"No market data found for {request.symbol}")
        
        market_data = {
            'candles': candles,
            'news': []  # Will be fetched by fundamental researcher
        }
        
        # Get current portfolio data
        broker_conn = db.query(BrokerConnection).first()
        portfolio_value = request.portfolio_value
        
        if broker_conn:
            try:
                api_key = _decrypt(broker_conn.api_key_enc)
                secret_key = _decrypt(broker_conn.secret_key_enc)
                account = await alpaca_get_account(api_key, secret_key, broker_conn.is_paper)
                portfolio_value = float(account.get("portfolio_value", portfolio_value))
            except Exception as e:
                print(f"Error fetching portfolio value: {e}")
        
        portfolio_data = {
            'total_value': portfolio_value,
            'positions': []  # TODO: Fetch current positions
        }
        
        risk_params = {
            'risk_per_trade': request.risk_per_trade,
            'max_position_pct': request.max_position_pct,
            'min_confidence': request.min_confidence
        }
        
        # Run multi-agent analysis
        result = await orchestrator.analyze_symbol(
            symbol=request.symbol,
            market_data=market_data,
            portfolio_data=portfolio_data,
            risk_params=risk_params
        )
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/batch-analyze")
async def batch_analyze(
    symbols: list[str],
    portfolio_value: Optional[float] = 10000.0,
    risk_per_trade: Optional[float] = 0.02,
    max_position_pct: Optional[float] = 20.0,
    db: Session = Depends(get_db)
):
    """
    Perform multi-agent analysis on multiple symbols.
    
    Useful for screening watchlists and generating trading ideas.
    """
    try:
        orchestrator = get_orchestrator()
        
        # Get portfolio data
        broker_conn = db.query(BrokerConnection).first()
        if broker_conn:
            try:
                api_key = _decrypt(broker_conn.api_key_enc)
                secret_key = _decrypt(broker_conn.secret_key_enc)
                account = await alpaca_get_account(api_key, secret_key, broker_conn.is_paper)
                portfolio_value = float(account.get("portfolio_value", portfolio_value))
            except Exception:
                pass
        
        portfolio_data = {
            'total_value': portfolio_value,
            'positions': []
        }
        
        risk_params = {
            'risk_per_trade': risk_per_trade,
            'max_position_pct': max_position_pct,
            'min_confidence': 0.6
        }
        
        # Market data provider function
        async def fetch_market_data(symbol: str):
            candles = await fetch_history(symbol, period="3mo")
            return {
                'candles': candles,
                'news': []
            }
        
        # Run batch analysis
        results = await orchestrator.batch_analyze(
            symbols=symbols,
            market_data_provider=fetch_market_data,
            portfolio_data=portfolio_data,
            risk_params=risk_params
        )
        
        return {
            'analyzed_count': len(results),
            'timestamp': datetime.utcnow().isoformat(),
            'results': results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")


@router.get("/crew-status")
async def get_crew_status():
    """
    Get status of the multi-agent crew.
    
    Returns information about each agent and their capabilities.
    """
    try:
        orchestrator = get_orchestrator()
        status = orchestrator.get_crew_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get crew status: {str(e)}")


@router.post("/watchlist-scan")
async def scan_watchlist(
    db: Session = Depends(get_db)
):
    """
    Scan entire watchlist using multi-agent analysis.
    
    Returns top trading opportunities ranked by signal strength and confidence.
    """
    try:
        # Get all watchlist symbols
        watchlist_items = db.query(Watchlist).all()
        if not watchlist_items:
            return {
                'message': 'Watchlist is empty',
                'opportunities': []
            }
        
        symbols = [item.symbol for item in watchlist_items]
        
        # Run batch analysis
        orchestrator = get_orchestrator()
        
        # Get portfolio data
        broker_conn = db.query(BrokerConnection).first()
        portfolio_value = 10000.0
        
        if broker_conn:
            try:
                api_key = _decrypt(broker_conn.api_key_enc)
                secret_key = _decrypt(broker_conn.secret_key_enc)
                account = await alpaca_get_account(api_key, secret_key, broker_conn.is_paper)
                portfolio_value = float(account.get("portfolio_value", portfolio_value))
            except Exception:
                pass
        
        portfolio_data = {
            'total_value': portfolio_value,
            'positions': []
        }
        
        risk_params = {
            'risk_per_trade': 0.02,
            'max_position_pct': 20.0,
            'min_confidence': 0.6
        }
        
        async def fetch_market_data(symbol: str):
            candles = await fetch_history(symbol, period="3mo")
            return {
                'candles': candles,
                'news': []
            }
        
        results = await orchestrator.batch_analyze(
            symbols=symbols,
            market_data_provider=fetch_market_data,
            portfolio_data=portfolio_data,
            risk_params=risk_params
        )
        
        # Filter for actionable opportunities (approved trades with BUY/SELL signals)
        opportunities = [
            r for r in results
            if r.get('approved', False) and r.get('final_signal', 'HOLD') not in ['HOLD', 'ERROR', 'NO_TRADE']
        ]
        
        # Rank by combined score
        opportunities.sort(
            key=lambda x: abs(x.get('combined_score', 0)) * x.get('final_confidence', 0),
            reverse=True
        )
        
        return {
            'scanned_count': len(results),
            'opportunities_found': len(opportunities),
            'top_opportunities': opportunities[:10],  # Top 10
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Watchlist scan failed: {str(e)}")


@router.get("/agent/{agent_type}/capabilities")
async def get_agent_capabilities(agent_type: str):
    """
    Get capabilities and tools available to a specific agent.
    
    Args:
        agent_type: technical | fundamental | risk
    """
    orchestrator = get_orchestrator()
    
    agents_map = {
        'technical': orchestrator.technical_analyst,
        'fundamental': orchestrator.fundamental_researcher,
        'risk': orchestrator.risk_manager
    }
    
    if agent_type not in agents_map:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown agent type. Choose from: {', '.join(agents_map.keys())}"
        )
    
    agent = agents_map[agent_type]
    
    return {
        'agent_type': agent_type,
        'role': agent.agent.role,
        'goal': agent.agent.goal,
        'backstory': agent.agent.backstory,
        'tools': [
            {
                'name': tool.name,
                'description': tool.description
            }
            for tool in agent.agent.tools
        ],
        'timestamp': datetime.utcnow().isoformat()
    }
