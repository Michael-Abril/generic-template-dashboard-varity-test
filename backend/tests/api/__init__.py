"""
API Test Suite - Comprehensive API Endpoint Testing

This package contains comprehensive unit tests for all API endpoints in the
generic company dashboard template.

Test Coverage Target: 100% for all endpoints

Test Files:
- test_ai.py: AI chatbot and RAG endpoints (✅ 50+ tests)
- test_dashboard.py: Dashboard KPIs and metrics
- test_integrations.py: OAuth integration management
- test_marketplace_purchases.py: Purchase tracking
- test_marketplace_v2.py: Marketplace browsing
- test_oauth.py: OAuth authentication flows
- test_settings.py: User settings management
- test_sync.py: Data synchronization

Run all tests:
    pytest tests/api/ -v --cov=app/api/v1

Run specific test file:
    pytest tests/api/test_ai.py -v

Generate coverage report:
    pytest tests/api/ --cov=app/api/v1 --cov-report=html
"""
