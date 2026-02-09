#!/bin/bash

# Quick test script for Multi-Agent System
# Run this after setting up environment variables

echo "=================================="
echo "🤖 AI Finance Coach Agent Test"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "backend/test_multi_agent.py" ]; then
    echo "❌ Error: Please run this script from the ai-finance-coach root directory"
    exit 1
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 not found. Please install Python 3.9+"
    exit 1
fi

# Check for .env file
if [ ! -f "backend/.env" ]; then
    echo "⚠️  Warning: backend/.env file not found"
    echo "   Creating from example..."
    cp backend/.env.example backend/.env
    echo "   ✅ Created backend/.env - please add your API keys"
    exit 1
fi

# Check for OPENAI_API_KEY
if ! grep -q "OPENAI_API_KEY=sk-" backend/.env; then
    echo "⚠️  Warning: OPENAI_API_KEY not configured in backend/.env"
    echo "   Please add: OPENAI_API_KEY=sk-..."
    exit 1
fi

echo "📋 Environment checks passed"
echo ""

# Activate virtual environment if it exists
if [ -d "backend/venv" ]; then
    echo "🔄 Activating virtual environment..."
    source backend/venv/bin/activate
else
    echo "⚠️  No virtual environment found at backend/venv"
    echo "   Creating one now..."
    python3 -m venv backend/venv
    source backend/venv/bin/activate
    echo "   ✅ Virtual environment created"
fi

echo ""
echo "📦 Checking dependencies..."

# Check if crewai is installed
if ! python3 -c "import crewai" 2>/dev/null; then
    echo "⚠️  CrewAI not installed. Installing dependencies..."
    cd backend
    pip install -r requirements.txt
    cd ..
    echo "   ✅ Dependencies installed"
else
    echo "   ✅ Dependencies already installed"
fi

echo ""
echo "🧪 Running multi-agent test..."
echo ""

# Run the test
cd backend
python3 test_multi_agent.py

TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "=================================="
    echo "✅ All tests passed!"
    echo "=================================="
    echo ""
    echo "Next steps:"
    echo "1. Start the backend: cd backend && uvicorn main:app --reload"
    echo "2. Try the API: curl http://localhost:8000/api/multi-agent/crew-status"
    echo "3. See SETUP_MULTI_AGENT.md for more info"
else
    echo "=================================="
    echo "❌ Tests failed"
    echo "=================================="
    echo ""
    echo "Check the error messages above."
    echo "See SETUP_MULTI_AGENT.md for troubleshooting."
fi

exit $TEST_EXIT_CODE
