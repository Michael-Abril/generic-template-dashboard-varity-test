# Security & Performance Testing Guide

This directory contains comprehensive security and performance tests for the Varity Generic Template backend.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Security Tests](#security-tests)
- [Performance Tests](#performance-tests)
- [Test Results](#test-results)
- [Continuous Integration](#continuous-integration)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Install test dependencies
pip install pytest pytest-cov pytest-asyncio locust

# Start backend server (required for tests)
cd /path/to/backend
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Run All Security Tests

```bash
# From backend directory
./run_security_tests.sh
```

### Run Load Tests

```bash
# Normal load test (100 users, 5 minutes)
./run_load_tests.sh

# Stress test (500 users, 2 minutes)
./run_load_tests.sh http://localhost:8000 stress

# Interactive mode (control via web UI)
./run_load_tests.sh http://localhost:8000 interactive
```

---

## 🔒 Security Tests

### Test Suite Overview

| Test File | Test Count | Coverage |
|-----------|------------|----------|
| `test_sql_injection.py` | 100+ | SQL injection prevention |
| `test_xss_protection.py` | 80+ | XSS prevention, security headers |
| `test_authentication_security.py` | 40+ | Auth bypass, privilege escalation |
| `test_rate_limiting.py` | 60+ | Rate limit enforcement |

**Total**: 280+ security test cases

### Test Categories

#### 1. SQL Injection Protection (`test_sql_injection.py`)

Tests all endpoints against SQL injection attacks:

```bash
pytest tests/security/test_sql_injection.py -v
```

**Attack Vectors Tested**:
- `'; DROP TABLE users; --`
- `1' OR '1'='1`
- `admin'--`
- `' UNION SELECT * FROM users--`
- And 10+ more payloads

**Endpoints Tested**:
- Marketplace API
- Integration search
- Settings update
- AI chat
- Storage listing
- All path parameters and headers

**Expected Result**: ✅ All tests pass (SQLAlchemy ORM prevents SQL injection)

#### 2. XSS Protection (`test_xss_protection.py`)

Tests XSS prevention and security headers:

```bash
pytest tests/security/test_xss_protection.py -v
```

**Attack Vectors Tested**:
- `<script>alert('XSS')</script>`
- `<img src=x onerror=alert('XSS')>`
- `<svg/onload=alert('XSS')>`
- `javascript:alert('XSS')`
- And 17+ more payloads

**Security Headers Verified**:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security: ...`

**Expected Result**: ✅ All tests pass (comprehensive security headers)

#### 3. Authentication Security (`test_authentication_security.py`)

Tests authentication and authorization:

```bash
pytest tests/security/test_authentication_security.py -v
```

**Tests Include**:
- Authentication bypass attempts
- Invalid wallet address rejection
- Missing signature detection
- Privilege escalation prevention
- Multi-tenant isolation
- JWT token manipulation (if implemented)
- Session security

**Expected Result**: ✅ All tests pass (wallet signature verification)

#### 4. Rate Limiting (`test_rate_limiting.py`)

Tests rate limiting enforcement:

```bash
pytest tests/security/test_rate_limiting.py -v
```

**Tests Include**:
- Rate limit headers present
- Per-wallet limits (100 req/min)
- Per-IP limits (50 req/min)
- Rate limit enforcement
- Bypass attempt prevention
- Rate limit recovery

**Expected Result**: ✅ All tests pass (token bucket algorithm)

### Running Individual Tests

```bash
# Run specific test class
pytest tests/security/test_sql_injection.py::TestSQLInjection -v

# Run specific test method
pytest tests/security/test_xss_protection.py::TestXSSProtection::test_security_headers_xss_protection -v

# Run with detailed output
pytest tests/security/test_rate_limiting.py -vv --tb=long

# Run with coverage
pytest tests/security/ --cov=app/middleware --cov-report=html
```

### Test Output Examples

#### ✅ Passing Test

```
tests/security/test_sql_injection.py::TestSQLInjection::test_marketplace_list_sql_injection PASSED [100%]

====== 1 passed in 0.45s ======
```

#### ❌ Failing Test (needs fixing)

```
tests/security/test_sql_injection.py::TestSQLInjection::test_marketplace_list_sql_injection FAILED [100%]

FAILED - AssertionError: SQL injection payload succeeded (500 Internal Server Error)

====== 1 failed in 0.45s ======
```

---

## 🚀 Performance Tests

### Load Testing with Locust

**File**: `tests/performance/locustfile.py`

### Test Scenarios

#### 1. Normal Load Test

Simulates typical production traffic:

```bash
./run_load_tests.sh http://localhost:8000 normal
```

**Configuration**:
- 100 concurrent users
- 5-minute duration
- Gradual ramp-up (10 users/sec)

**Targets**:
- Average response time: < 2 seconds
- 95th percentile: < 5 seconds
- Error rate: < 1%
- Throughput: > 100 req/sec

#### 2. Stress Test

Tests system behavior under heavy load:

```bash
./run_load_tests.sh http://localhost:8000 stress
```

**Configuration**:
- 500 concurrent users
- 2-minute duration
- Fast ramp-up (50 users/sec)

**Goal**: Identify breaking point and degradation patterns

#### 3. Spike Test

Tests resilience to sudden traffic spikes:

```bash
./run_load_tests.sh http://localhost:8000 spike
```

**Configuration**:
- 1000 concurrent users
- 30-second duration
- Very fast ramp-up (100 users/sec)

**Goal**: Verify system doesn't crash under sudden load

#### 4. Endurance Test

Tests stability over extended period:

```bash
./run_load_tests.sh http://localhost:8000 endurance
```

**Configuration**:
- 50 concurrent users
- 30-minute duration
- Slow ramp-up (5 users/sec)

**Goal**: Detect memory leaks, resource exhaustion

#### 5. Interactive Mode

Manual control via web UI:

```bash
./run_load_tests.sh http://localhost:8000 interactive
```

**Access**: http://localhost:8089

### User Simulation

Locust simulates 3 types of users:

#### 1. Read-Only User (50% of traffic)
- Browse marketplace
- View dashboard
- Check health status

#### 2. Regular User (40% of traffic)
- Chat with AI
- View integrations
- Update settings
- Browse marketplace

#### 3. Heavy User (10% of traffic)
- Data sync operations
- File uploads
- Bulk operations

### Interpreting Results

#### Locust Web UI Metrics

- **Total Requests**: Number of requests made
- **Failures**: Failed requests (should be < 1%)
- **Median Response Time**: 50th percentile
- **95th Percentile**: Response time for 95% of requests
- **Average Response Time**: Mean response time
- **RPS**: Requests per second (throughput)

#### Performance Score

Locust automatically calculates a performance score:

```
🎯 FINAL SCORE: 95/100

✅ Average response time: 1245ms (Target: <2000ms)
✅ 95th percentile: 3821ms (Target: <5000ms)
✅ Error rate: 0.3% (Target: <1%)
✅ Throughput: 125.4 req/s
```

**Rating**:
- 90-100: 🏆 EXCELLENT - Production ready
- 70-89: ✅ GOOD - Minor optimizations needed
- 50-69: ⚠️ NEEDS IMPROVEMENT - Performance issues
- 0-49: ❌ CRITICAL - Major problems

---

## 📊 Test Results

### Expected Security Test Results

```bash
$ ./run_security_tests.sh

========================================
🔒 VARITY SECURITY TEST SUITE
========================================

[1/4] Testing SQL Injection Protection...
tests/security/test_sql_injection.py .................... [100%]
✅ 100+ tests passed

[2/4] Testing XSS Protection...
tests/security/test_xss_protection.py ................... [100%]
✅ 80+ tests passed

[3/4] Testing Authentication & Authorization...
tests/security/test_authentication_security.py .......... [100%]
✅ 40+ tests passed

[4/4] Testing Rate Limiting...
tests/security/test_rate_limiting.py .................... [100%]
✅ 60+ tests passed

========================================
📊 Generating Coverage Report
========================================

Coverage: 95%

========================================
✅ Security Tests Complete
========================================
```

### Expected Performance Test Results

```bash
$ ./run_load_tests.sh http://localhost:8000 normal

========================================
🚀 VARITY LOAD TEST SUITE
========================================

Running Normal Load Test (100 users, 5 minutes)
Target: Average response time < 2s, 95th percentile < 5s

Type     Name                          # reqs  # fails  Avg    Min    Max    Median  req/s
-------- ----------------------------- ------- -------- ------ ------ ------ ------- ------
GET      Marketplace: List Tools       5000    0        825    120    3500   750     16.7
POST     AI Chat: Send Message         2000    0        1450   200    4800   1200    6.7
GET      Dashboard: Summary            1000    0        550    80     2100   500     3.3
GET      Integrations: List            800     0        620    90     2300   580     2.7

========================================
📊 PERFORMANCE SCORE
========================================

✅ Average response time: 862ms (Target: <2000ms)
✅ 95th percentile: 3200ms (Target: <5000ms)
✅ Error rate: 0.0% (Target: <1%)
✅ Throughput: 133.3 req/s

🎯 FINAL SCORE: 100/100
🏆 EXCELLENT - Production ready!

========================================
✅ Load Test Complete
========================================
```

### Reports Generated

After running tests, reports are available in:

```
backend/
├── reports/
│   ├── security/
│   │   └── coverage/
│   │       └── index.html        # HTML coverage report
│   └── performance/
│       ├── normal_load.html      # HTML load test report
│       ├── normal_load_stats.csv # CSV statistics
│       └── normal_load_failures.csv
└── SECURITY_PERFORMANCE_ANALYSIS.md  # Comprehensive analysis
```

---

## 🔄 Continuous Integration

### CI/CD Integration (GitHub Actions)

Create `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov

      - name: Start backend
        run: |
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
          sleep 10  # Wait for server to start

      - name: Run security tests
        run: |
          ./run_security_tests.sh

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./reports/security/coverage.xml
```

### Pre-commit Hooks

Create `.git/hooks/pre-commit`:

```bash
#!/bin/bash
# Run security tests before commit

echo "Running security tests..."
./run_security_tests.sh

if [ $? -ne 0 ]; then
  echo "❌ Security tests failed. Commit aborted."
  exit 1
fi

echo "✅ Security tests passed. Proceeding with commit."
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 🎯 Performance Benchmarks

### Target Metrics

| Metric | Target | Excellent | Good | Acceptable |
|--------|--------|-----------|------|------------|
| Average Response Time | < 2s | < 1s | < 2s | < 3s |
| 95th Percentile | < 5s | < 3s | < 5s | < 7s |
| Error Rate | < 1% | < 0.1% | < 1% | < 5% |
| Throughput | > 100 req/s | > 200 | > 100 | > 50 |

### Optimization Tips

If performance tests fail:

1. **Database Query Optimization**
   - Add indexes to frequently queried fields
   - Use database connection pooling
   - Cache query results in Redis

2. **API Response Optimization**
   - Enable gzip compression
   - Implement response caching
   - Paginate large result sets

3. **Rate Limiting Optimization**
   - Use Redis for distributed rate limiting
   - Optimize token bucket algorithm
   - Reduce middleware overhead

4. **Infrastructure Scaling**
   - Add more Akash compute instances
   - Use load balancer
   - Enable CDN for static assets

---

## 📚 Additional Resources

- **OWASP Testing Guide**: https://owasp.org/www-project-web-security-testing-guide/
- **Locust Documentation**: https://docs.locust.io/
- **pytest Documentation**: https://docs.pytest.org/
- **Security Headers**: https://securityheaders.com/
- **Web Security Academy**: https://portswigger.net/web-security

---

## 🤝 Contributing

When adding new security tests:

1. Follow existing test structure
2. Use descriptive test names
3. Include multiple attack vectors
4. Document expected results
5. Add tests to CI/CD pipeline

---

## 📝 License

This test suite is part of the Varity Generic Template (MIT License).

---

**Last Updated**: 2025-11-20
**Maintained By**: Varity Security Team
