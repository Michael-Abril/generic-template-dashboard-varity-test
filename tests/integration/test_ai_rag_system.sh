#!/bin/bash
# AI/RAG System Comprehensive Test Script
# Tests all components of the AI/RAG system

set -e

echo "=================================="
echo "AI/RAG System Comprehensive Test"
echo "=================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"

    echo -e "${BLUE}Test: ${test_name}${NC}"

    if eval "$test_command"; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
    echo ""
}

echo "=== Infrastructure Tests ==="
echo ""

# Test 1: Ollama LLM
run_test "Ollama LLM Service" \
    "curl -s http://localhost:11434/api/tags > /dev/null 2>&1"

# Test 2: Ollama Models
run_test "Ollama has mistral model" \
    "curl -s http://localhost:11434/api/tags | grep -q 'mistral'"

# Test 3: Embedding Model
run_test "Ollama has nomic-embed-text model" \
    "curl -s http://localhost:11434/api/tags | grep -q 'nomic-embed-text'"

# Test 4: Qdrant Vector Database
run_test "Qdrant Vector Database" \
    "curl -s http://localhost:6334/collections > /dev/null 2>&1"

# Test 5: Backend API
run_test "Backend API Health" \
    "curl -s http://localhost:8000/health | grep -q 'healthy'"

echo "=== AI Service Tests ==="
echo ""

# Test 6: AI Health Endpoint
run_test "AI Service Health Check" \
    "curl -s http://localhost:8000/api/v1/ai/health | grep -q 'success'"

# Test 7: Ollama Component Health
run_test "Ollama Component (via AI health)" \
    "curl -s http://localhost:8000/api/v1/ai/health | grep -q '\"ollama\":true'"

# Test 8: Qdrant Component Health
run_test "Qdrant Component (via AI health)" \
    "curl -s http://localhost:8000/api/v1/ai/health | grep -q '\"qdrant\":true'"

echo "=== Functional Tests ==="
echo ""

# Test 9: Embedding Generation
echo -e "${BLUE}Test: Embedding Generation${NC}"
EMBED_RESULT=$(curl -s http://localhost:11434/api/embeddings -X POST \
    -H "Content-Type: application/json" \
    -d '{"model":"nomic-embed-text","prompt":"test"}')

if echo "$EMBED_RESULT" | grep -q "embedding"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo "Response: $EMBED_RESULT"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 10: Ollama Generation
echo -e "${BLUE}Test: Ollama LLM Generation${NC}"
GEN_RESULT=$(curl -s http://localhost:11434/api/generate -X POST \
    -H "Content-Type: application/json" \
    -d '{"model":"mistral","prompt":"Say hello","stream":false}')

if echo "$GEN_RESULT" | grep -q "response"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo "Response: $GEN_RESULT"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 11: Qdrant Collections
echo -e "${BLUE}Test: Qdrant Collections List${NC}"
COLLECTIONS=$(curl -s http://localhost:6334/collections)

if echo "$COLLECTIONS" | grep -q "collections"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "Collections found: $(echo $COLLECTIONS | grep -o 'business_[^"]*' | wc -l)"
    ((TESTS_PASSED++))
else
    echo "Response: $COLLECTIONS"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "=== RAG Integration Tests ==="
echo ""

# Test 12: RAG Collection Stats
TEST_WALLET="0x1234567890abcdef1234567890abcdef12345678"

echo -e "${BLUE}Test: Get RAG Collection Stats${NC}"
STATS_RESULT=$(curl -s "http://localhost:8000/api/v1/ai/rag/stats?wallet_address=$TEST_WALLET")

if echo "$STATS_RESULT" | grep -q "success"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "Stats: $STATS_RESULT"
    ((TESTS_PASSED++))
else
    echo "Response: $STATS_RESULT"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 13: Index Sample Data
echo -e "${BLUE}Test: Index Sample Business Data${NC}"
INDEX_RESULT=$(curl -s http://localhost:8000/api/v1/ai/rag/index -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "wallet_address": "'$TEST_WALLET'",
        "cid": "QmTestCID123456789",
        "data": {
            "invoice_id": "INV-001",
            "customer": "Acme Corporation",
            "amount": 5000,
            "status": "paid"
        },
        "integration": "quickbooks",
        "data_type": "invoices"
    }')

if echo "$INDEX_RESULT" | grep -q "success"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    echo "Indexed: $INDEX_RESULT"
    ((TESTS_PASSED++))
else
    echo "Response: $INDEX_RESULT"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

# Test 14: AI Query (Multi-tenant)
echo -e "${BLUE}Test: AI Query with RAG Context${NC}"
QUERY_RESULT=$(curl -s http://localhost:8000/api/v1/ai/query/multitenant -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "query": "What invoices do I have?",
        "wallet_address": "'$TEST_WALLET'",
        "integration": "quickbooks",
        "max_results": 5
    }')

if echo "$QUERY_RESULT" | grep -q "answer"; then
    echo -e "${GREEN}✓ PASSED${NC}"
    ANSWER=$(echo "$QUERY_RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['answer'][:200])")
    echo "AI Answer: $ANSWER..."
    ((TESTS_PASSED++))
else
    echo "Response: $QUERY_RESULT"
    echo -e "${RED}✗ FAILED${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "=== Test Summary ==="
echo ""
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}=================================="
    echo "✓ ALL TESTS PASSED!"
    echo "==================================${NC}"
    echo ""
    echo "AI/RAG System is fully operational!"
    echo ""
    echo "Next steps:"
    echo "1. Start frontend: npm run dev"
    echo "2. Navigate to: http://localhost:3000/ai-assistant"
    echo "3. Test AI chat with real queries"
    exit 0
else
    echo -e "${RED}=================================="
    echo "✗ SOME TESTS FAILED"
    echo "==================================${NC}"
    echo ""
    echo "Please review the failures above and:"
    echo "1. Check service status: docker-compose ps"
    echo "2. Check logs: docker-compose logs backend"
    echo "3. Review report: AI_RAG_SYSTEM_STATUS_REPORT.md"
    exit 1
fi
