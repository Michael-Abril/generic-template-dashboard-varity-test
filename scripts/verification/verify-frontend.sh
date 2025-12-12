#!/bin/bash

# Frontend Verification Script
# Verifies all components are working correctly

echo "========================================="
echo "Frontend Verification Script"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check frontend is running
echo "1. Checking Frontend (port 3001)..."
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${RED}✗ Frontend is NOT running${NC}"
    echo "  Start with: cd /path/to/dashboard && npm run dev"
fi
echo ""

# Check backend is running
echo "2. Checking Backend (port 8000)..."
if curl -s http://localhost:8000/health > /dev/null; then
    HEALTH=$(curl -s http://localhost:8000/health | jq -r '.status')
    if [ "$HEALTH" == "healthy" ]; then
        echo -e "${GREEN}✓ Backend is healthy${NC}"

        # Show backend status
        echo "  - Database: $(curl -s http://localhost:8000/health | jq -r '.database')"
        echo "  - Arbitrum RPC: $(curl -s http://localhost:8000/health | jq -r '.arbitrum_rpc')"
        echo "  - Version: $(curl -s http://localhost:8000/health | jq -r '.version')"
    else
        echo -e "${YELLOW}⚠ Backend status: $HEALTH${NC}"
    fi
else
    echo -e "${RED}✗ Backend is NOT running${NC}"
    echo "  Start with: cd backend && uvicorn app.main:app --reload"
fi
echo ""

# Check marketplace API
echo "3. Checking Marketplace API..."
PRODUCT_COUNT=$(curl -s http://localhost:8000/api/v1/marketplace/products | jq '. | length')
if [ "$PRODUCT_COUNT" -eq 20 ]; then
    echo -e "${GREEN}✓ Marketplace API working (20 products)${NC}"
else
    echo -e "${YELLOW}⚠ Product count: $PRODUCT_COUNT (expected 20)${NC}"
fi

CATEGORY_COUNT=$(curl -s http://localhost:8000/api/v1/marketplace/categories | jq '. | length')
if [ "$CATEGORY_COUNT" -eq 11 ]; then
    echo -e "${GREEN}✓ Categories API working (11 categories)${NC}"
else
    echo -e "${YELLOW}⚠ Category count: $CATEGORY_COUNT (expected 11)${NC}"
fi
echo ""

# Check smart contracts
echo "4. Checking Smart Contracts (Arbitrum Sepolia)..."
MARKETPLACE_ADDRESS="0x4d616Fa054e319D4966aEcEDb44eaE1dc899dA57"
RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"

# Check if contracts are deployed
CONTRACT_CODE=$(cast code $MARKETPLACE_ADDRESS --rpc-url $RPC_URL 2>/dev/null)
if [ -n "$CONTRACT_CODE" ] && [ "$CONTRACT_CODE" != "0x" ]; then
    echo -e "${GREEN}✓ ToolMarketplace contract deployed${NC}"
    echo "  Address: $MARKETPLACE_ADDRESS"

    # Get contract name
    CONTRACT_NAME=$(cast call $MARKETPLACE_ADDRESS "name()(string)" --rpc-url $RPC_URL 2>/dev/null)
    if [ -n "$CONTRACT_NAME" ]; then
        echo "  Contract: $CONTRACT_NAME"
    fi
else
    echo -e "${RED}✗ Contract not found at $MARKETPLACE_ADDRESS${NC}"
fi
echo ""

# Check environment variables
echo "5. Checking Environment Configuration..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓ .env.local file exists${NC}"

    # Check critical env vars
    if grep -q "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS" .env.local; then
        echo -e "${GREEN}✓ Contract addresses configured${NC}"
    else
        echo -e "${RED}✗ Missing contract addresses in .env.local${NC}"
    fi

    if grep -q "NEXT_PUBLIC_PRIVY_APP_ID" .env.local; then
        echo -e "${GREEN}✓ Privy configuration found${NC}"
    else
        echo -e "${YELLOW}⚠ Missing Privy configuration${NC}"
    fi
else
    echo -e "${RED}✗ .env.local file not found${NC}"
    echo "  Copy from .env.local.example"
fi
echo ""

# Check dependencies
echo "6. Checking Dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Node modules installed${NC}"
else
    echo -e "${RED}✗ Node modules not installed${NC}"
    echo "  Run: npm install"
fi
echo ""

# Summary
echo "========================================="
echo "Verification Complete"
echo "========================================="
echo ""
echo "Access Points:"
echo "  Frontend:    http://localhost:3001"
echo "  Backend:     http://localhost:8000"
echo "  API Docs:    http://localhost:8000/docs"
echo "  Block Explorer: https://sepolia.arbiscan.io"
echo ""
echo "Test Faucets:"
echo "  Arbitrum Sepolia ETH: https://faucet.quicknode.com/arbitrum/sepolia"
echo "  USDC Testnet:        https://faucet.circle.com/"
echo ""
echo "Documentation:"
echo "  Full Report:   FRONTEND_AGENT_COMPLETION_REPORT.md"
echo "  Quick Start:   QUICK_START_GUIDE.md"
echo ""
