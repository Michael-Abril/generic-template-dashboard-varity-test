#!/bin/bash
# Load Test Runner for Varity Generic Template
# Runs Locust load tests with various configurations

set -e  # Exit on error

echo "========================================"
echo "🚀 VARITY LOAD TEST SUITE"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
HOST=${1:-http://localhost:8000}
TEST_TYPE=${2:-normal}

# Check if Locust is installed
if ! command -v locust &> /dev/null; then
    echo -e "${RED}❌ Locust not found. Installing...${NC}"
    pip install locust
fi

# Check if backend server is running
if ! curl -s $HOST/health > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend server not accessible at $HOST${NC}"
    echo -e "${RED}   Please start the backend server first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Backend server is running at $HOST${NC}"
echo ""

# Create reports directory
mkdir -p reports/performance

# Test configurations
case $TEST_TYPE in
    normal)
        echo -e "${BLUE}Running Normal Load Test (100 users, 5 minutes)${NC}"
        echo "Target: Average response time < 2s, 95th percentile < 5s"
        echo ""
        locust -f tests/performance/locustfile.py \
            --headless \
            --users 100 \
            --spawn-rate 10 \
            --run-time 5m \
            --host=$HOST \
            --csv=reports/performance/normal_load \
            --html=reports/performance/normal_load.html
        ;;

    stress)
        echo -e "${BLUE}Running Stress Test (500 users, 2 minutes)${NC}"
        echo "Testing system behavior under heavy load"
        echo ""
        locust -f tests/performance/locustfile.py \
            --headless \
            --users 500 \
            --spawn-rate 50 \
            --run-time 2m \
            --host=$HOST \
            --csv=reports/performance/stress_test \
            --html=reports/performance/stress_test.html
        ;;

    spike)
        echo -e "${BLUE}Running Spike Test (1000 users, 30 seconds)${NC}"
        echo "Testing system resilience to sudden traffic spikes"
        echo ""
        locust -f tests/performance/locustfile.py \
            --headless \
            --users 1000 \
            --spawn-rate 100 \
            --run-time 30s \
            --host=$HOST \
            --csv=reports/performance/spike_test \
            --html=reports/performance/spike_test.html
        ;;

    endurance)
        echo -e "${BLUE}Running Endurance Test (50 users, 30 minutes)${NC}"
        echo "Testing system stability over extended period"
        echo ""
        locust -f tests/performance/locustfile.py \
            --headless \
            --users 50 \
            --spawn-rate 5 \
            --run-time 30m \
            --host=$HOST \
            --csv=reports/performance/endurance_test \
            --html=reports/performance/endurance_test.html
        ;;

    interactive)
        echo -e "${BLUE}Running Interactive Load Test${NC}"
        echo "Open http://localhost:8089 in your browser to control the test"
        echo ""
        locust -f tests/performance/locustfile.py --host=$HOST
        ;;

    *)
        echo -e "${RED}Unknown test type: $TEST_TYPE${NC}"
        echo ""
        echo "Usage: $0 [HOST] [TEST_TYPE]"
        echo ""
        echo "Available test types:"
        echo "  normal      - 100 users, 5 minutes (default)"
        echo "  stress      - 500 users, 2 minutes"
        echo "  spike       - 1000 users, 30 seconds"
        echo "  endurance   - 50 users, 30 minutes"
        echo "  interactive - Manual control via web UI"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Normal test on localhost"
        echo "  $0 http://localhost:8000 stress      # Stress test"
        echo "  $0 https://api.varity.app normal     # Test production"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "✅ Load Test Complete"
echo "========================================"
echo ""
echo "📊 Performance Reports:"
echo "   - HTML Report: reports/performance/${TEST_TYPE}_*.html"
echo "   - CSV Data: reports/performance/${TEST_TYPE}_*.csv"
echo ""
echo "🎯 Performance Targets:"
echo "   ✅ Average Response Time: < 2 seconds"
echo "   ✅ 95th Percentile: < 5 seconds"
echo "   ✅ Error Rate: < 1%"
echo "   ✅ Throughput: > 100 req/sec"
echo ""
echo "📄 Full Analysis: SECURITY_PERFORMANCE_ANALYSIS.md"
echo ""
