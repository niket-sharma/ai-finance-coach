"""
Risk Management Agent
Specialized in position sizing, portfolio risk, and trade validation.
"""

from typing import Dict, List, Optional
from datetime import datetime
from crewai import Agent, Task
from langchain.tools import Tool
from langchain_openai import ChatOpenAI


class RiskManagementAgent:
    """
    Agent specialized in risk management:
    - Position sizing recommendations
    - Portfolio diversification analysis
    - Stop-loss and take-profit levels
    - Risk-reward ratio calculation
    - Portfolio exposure limits
    """
    
    def __init__(self, llm: Optional[ChatOpenAI] = None):
        self.llm = llm or ChatOpenAI(temperature=0.1, model="gpt-4")  # Low temp for conservative risk mgmt
        self.agent = self._create_agent()
    
    def calculate_position_size(self, risk_params: Dict) -> Dict:
        """
        Calculate optimal position size based on risk parameters.
        
        Args:
            risk_params: Dictionary containing:
                - portfolio_value: Total portfolio value
                - risk_per_trade: Max % to risk per trade
                - entry_price: Planned entry price
                - stop_loss: Stop-loss price
                - symbol: Stock symbol
        
        Returns:
            Position sizing recommendation
        """
        portfolio_value = risk_params.get('portfolio_value', 0)
        risk_pct = risk_params.get('risk_per_trade', 0.02)  # Default 2%
        entry_price = risk_params.get('entry_price', 0)
        stop_loss = risk_params.get('stop_loss', 0)
        symbol = risk_params.get('symbol', 'UNKNOWN')
        
        if portfolio_value <= 0 or entry_price <= 0:
            return {
                "status": "ERROR",
                "message": "Invalid portfolio value or entry price",
                "recommended_shares": 0
            }
        
        # Calculate risk amount in dollars
        risk_amount = portfolio_value * risk_pct
        
        # Calculate risk per share
        if stop_loss > 0:
            risk_per_share = abs(entry_price - stop_loss)
            if risk_per_share > 0:
                recommended_shares = int(risk_amount / risk_per_share)
            else:
                recommended_shares = 0
        else:
            # No stop-loss provided, use default 5% risk per share
            risk_per_share = entry_price * 0.05
            recommended_shares = int(risk_amount / risk_per_share)
        
        # Calculate position value
        position_value = recommended_shares * entry_price
        position_pct = (position_value / portfolio_value * 100) if portfolio_value > 0 else 0
        
        return {
            "symbol": symbol,
            "recommended_shares": recommended_shares,
            "position_value": round(position_value, 2),
            "position_pct": round(position_pct, 2),
            "risk_amount": round(risk_amount, 2),
            "risk_per_share": round(risk_per_share, 2),
            "entry_price": entry_price,
            "stop_loss": stop_loss,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def calculate_stop_loss_take_profit(self, trade_params: Dict) -> Dict:
        """
        Calculate recommended stop-loss and take-profit levels.
        
        Args:
            trade_params: Dictionary containing:
                - entry_price: Planned entry price
                - signal: BUY or SELL
                - volatility: Optional volatility measure (ATR)
                - risk_reward_ratio: Desired risk/reward ratio (default 1:2)
        
        Returns:
            Stop-loss and take-profit recommendations
        """
        entry_price = trade_params.get('entry_price', 0)
        signal = trade_params.get('signal', 'HOLD')
        volatility = trade_params.get('volatility', entry_price * 0.02)  # Default 2% ATR
        risk_reward_ratio = trade_params.get('risk_reward_ratio', 2.0)  # Default 1:2
        
        if signal == 'BUY' or signal.endswith('_BUY'):
            # For long positions
            stop_loss = entry_price - (2 * volatility)  # 2 ATR below entry
            take_profit = entry_price + (2 * volatility * risk_reward_ratio)
        elif signal == 'SELL' or signal.endswith('_SELL'):
            # For short positions
            stop_loss = entry_price + (2 * volatility)  # 2 ATR above entry
            take_profit = entry_price - (2 * volatility * risk_reward_ratio)
        else:
            return {
                "status": "NO_TRADE",
                "message": "No stop-loss/take-profit for HOLD signal"
            }
        
        stop_loss_pct = abs((stop_loss - entry_price) / entry_price * 100)
        take_profit_pct = abs((take_profit - entry_price) / entry_price * 100)
        
        return {
            "entry_price": round(entry_price, 2),
            "stop_loss": round(stop_loss, 2),
            "take_profit": round(take_profit, 2),
            "stop_loss_pct": round(stop_loss_pct, 2),
            "take_profit_pct": round(take_profit_pct, 2),
            "risk_reward_ratio": risk_reward_ratio,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def assess_portfolio_risk(self, portfolio_data: Dict) -> Dict:
        """
        Assess overall portfolio risk and diversification.
        
        Args:
            portfolio_data: Dictionary containing:
                - positions: List of current positions
                - total_value: Total portfolio value
                - max_position_pct: Max % per position
                - max_sector_pct: Max % per sector
        
        Returns:
            Portfolio risk assessment
        """
        positions = portfolio_data.get('positions', [])
        total_value = portfolio_data.get('total_value', 0)
        max_position_pct = portfolio_data.get('max_position_pct', 20.0)
        max_sector_pct = portfolio_data.get('max_sector_pct', 30.0)
        
        if total_value <= 0:
            return {
                "status": "ERROR",
                "message": "Invalid portfolio value"
            }
        
        # Calculate position concentrations
        position_warnings = []
        sector_exposure = {}
        
        for pos in positions:
            symbol = pos.get('symbol', 'UNKNOWN')
            value = pos.get('value', 0)
            sector = pos.get('sector', 'Unknown')
            
            position_pct = (value / total_value * 100) if total_value > 0 else 0
            
            if position_pct > max_position_pct:
                position_warnings.append(
                    f"{symbol}: {position_pct:.1f}% exceeds max {max_position_pct}%"
                )
            
            # Track sector exposure
            sector_exposure[sector] = sector_exposure.get(sector, 0) + value
        
        # Check sector concentration
        sector_warnings = []
        for sector, value in sector_exposure.items():
            sector_pct = (value / total_value * 100) if total_value > 0 else 0
            if sector_pct > max_sector_pct:
                sector_warnings.append(
                    f"{sector}: {sector_pct:.1f}% exceeds max {max_sector_pct}%"
                )
        
        # Calculate overall risk score (0-10, where 10 is highest risk)
        risk_score = 0.0
        risk_score += len(position_warnings) * 2  # +2 per concentrated position
        risk_score += len(sector_warnings) * 1.5  # +1.5 per concentrated sector
        risk_score = min(risk_score, 10.0)
        
        # Determine risk level
        if risk_score < 3:
            risk_level = "LOW"
        elif risk_score < 6:
            risk_level = "MODERATE"
        elif risk_score < 8:
            risk_level = "HIGH"
        else:
            risk_level = "CRITICAL"
        
        return {
            "risk_level": risk_level,
            "risk_score": round(risk_score, 1),
            "total_positions": len(positions),
            "position_warnings": position_warnings,
            "sector_warnings": sector_warnings,
            "sector_exposure": {k: round(v, 2) for k, v in sector_exposure.items()},
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def validate_trade(self, trade_proposal: Dict) -> Dict:
        """
        Validate a trade proposal against risk management rules.
        
        Args:
            trade_proposal: Dictionary containing:
                - symbol: Stock symbol
                - signal: BUY/SELL/HOLD
                - quantity: Number of shares
                - entry_price: Entry price
                - portfolio_value: Current portfolio value
                - current_positions: List of current positions
                - risk_params: Risk parameters (max position %, etc.)
        
        Returns:
            Trade validation result with approval status
        """
        symbol = trade_proposal.get('symbol', 'UNKNOWN')
        signal = trade_proposal.get('signal', 'HOLD')
        quantity = trade_proposal.get('quantity', 0)
        entry_price = trade_proposal.get('entry_price', 0)
        portfolio_value = trade_proposal.get('portfolio_value', 0)
        risk_params = trade_proposal.get('risk_params', {})
        
        if signal == 'HOLD':
            return {
                "approved": False,
                "status": "NO_TRADE",
                "reason": "Signal is HOLD - no trade needed"
            }
        
        trade_value = quantity * entry_price
        position_pct = (trade_value / portfolio_value * 100) if portfolio_value > 0 else 0
        
        max_position_pct = risk_params.get('max_position_pct', 20.0)
        min_confidence = risk_params.get('min_confidence', 0.6)
        
        # Validation checks
        violations = []
        warnings = []
        
        if position_pct > max_position_pct:
            violations.append(f"Position size {position_pct:.1f}% exceeds max {max_position_pct}%")
        
        if portfolio_value > 0 and trade_value > portfolio_value:
            violations.append("Trade value exceeds total portfolio value")
        
        confidence = trade_proposal.get('confidence', 0.0)
        if confidence < min_confidence:
            warnings.append(f"Low confidence {confidence:.2f} < {min_confidence}")
        
        # Determine approval status
        if violations:
            approved = False
            status = "REJECTED"
            reason = "; ".join(violations)
        elif warnings:
            approved = True
            status = "APPROVED_WITH_WARNINGS"
            reason = "; ".join(warnings)
        else:
            approved = True
            status = "APPROVED"
            reason = "All risk checks passed"
        
        return {
            "symbol": symbol,
            "approved": approved,
            "status": status,
            "reason": reason,
            "trade_value": round(trade_value, 2),
            "position_pct": round(position_pct, 2),
            "violations": violations,
            "warnings": warnings,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _create_agent(self) -> Agent:
        """Create the CrewAI agent for risk management."""
        
        position_sizing_tool = Tool(
            name="position_sizing",
            func=self.calculate_position_size,
            description="Calculate optimal position size based on risk parameters and stop-loss levels"
        )
        
        risk_assessment_tool = Tool(
            name="risk_assessment",
            func=self.assess_portfolio_risk,
            description="Assess portfolio-level risk including concentration and diversification"
        )
        
        trade_validation_tool = Tool(
            name="trade_validation",
            func=self.validate_trade,
            description="Validate trade proposals against risk management rules and portfolio limits"
        )
        
        return Agent(
            role="Risk Management Officer",
            goal="Ensure all trades comply with risk management rules, optimize position sizing, and maintain portfolio safety",
            backstory="""You are a conservative risk manager with expertise in portfolio construction 
            and capital preservation. Your priority is protecting capital while allowing for strategic 
            growth. You specialize in position sizing, stop-loss placement, and portfolio diversification. 
            You have veto power over any trade that violates risk parameters.""",
            tools=[position_sizing_tool, risk_assessment_tool, trade_validation_tool],
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )
    
    def create_validation_task(self, trade_proposal: Dict) -> Task:
        """Create a CrewAI task for trade validation."""
        symbol = trade_proposal.get('symbol', 'UNKNOWN')
        return Task(
            description=f"""Validate the proposed trade for {symbol}.
            Check position sizing, portfolio limits, and risk parameters.
            Provide clear APPROVED or REJECTED status with detailed reasoning.""",
            agent=self.agent,
            expected_output="Trade validation result with approval status, position sizing recommendations, and risk warnings"
        )
