"""
Fundamental Research Agent
Specialized in company financials, news sentiment, and macroeconomic factors.
"""

import os
import httpx
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from crewai import Agent, Task
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from openai import OpenAI


class FundamentalResearchAgent:
    """
    Agent specialized in fundamental analysis:
    - News sentiment analysis
    - Market trends and sector analysis
    - Economic indicators
    - Company-specific events
    """
    
    def __init__(self, llm: Optional[ChatOpenAI] = None):
        self.llm = llm or ChatOpenAI(temperature=0.5, model="gpt-4")
        self.openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.finnhub_api_key = os.getenv("FINNHUB_API_KEY", "")
        self.agent = self._create_agent()
    
    async def fetch_company_news(self, symbol: str, days: int = 7) -> List[Dict]:
        """Fetch recent news for a company using Finnhub API."""
        if not self.finnhub_api_key:
            return []
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        url = "https://finnhub.io/api/v1/company-news"
        params = {
            "symbol": symbol,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d"),
            "token": self.finnhub_api_key
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, params=params, timeout=10.0)
                if response.status_code == 200:
                    news = response.json()
                    return news[:10]  # Return top 10 news items
        except Exception as e:
            print(f"Error fetching news for {symbol}: {e}")
        
        return []
    
    def analyze_news_sentiment(self, news_articles: List[Dict], symbol: str) -> Dict:
        """
        Analyze sentiment of news articles using GPT-4.
        
        Args:
            news_articles: List of news articles with 'headline' and 'summary'
            symbol: Stock symbol
        
        Returns:
            Sentiment analysis with score and reasoning
        """
        if not news_articles:
            return {
                "sentiment": "NEUTRAL",
                "score": 0.0,
                "confidence": 0.0,
                "reasoning": "No recent news available for analysis",
                "news_count": 0
            }
        
        # Prepare news summary for GPT
        news_text = "\n\n".join([
            f"Headline: {article.get('headline', 'N/A')}\nSummary: {article.get('summary', 'N/A')}"
            for article in news_articles[:5]  # Analyze top 5 articles
        ])
        
        prompt = f"""Analyze the sentiment of the following news articles about {symbol}.
        
{news_text}

Provide:
1. Overall sentiment (VERY_POSITIVE, POSITIVE, NEUTRAL, NEGATIVE, VERY_NEGATIVE)
2. Sentiment score (-1.0 to +1.0)
3. Confidence level (0.0 to 1.0)
4. Brief reasoning (2-3 sentences)

Respond in JSON format:
{{
    "sentiment": "...",
    "score": 0.0,
    "confidence": 0.0,
    "reasoning": "..."
}}
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",  # Use mini for cost efficiency
                messages=[
                    {"role": "system", "content": "You are a financial news analyst expert at sentiment analysis."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            result["news_count"] = len(news_articles)
            result["timestamp"] = datetime.utcnow().isoformat()
            return result
            
        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            return {
                "sentiment": "NEUTRAL",
                "score": 0.0,
                "confidence": 0.0,
                "reasoning": f"Error in sentiment analysis: {str(e)}",
                "news_count": len(news_articles)
            }
    
    async def analyze_market_context(self, symbol: str) -> Dict:
        """
        Analyze broader market context and sector trends.
        
        Args:
            symbol: Stock symbol
        
        Returns:
            Market context analysis
        """
        # Fetch market indices data (simplified - in production, use real-time data)
        market_sentiment = {
            "market_trend": "NEUTRAL",
            "sector_performance": "NEUTRAL",
            "volatility": "MODERATE",
            "reasoning": "Market analysis based on general indicators"
        }
        
        # You can enhance this with real market data APIs
        try:
            # Placeholder for actual market data fetching
            # In production: fetch S&P 500, sector ETFs, VIX, etc.
            market_sentiment["timestamp"] = datetime.utcnow().isoformat()
        except Exception as e:
            print(f"Error analyzing market context: {e}")
        
        return market_sentiment
    
    def perform_fundamental_analysis(self, analysis_data: Dict) -> Dict:
        """
        Perform comprehensive fundamental analysis.
        
        Args:
            analysis_data: Dictionary containing symbol and news data
        
        Returns:
            Fundamental analysis results
        """
        symbol = analysis_data.get('symbol', 'UNKNOWN')
        news_articles = analysis_data.get('news', [])
        
        # Analyze news sentiment
        sentiment_result = self.analyze_news_sentiment(news_articles, symbol)
        
        # Calculate fundamental score
        sentiment_score = sentiment_result.get('score', 0.0)
        confidence = sentiment_result.get('confidence', 0.0)
        
        # Map sentiment to signal
        if sentiment_score > 0.6:
            signal = "BUY"
        elif sentiment_score > 0.3:
            signal = "WEAK_BUY"
        elif sentiment_score < -0.6:
            signal = "SELL"
        elif sentiment_score < -0.3:
            signal = "WEAK_SELL"
        else:
            signal = "HOLD"
        
        return {
            "symbol": symbol,
            "signal": signal,
            "confidence": round(confidence, 2),
            "sentiment_score": round(sentiment_score, 2),
            "sentiment": sentiment_result.get('sentiment', 'NEUTRAL'),
            "reasoning": sentiment_result.get('reasoning', ''),
            "news_count": sentiment_result.get('news_count', 0),
            "timestamp": datetime.utcnow().isoformat()
        }
    
    def _create_agent(self) -> Agent:
        """Create the CrewAI agent for fundamental research."""
        
        fundamental_analysis_tool = Tool(
            name="fundamental_analysis",
            func=self.perform_fundamental_analysis,
            description="Analyzes company news, sentiment, and fundamental factors to assess investment quality"
        )
        
        return Agent(
            role="Fundamental Research Analyst",
            goal="Research company fundamentals, analyze news sentiment, and assess long-term investment viability",
            backstory="""You are a seasoned fundamental analyst with expertise in financial statement 
            analysis, industry research, and macroeconomic trends. You excel at identifying quality 
            companies with strong fundamentals and positive catalysts. Your analysis considers both 
            quantitative metrics and qualitative factors like news sentiment and market positioning.""",
            tools=[fundamental_analysis_tool],
            llm=self.llm,
            verbose=True,
            allow_delegation=False
        )
    
    def create_analysis_task(self, analysis_data: Dict) -> Task:
        """Create a CrewAI task for fundamental analysis."""
        symbol = analysis_data.get('symbol', 'UNKNOWN')
        return Task(
            description=f"""Conduct fundamental research on {symbol}.
            Analyze recent news sentiment, company-specific events, and market context.
            Provide a clear investment recommendation with confidence level and supporting evidence.""",
            agent=self.agent,
            expected_output="Fundamental analysis report with signal, sentiment score, and news-based reasoning"
        )
