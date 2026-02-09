"""
CrewAI Orchestrator
Coordinates the multi-agent system for collaborative trading decisions.
"""

import asyncio
from typing import Dict, List, Optional
from datetime import datetime
from crewai import Crew, Process
from langchain_openai import ChatOpenAI

from .technical_analyst import TechnicalAnalystAgent
from .fundamental_researcher import FundamentalResearchAgent
from .risk_manager import RiskManagementAgent


class FinanceCrewOrchestrator:
    """
    Orchestrates collaboration between specialized agents:
    1. Technical Analyst - Chart patterns and indicators
    2. Fundamental Researcher - News sentiment and company analysis
    3. Risk Manager - Position sizing and trade validation
    """
    
    def __init__(self, model: str = "gpt-4"):
        """
        Initialize the multi-agent crew.
        
        Args:
            model: LLM model to use for agents
        """
        self.llm = ChatOpenAI(temperature=0.3, model=model)
        
        # Initialize specialized agents
        self.technical_analyst = TechnicalAnalystAgent(llm=self.llm)
        self.fundamental_researcher = FundamentalResearchAgent(llm=self.llm)
        self.risk_manager = RiskManagementAgent(llm=self.llm)
        
        self.crew = None
    
    async def analyze_symbol(
        self, 
        symbol: str,
        market_data: Dict,
        portfolio_data: Dict,
        risk_params: Dict
    ) -> Dict:
        """
        Perform comprehensive multi-agent analysis on a symbol.
        
        Args:
            symbol: Stock symbol to analyze
            market_data: Dictionary with 'candles' (OHLCV data)
            portfolio_data: Current portfolio state
            risk_params: Risk management parameters
        
        Returns:
            Comprehensive analysis with combined recommendations
        """
        print(f"\n{'='*60}")
        print(f"🤖 MULTI-AGENT ANALYSIS: {symbol}")
        print(f"{'='*60}\n")
        
        # Step 1: Technical Analysis
        print("📊 Technical Analyst analyzing charts...")
        technical_data = {
            'symbol': symbol,
            'candles': market_data.get('candles', [])
        }
        technical_result = self.technical_analyst.analyze_technical_indicators(technical_data)
        
        print(f"   ✓ Technical Signal: {technical_result['signal']} "
              f"(confidence: {technical_result['confidence']:.2f})")
        print(f"   ✓ Score: {technical_result.get('score', 0):.2f}")
        print(f"   ✓ Reasoning: {technical_result['reasoning'][:100]}...")
        
        # Step 2: Fundamental Research
        print("\n📰 Fundamental Researcher analyzing news...")
        news_data = market_data.get('news', [])
        
        # Fetch news if not provided
        if not news_data:
            news_data = await self.fundamental_researcher.fetch_company_news(symbol, days=7)
        
        fundamental_data = {
            'symbol': symbol,
            'news': news_data
        }
        fundamental_result = self.fundamental_researcher.perform_fundamental_analysis(fundamental_data)
        
        print(f"   ✓ Fundamental Signal: {fundamental_result['signal']} "
              f"(confidence: {fundamental_result['confidence']:.2f})")
        print(f"   ✓ Sentiment: {fundamental_result['sentiment']} "
              f"(score: {fundamental_result['sentiment_score']:.2f})")
        print(f"   ✓ News Count: {fundamental_result['news_count']}")
        
        # Step 3: Combine Signals
        print("\n🔄 Combining agent recommendations...")
        combined_result = self._combine_signals(technical_result, fundamental_result)
        
        print(f"   ✓ Combined Signal: {combined_result['final_signal']} "
              f"(confidence: {combined_result['final_confidence']:.2f})")
        
        # Step 4: Risk Management Validation
        print("\n🛡️  Risk Manager validating trade...")
        
        # Calculate position size if signal is actionable
        if combined_result['final_signal'] not in ['HOLD', 'NO_TRADE']:
            entry_price = technical_result['indicators'].get('current_price', 0)
            
            # Calculate stop-loss based on technical support/resistance
            stop_loss_pct = 0.05  # Default 5% stop-loss
            if combined_result['final_signal'].endswith('SELL'):
                stop_loss = entry_price * (1 + stop_loss_pct)
            else:
                stop_loss = entry_price * (1 - stop_loss_pct)
            
            # Position sizing
            position_sizing = self.risk_manager.calculate_position_size({
                'portfolio_value': portfolio_data.get('total_value', 0),
                'risk_per_trade': risk_params.get('risk_per_trade', 0.02),
                'entry_price': entry_price,
                'stop_loss': stop_loss,
                'symbol': symbol
            })
            
            # Trade validation
            trade_proposal = {
                'symbol': symbol,
                'signal': combined_result['final_signal'],
                'quantity': position_sizing.get('recommended_shares', 0),
                'entry_price': entry_price,
                'portfolio_value': portfolio_data.get('total_value', 0),
                'current_positions': portfolio_data.get('positions', []),
                'risk_params': risk_params,
                'confidence': combined_result['final_confidence']
            }
            
            risk_validation = self.risk_manager.validate_trade(trade_proposal)
            
            print(f"   ✓ Position Size: {position_sizing['recommended_shares']} shares "
                  f"(${position_sizing['position_value']:.2f}, {position_sizing['position_pct']:.1f}%)")
            print(f"   ✓ Risk Validation: {risk_validation['status']}")
            if risk_validation['warnings']:
                print(f"   ⚠️  Warnings: {', '.join(risk_validation['warnings'])}")
            if risk_validation['violations']:
                print(f"   ❌ Violations: {', '.join(risk_validation['violations'])}")
            
            combined_result['position_sizing'] = position_sizing
            combined_result['risk_validation'] = risk_validation
            combined_result['approved'] = risk_validation['approved']
        else:
            print(f"   ℹ️  No trade action required for HOLD signal")
            combined_result['approved'] = False
            combined_result['risk_validation'] = {
                'status': 'NO_TRADE',
                'reason': 'Signal is HOLD'
            }
        
        # Step 5: Final recommendation
        combined_result['technical_analysis'] = technical_result
        combined_result['fundamental_analysis'] = fundamental_result
        combined_result['timestamp'] = datetime.utcnow().isoformat()
        
        print(f"\n{'='*60}")
        print(f"✅ ANALYSIS COMPLETE")
        print(f"{'='*60}\n")
        
        return combined_result
    
    def _combine_signals(self, technical: Dict, fundamental: Dict) -> Dict:
        """
        Combine technical and fundamental signals into a final recommendation.
        
        Uses weighted average based on confidence levels and signal alignment.
        """
        # Map signals to numeric scores
        signal_scores = {
            'STRONG_BUY': 2.0,
            'BUY': 1.0,
            'WEAK_BUY': 0.5,
            'HOLD': 0.0,
            'WEAK_SELL': -0.5,
            'SELL': -1.0,
            'STRONG_SELL': -2.0,
            'NO_TRADE': 0.0
        }
        
        tech_signal = technical.get('signal', 'HOLD')
        fund_signal = fundamental.get('signal', 'HOLD')
        
        tech_score = signal_scores.get(tech_signal, 0.0)
        fund_score = signal_scores.get(fund_signal, 0.0)
        
        tech_confidence = technical.get('confidence', 0.5)
        fund_confidence = fundamental.get('confidence', 0.5)
        
        # Weighted average (technical gets 60% weight, fundamental 40%)
        tech_weight = 0.6
        fund_weight = 0.4
        
        combined_score = (tech_score * tech_confidence * tech_weight + 
                          fund_score * fund_confidence * fund_weight)
        combined_confidence = (tech_confidence * tech_weight + fund_confidence * fund_weight)
        
        # Determine final signal
        if combined_score > 1.5:
            final_signal = 'STRONG_BUY'
        elif combined_score > 0.5:
            final_signal = 'BUY'
        elif combined_score > 0.2:
            final_signal = 'WEAK_BUY'
        elif combined_score < -1.5:
            final_signal = 'STRONG_SELL'
        elif combined_score < -0.5:
            final_signal = 'SELL'
        elif combined_score < -0.2:
            final_signal = 'WEAK_SELL'
        else:
            final_signal = 'HOLD'
        
        # Generate combined reasoning
        reasoning_parts = []
        reasoning_parts.append(f"Technical: {tech_signal} ({tech_confidence:.0%} confident)")
        reasoning_parts.append(f"Fundamental: {fund_signal} ({fund_confidence:.0%} confident)")
        
        if tech_score > 0 and fund_score > 0:
            reasoning_parts.append("Both agents agree on bullish outlook")
        elif tech_score < 0 and fund_score < 0:
            reasoning_parts.append("Both agents agree on bearish outlook")
        elif abs(tech_score - fund_score) > 1.5:
            reasoning_parts.append("⚠️ Significant disagreement between technical and fundamental analysis")
        
        combined_reasoning = ". ".join(reasoning_parts)
        
        return {
            'final_signal': final_signal,
            'final_confidence': round(combined_confidence, 2),
            'combined_score': round(combined_score, 2),
            'technical_weight': tech_weight,
            'fundamental_weight': fund_weight,
            'reasoning': combined_reasoning,
            'agent_agreement': 'HIGH' if abs(tech_score - fund_score) < 0.5 else 
                               'MODERATE' if abs(tech_score - fund_score) < 1.5 else 'LOW'
        }
    
    async def batch_analyze(
        self,
        symbols: List[str],
        market_data_provider,
        portfolio_data: Dict,
        risk_params: Dict
    ) -> List[Dict]:
        """
        Analyze multiple symbols in batch.
        
        Args:
            symbols: List of stock symbols
            market_data_provider: Function to fetch market data for a symbol
            portfolio_data: Current portfolio state
            risk_params: Risk management parameters
        
        Returns:
            List of analysis results for each symbol
        """
        results = []
        
        for symbol in symbols:
            try:
                market_data = await market_data_provider(symbol)
                result = await self.analyze_symbol(
                    symbol=symbol,
                    market_data=market_data,
                    portfolio_data=portfolio_data,
                    risk_params=risk_params
                )
                results.append(result)
            except Exception as e:
                print(f"Error analyzing {symbol}: {e}")
                results.append({
                    'symbol': symbol,
                    'error': str(e),
                    'final_signal': 'ERROR',
                    'timestamp': datetime.utcnow().isoformat()
                })
        
        return results
    
    def get_crew_status(self) -> Dict:
        """Get status of all agents in the crew."""
        return {
            'technical_analyst': {
                'role': self.technical_analyst.agent.role,
                'tools': [tool.name for tool in self.technical_analyst.agent.tools]
            },
            'fundamental_researcher': {
                'role': self.fundamental_researcher.agent.role,
                'tools': [tool.name for tool in self.fundamental_researcher.agent.tools]
            },
            'risk_manager': {
                'role': self.risk_manager.agent.role,
                'tools': [tool.name for tool in self.risk_manager.agent.tools]
            },
            'llm_model': self.llm.model_name,
            'timestamp': datetime.utcnow().isoformat()
        }
