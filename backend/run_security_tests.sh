#!/bin/bash
# Security Test Runner for Varity Generic Template
# Runs comprehensive security test suite and generates report

set -e  # Exit on error

echo "========================================"
echo "🔒 VARITY SECURITY TEST SUITE"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}❌ pytest not found. Installing...${NC}"
    pip install pytest pytest-cov pytest-asyncio
fi

# Check if backend server is running
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Backend server not running on http://localhost:8000${NC}"
    echo -e "${YELLOW}   Some tests may fail. Start backend with: uvicorn app.main:app${NC}"
    echo ""
fi

# Create reports directory
mkdir -p reports/security

echo "Running security tests..."
echo ""

# Test 1: SQL Injection Protection
echo -e "${YELLOW}[1/4] Testing SQL Injection Protection...${NC}"
pytest tests/security/test_sql_injection.py -v --tb=short --maxfail=5 || true
echo ""

# Test 2: XSS Protection
echo -e "${YELLOW}[2/4] Testing XSS Protection...${NC}"
pytest tests/security/test_xss_protection.py -v --tb=short --maxfail=5 || true
echo ""

# Test 3: Authentication Security
echo -e "${YELLOW}[3/4] Testing Authentication & Authorization...${NC}"
pytest tests/security/test_authentication_security.py -v --tb=short --maxfail=5 || true
echo ""

# Test 4: Rate Limiting
echo -e "${YELLOW}[4/4] Testing Rate Limiting...${NC}"
pytest tests/security/test_rate_limiting.py -v --tb=short --maxfail=5 || true
echo ""

# Run all tests with coverage
echo "========================================"
echo "📊 Generating Coverage Report"
echo "========================================"
echo ""

pytest tests/security/ \
    --cov=app/middleware \
    --cov=app/api \
    --cov=app/services \
    --cov-report=term \
    --cov-report=html:reports/security/coverage \
    -v \
    || true

echo ""
echo "========================================"
echo "✅ Security Tests Complete"
echo "========================================"
echo ""
echo "📄 Reports generated:"
echo "   - HTML Coverage: reports/security/coverage/index.html"
echo "   - Analysis: SECURITY_PERFORMANCE_ANALYSIS.md"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review coverage report: open reports/security/coverage/index.html"
echo "   2. Fix any failing tests"
echo "   3. Run load tests: locust -f tests/performance/locustfile.py"
echo ""
