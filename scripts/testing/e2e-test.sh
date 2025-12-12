#!/bin/bash
set -e

echo "==================================="
echo "Varity Generic Dashboard E2E Tests"
echo "==================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNING=0

# Helper functions
pass_test() {
    echo -e "  ${GREEN}✓${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

fail_test() {
    echo -e "  ${RED}✗${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

warn_test() {
    echo -e "  ${YELLOW}⚠${NC}  $1"
    TESTS_WARNING=$((TESTS_WARNING + 1))
}

info() {
    echo -e "  ${BLUE}ℹ${NC}  $1"
}

echo ""
echo "Step 1: Check Infrastructure"
echo "------------------------------------"

# Check Docker containers
if docker ps | grep -q "varity-postgres"; then
    pass_test "PostgreSQL running"
else
    fail_test "PostgreSQL not running"
    info "Start with: cd backend && docker-compose up -d"
fi

if docker ps | grep -q "varity-redis"; then
    pass_test "Redis running"
else
    fail_test "Redis not running"
    info "Start with: cd backend && docker-compose up -d"
fi

# Check Ollama
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    pass_test "Ollama running on :11434"

    # Check if llama3.2 model is available
    if curl -s http://localhost:11434/api/tags | grep -q "llama3.2"; then
        pass_test "llama3.2 model installed"
    else
        warn_test "llama3.2 model not found"
        info "Install with: ollama pull llama3.2"
    fi
else
    fail_test "Ollama not running"
    info "Start with: ./setup-ollama.sh"
fi

echo ""
echo "Step 2: Check Backend API"
echo "------------------------------------"

# Check if backend is running
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    pass_test "Backend API running on :8000"

    # Check health endpoint response
    HEALTH_RESPONSE=$(curl -s http://localhost:8000/health)
    if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
        pass_test "Health endpoint returning healthy status"
    else
        warn_test "Health endpoint responding but not healthy"
    fi

    # Test marketplace endpoint
    echo "  Testing marketplace endpoint..."
    MARKETPLACE_RESPONSE=$(curl -s http://localhost:8000/api/v1/marketplace/tools 2>/dev/null || echo "error")
    if [ "$MARKETPLACE_RESPONSE" != "error" ] && echo "$MARKETPLACE_RESPONSE" | grep -q "QuickBooks"; then
        pass_test "Marketplace API working (tools loaded)"
    elif [ "$MARKETPLACE_RESPONSE" != "error" ]; then
        warn_test "Marketplace API responding but no tools listed"
        info "This is normal before contract deployment"
    else
        fail_test "Marketplace API error"
    fi

    # Test categories endpoint
    CATEGORIES_RESPONSE=$(curl -s http://localhost:8000/api/v1/marketplace/categories 2>/dev/null || echo "error")
    if [ "$CATEGORIES_RESPONSE" != "error" ] && echo "$CATEGORIES_RESPONSE" | grep -q "Accounting"; then
        pass_test "Categories API working"
    else
        warn_test "Categories API not returning expected data"
    fi

else
    fail_test "Backend not running"
    info "Start with: cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
fi

echo ""
echo "Step 3: Check Frontend"
echo "------------------------------------"

if curl -s http://localhost:3001 > /dev/null 2>&1; then
    pass_test "Frontend running on :3001"

    # Check if Next.js is serving properly
    FRONTEND_RESPONSE=$(curl -s http://localhost:3001)
    if echo "$FRONTEND_RESPONSE" | grep -q "Varity"; then
        pass_test "Frontend serving Varity app"
    else
        warn_test "Frontend responding but content unexpected"
    fi
else
    fail_test "Frontend not running"
    info "Start with: npm run dev"
fi

echo ""
echo "Step 4: Check Smart Contracts"
echo "------------------------------------"

if [ -f ".env.local" ]; then
    pass_test ".env.local file exists"

    if grep -q "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=" .env.local && \
       grep -v "^#" .env.local | grep "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=" | grep -q "0x"; then
        MARKETPLACE_ADDR=$(grep "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=" .env.local | grep -v "^#" | cut -d '=' -f2)
        pass_test "ToolMarketplace deployed: $MARKETPLACE_ADDR"

        # Check other contract addresses
        if grep -q "NEXT_PUBLIC_LICENSE_NFT_ADDRESS=" .env.local; then
            LICENSE_ADDR=$(grep "NEXT_PUBLIC_LICENSE_NFT_ADDRESS=" .env.local | grep -v "^#" | cut -d '=' -f2)
            pass_test "ToolLicenseNFT deployed: $LICENSE_ADDR"
        fi

        if grep -q "NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=" .env.local; then
            BILLING_ADDR=$(grep "NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=" .env.local | grep -v "^#" | cut -d '=' -f2)
            pass_test "SubscriptionBilling deployed: $BILLING_ADDR"
        fi
    else
        warn_test "ToolMarketplace not deployed yet"
        info "Deploy with: cd contracts && npm run deploy"
    fi
else
    fail_test ".env.local not found"
    info "Copy from .env.local.example and configure"
fi

echo ""
echo "Step 5: Test Data Flow"
echo "------------------------------------"

# Test QuickBooks sync (if backend running)
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "Testing QuickBooks data sync..."

    TEST_WALLET="0x1234567890123456789012345678901234567890"
    SYNC_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/integrations/quickbooks/sync \
      -H "Content-Type: application/json" \
      -d "{\"wallet_address\":\"$TEST_WALLET\"}" 2>/dev/null || echo "error")

    if [ "$SYNC_RESPONSE" != "error" ] && echo "$SYNC_RESPONSE" | grep -q '"success":true'; then
        pass_test "QuickBooks sync endpoint working"

        # Check if files were uploaded
        FILES_COUNT=$(echo "$SYNC_RESPONSE" | grep -o '"files_uploaded":[0-9]*' | cut -d ':' -f2)
        if [ ! -z "$FILES_COUNT" ] && [ "$FILES_COUNT" -gt 0 ]; then
            pass_test "Files uploaded to storage: $FILES_COUNT files"
        fi
    else
        warn_test "QuickBooks sync endpoint responding but may need configuration"
    fi

    # Test retrieving QuickBooks data
    DATA_RESPONSE=$(curl -s "http://localhost:8000/api/v1/integrations/quickbooks/data?wallet=$TEST_WALLET" 2>/dev/null || echo "error")
    if [ "$DATA_RESPONSE" != "error" ] && echo "$DATA_RESPONSE" | grep -q "invoices"; then
        pass_test "QuickBooks data retrieval working"
    else
        warn_test "QuickBooks data retrieval needs testing after sync"
    fi
else
    fail_test "Cannot test - backend not running"
fi

echo ""
echo "Step 6: Test AI Chat"
echo "------------------------------------"

if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "Testing AI chat endpoint..."

    TEST_WALLET="0x1234567890123456789012345678901234567890"
    CHAT_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/ai/chat \
      -H "Content-Type: application/json" \
      -d "{\"message\":\"What is my total revenue?\",\"wallet_address\":\"$TEST_WALLET\"}" \
      2>/dev/null || echo "error")

    if [ "$CHAT_RESPONSE" != "error" ]; then
        pass_test "AI chat endpoint responding"

        if echo "$CHAT_RESPONSE" | grep -q "response"; then
            pass_test "AI chat returning structured response"
            RESPONSE_PREVIEW=$(echo "$CHAT_RESPONSE" | grep -o '"response":"[^"]*"' | cut -c13-80)
            info "Response: $RESPONSE_PREVIEW..."
        fi

        if echo "$CHAT_RESPONSE" | grep -q "sources"; then
            pass_test "AI chat includes source attribution"
        fi
    else
        fail_test "AI chat endpoint error"
    fi

    # Test AI query endpoint
    QUERY_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/ai/query \
      -H "Content-Type: application/json" \
      -d "{\"query\":\"Show top customers\",\"tools\":[\"quickbooks\"],\"wallet_address\":\"$TEST_WALLET\"}" \
      2>/dev/null || echo "error")

    if [ "$QUERY_RESPONSE" != "error" ]; then
        pass_test "AI query endpoint responding"
    else
        warn_test "AI query endpoint needs testing"
    fi
else
    fail_test "Cannot test - backend not running"
fi

echo ""
echo "Step 7: Test Storage Integration"
echo "------------------------------------"

if [ -d "backend/storage" ]; then
    pass_test "Storage directory exists"

    # Check for test data
    if [ -d "backend/storage/company-$TEST_WALLET" ]; then
        pass_test "Test company storage created"

        # Count files
        FILE_COUNT=$(find "backend/storage/company-$TEST_WALLET" -type f 2>/dev/null | wc -l)
        if [ "$FILE_COUNT" -gt 0 ]; then
            pass_test "Storage contains $FILE_COUNT files"
        else
            warn_test "No files in storage yet"
        fi
    else
        warn_test "No test company storage yet (sync to create)"
    fi
else
    warn_test "Storage directory not created yet"
fi

echo ""
echo "Step 8: Check Database"
echo "------------------------------------"

if docker ps | grep -q "varity-postgres"; then
    # Test database connection
    DB_TEST=$(docker exec varity-postgres psql -U varity -d varity -c "SELECT 1;" 2>/dev/null || echo "error")
    if [ "$DB_TEST" != "error" ]; then
        pass_test "Database connection working"

        # Check tables
        TABLES=$(docker exec varity-postgres psql -U varity -d varity -c "\dt" 2>/dev/null || echo "")
        if echo "$TABLES" | grep -q "tools"; then
            pass_test "Database tables initialized"
        else
            warn_test "Database tables may need migration"
            info "Run: cd backend && alembic upgrade head"
        fi
    else
        fail_test "Cannot connect to database"
    fi
else
    fail_test "PostgreSQL not running for database test"
fi

echo ""
echo "================================"
echo "E2E Test Summary"
echo "================================"
echo ""
echo -e "${GREEN}Passed:${NC}  $TESTS_PASSED"
echo -e "${YELLOW}Warnings:${NC} $TESTS_WARNING"
echo -e "${RED}Failed:${NC}  $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "${RED}SOME TESTS FAILED${NC}"
    echo "Review the failures above and fix them before deployment."
    echo ""
fi

if [ $TESTS_WARNING -gt 0 ]; then
    echo -e "${YELLOW}SOME TESTS HAVE WARNINGS${NC}"
    echo "These are expected in certain deployment stages."
    echo ""
fi

echo "================================"
echo "Manual Testing Steps"
echo "================================"
echo ""
echo "1. Open http://localhost:3001"
echo "2. Connect wallet (Privy/thirdweb)"
echo "3. Browse marketplace"
echo "4. Purchase QuickBooks (if contracts deployed)"
echo "5. Sync QuickBooks data"
echo "6. Ask AI: 'What's my revenue?'"
echo ""

if ! grep -q "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=0x" .env.local 2>/dev/null; then
    echo -e "${YELLOW}Next Step:${NC} Deploy smart contracts to enable full testing"
    echo "  cd contracts && npm run deploy"
    echo ""
fi

echo "For detailed testing report, see: TESTING_REPORT.md"
