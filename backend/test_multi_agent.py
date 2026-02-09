"""
Test script for Multi-Agent Trading System
Run this to verify the CrewAI agents are working correctly.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(__file__))

from agents import FinanceCrewOrchestrator


async def test_multi_agent_system():
    """Test the multi-agent system with sample data."""
    
    print("=" * 70)
    print("🤖 AI Finance Coach - Multi-Agent System Test")
    print("=" * 70)
    
    # Initialize orchestrator
    print("\n1️⃣ Initializing CrewAI Orchestrator...")
    try:
        orchestrator = FinanceCrewOrchestrator(model="gpt-4")
        print("   ✅ Orchestrator initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize orchestrator: {e}")
        return
    
    # Get crew status
    print("\n2️⃣ Checking agent status...")
    try:
        status = orchestrator.get_crew_status()
        print(f"   ✅ Technical Analyst: {status['technical_analyst']['role']}")
        print(f"   ✅ Fundamental Researcher: {status['fundamental_researcher']['role']}")
        print(f"   ✅ Risk Manager: {status['risk_manager']['role']}")
        print(f"   ✅ LLM Model: {status['llm_model']}")
    except Exception as e:
        print(f"   ❌ Failed to get crew status: {e}")
        return
    
    # Generate sample market data (simplified OHLCV)
    print("\n3️⃣ Generating sample market data...")
    sample_candles = []
    base_price = 150.0
    
    for i in range(90):  # 90 days of data
        date = (datetime.utcnow() - timedelta(days=90-i)).strftime("%Y-%m-%d")
        # Simulate trending price data
        close = base_price + (i * 0.5) + (5 * (i % 10 - 5))  # Uptrend with noise
        sample_candles.append({
            'date': date,
            'open': close - 1,
            'high': close + 2,
            'low': close - 2,
            'close': close,
            'volume': 1000000 + (i * 10000)
        })
    
    print(f"   ✅ Generated {len(sample_candles)} days of OHLCV data")
    print(f"   ✅ Price range: ${sample_candles[0]['close']:.2f} → ${sample_candles[-1]['close']:.2f}")
    
    # Test symbol analysis
    print("\n4️⃣ Running multi-agent analysis on AAPL...")
    
    market_data = {
        'candles': sample_candles,
        'news': []  # Will be fetched by fundamental researcher (if API keys available)
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
    
    try:
        result = await orchestrator.analyze_symbol(
            symbol='AAPL',
            market_data=market_data,
            portfolio_data=portfolio_data,
            risk_params=risk_params
        )
        
        print("\n" + "=" * 70)
        print("📊 ANALYSIS RESULTS")
        print("=" * 70)
        
        print(f"\n🎯 Final Signal: {result['final_signal']}")
        print(f"🎯 Confidence: {result['final_confidence']:.0%}")
        print(f"🎯 Combined Score: {result['combined_score']:.2f}")
        print(f"🎯 Agent Agreement: {result['agent_agreement']}")
        print(f"🎯 Trade Approved: {'✅ YES' if result.get('approved') else '❌ NO'}")
        
        print(f"\n📈 Technical Analysis:")
        tech = result['technical_analysis']
        print(f"   Signal: {tech['signal']} (confidence: {tech['confidence']:.0%})")
        print(f"   Score: {tech.get('score', 0):.2f}")
        print(f"   Current Price: ${tech['indicators']['current_price']:.2f}")
        print(f"   RSI: {tech['indicators'].get('rsi', 'N/A')}")
        print(f"   Reasoning: {tech['reasoning'][:150]}...")
        
        print(f"\n📰 Fundamental Analysis:")
        fund = result['fundamental_analysis']
        print(f"   Signal: {fund['signal']} (confidence: {fund['confidence']:.0%})")
        print(f"   Sentiment: {fund['sentiment']} (score: {fund['sentiment_score']:.2f})")
        print(f"   News Analyzed: {fund['news_count']}")
        print(f"   Reasoning: {fund['reasoning'][:150]}...")
        
        if result.get('position_sizing'):
            print(f"\n💰 Position Sizing:")
            pos = result['position_sizing']
            print(f"   Recommended Shares: {pos['recommended_shares']}")
            print(f"   Position Value: ${pos['position_value']:.2f}")
            print(f"   Position %: {pos['position_pct']:.1f}%")
            print(f"   Risk Amount: ${pos['risk_amount']:.2f}")
        
        if result.get('risk_validation'):
            print(f"\n🛡️  Risk Validation:")
            risk = result['risk_validation']
            print(f"   Status: {risk['status']}")
            print(f"   Reason: {risk['reason']}")
        
        print("\n" + "=" * 70)
        print("✅ Multi-Agent System Test PASSED")
        print("=" * 70)
        
    except Exception as e:
        print(f"\n❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    # Check for required environment variables
    required_env_vars = ['OPENAI_API_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        print(f"\n⚠️  Warning: Missing environment variables: {', '.join(missing_vars)}")
        print("   Some features may not work without API keys.\n")
    
    # Run the test
    asyncio.run(test_multi_agent_system())
