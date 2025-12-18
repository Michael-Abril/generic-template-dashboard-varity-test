#!/bin/bash
###############################################################################
# Varity Generic Company Dashboard - E2E Test Runner
#
# Runs comprehensive end-to-end tests covering:
# - All 10 integration adapters
# - Wallet authentication and security
# - Rate limiting
# - Audit logging
# - Filecoin storage operations
# - Tool marketplace
# - Compliance features
#
# Usage:
#   ./run_e2e_tests.sh                 # Run all tests
#   ./run_e2e_tests.sh integrations    # Run integration tests only
#   ./run_e2e_tests.sh security        # Run security tests only
#   ./run_e2e_tests.sh storage         # Run storage tests only
###############################################################################

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test configuration
TEST_DIR="tests/e2e"
REPORT_DIR="test_reports"
COVERAGE_DIR="coverage"

# Create directories
mkdir -p "$REPORT_DIR"
mkdir -p "$COVERAGE_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        Varity Generic Company Dashboard - E2E Tests           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run tests
run_tests() {
    local test_file=$1
    local test_name=$2

    echo -e "${YELLOW}Running: ${test_name}...${NC}"
    echo "================================================================"

    if pytest "$TEST_DIR/$test_file" \
        -v \
        -s \
        --tb=short \
        --junit-xml="$REPORT_DIR/${test_file%.py}_report.xml" \
        --cov=app \
        --cov-append \
        --cov-report=html:$COVERAGE_DIR \
        --cov-report=term; then
        echo -e "${GREEN}✓ ${test_name} PASSED${NC}"
    else
        echo -e "${RED}✗ ${test_name} FAILED${NC}"
        exit 1
    fi

    echo ""
}

# Determine which tests to run
TEST_SUITE=${1:-all}

case "$TEST_SUITE" in
    integrations)
        echo -e "${BLUE}Running Integration Tests Only${NC}"
        echo ""
        run_tests "test_integrations_complete.py" "Integration Tests (All 10 Adapters)"
        ;;

    security)
        echo -e "${BLUE}Running Security Tests Only${NC}"
        echo ""
        run_tests "test_security_flows.py" "Security Tests (Auth, Rate Limit, Audit)"
        ;;

    storage)
        echo -e "${BLUE}Running Storage & Marketplace Tests Only${NC}"
        echo ""
        run_tests "test_storage_and_marketplace.py" "Storage & Marketplace Tests"
        ;;

    all)
        echo -e "${BLUE}Running All E2E Tests${NC}"
        echo ""

        # Test 1: Integration Tests
        run_tests "test_integrations_complete.py" "Integration Tests (All 10 Adapters)"

        # Test 2: Security Tests
        run_tests "test_security_flows.py" "Security Tests (Auth, Rate Limit, Audit)"

        # Test 3: Storage & Marketplace Tests
        run_tests "test_storage_and_marketplace.py" "Storage & Marketplace Tests"

        echo ""
        echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║              ALL E2E TESTS PASSED SUCCESSFULLY!                ║${NC}"
        echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        ;;

    *)
        echo -e "${RED}Invalid test suite: $TEST_SUITE${NC}"
        echo ""
        echo "Usage: ./run_e2e_tests.sh [test_suite]"
        echo ""
        echo "Available test suites:"
        echo "  all          - Run all E2E tests (default)"
        echo "  integrations - Run integration tests only"
        echo "  security     - Run security tests only"
        echo "  storage      - Run storage & marketplace tests only"
        exit 1
        ;;
esac

# Generate test summary
echo -e "${BLUE}Test Reports:${NC}"
echo "  - JUnit XML: $REPORT_DIR/"
echo "  - Coverage HTML: $COVERAGE_DIR/index.html"
echo ""

# Show coverage summary
if command -v coverage &> /dev/null; then
    echo -e "${BLUE}Coverage Summary:${NC}"
    coverage report --skip-covered
    echo ""
fi

echo -e "${GREEN}✓ E2E Tests Complete!${NC}"
