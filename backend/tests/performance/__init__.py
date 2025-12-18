"""
Performance Test Suite

Load testing and performance benchmarks for Varity Generic Template.

Test Coverage:
- Load testing (100+ concurrent users)
- Response time benchmarks (avg < 2s, p95 < 5s)
- Throughput testing
- Stress testing
- Endurance testing

Tools:
- Locust (load testing framework)

Run load test:
    locust -f tests/performance/locustfile.py --host=http://localhost:8000

Run headless (for CI/CD):
    locust -f tests/performance/locustfile.py --headless --users 100 --spawn-rate 10 -t 5m --host=http://localhost:8000
"""
