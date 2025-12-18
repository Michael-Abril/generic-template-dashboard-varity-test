#!/usr/bin/env python3
"""
COMPREHENSIVE BACKEND API TESTING SUITE
Agent 2: Backend API Deep Tester

Tests EVERY backend endpoint with:
- Happy path scenarios
- Error cases
- Edge cases
- Security testing
- Performance benchmarks
"""

import requests
import json
import time
import hashlib
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import sys

# Configuration
BASE_URL = "http://localhost:8000"
TEST_WALLET = "0x1234567890123456789012345678901234567890"
TEST_WALLET_2 = "0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD"

# Test results storage
test_results = {
    "passed": 0,
    "failed": 0,
    "errors": [],
    "warnings": [],
    "performance": [],
    "security_issues": []
}

def log_test(endpoint: str, test_name: str, status: str, details: str = ""):
    """Log test result"""
    timestamp = datetime.now().isoformat()
    result = {
        "timestamp": timestamp,
        "endpoint": endpoint,
        "test": test_name,
        "status": status,
        "details": details
    }

    if status == "PASS":
        test_results["passed"] += 1
        print(f"✅ {endpoint} - {test_name}")
    elif status == "FAIL":
        test_results["failed"] += 1
        test_results["errors"].append(result)
        print(f"❌ {endpoint} - {test_name}: {details}")
    elif status == "WARN":
        test_results["warnings"].append(result)
        print(f"⚠️  {endpoint} - {test_name}: {details}")
    elif status == "SECURITY":
        test_results["security_issues"].append(result)
        print(f"🔒 SECURITY: {endpoint} - {test_name}: {details}")


def measure_response_time(func):
    """Decorator to measure response time"""
    def wrapper(*args, **kwargs):
        start_time = time.time()
        result = func(*args, **kwargs)
        elapsed = (time.time() - start_time) * 1000  # Convert to ms

        test_results["performance"].append({
            "endpoint": args[0] if args else "unknown",
            "response_time_ms": round(elapsed, 2),
            "timestamp": datetime.now().isoformat()
        })

        return result, elapsed
    return wrapper


@measure_response_time
def make_request(endpoint: str, method: str = "GET", data: Dict = None,
                  params: Dict = None, headers: Dict = None) -> requests.Response:
    """Make HTTP request with error handling"""
    url = f"{BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=30)
        elif method == "POST":
            response = requests.post(url, json=data, params=params, headers=headers, timeout=30)
        elif method == "PUT":
            response = requests.put(url, json=data, params=params, headers=headers, timeout=30)
        elif method == "DELETE":
            response = requests.delete(url, params=params, headers=headers, timeout=30)
        else:
            raise ValueError(f"Unsupported method: {method}")

        return response
    except requests.exceptions.Timeout:
        log_test(endpoint, "timeout", "FAIL", "Request timed out after 30s")
        return None
    except Exception as e:
        log_test(endpoint, "request_error", "FAIL", str(e))
        return None


# =====================================================================
# TEST SUITE 1: HEALTH & ROOT ENDPOINTS
# =====================================================================

def test_health_endpoint():
    """Test health check endpoint"""
    print("\n" + "="*70)
    print("TEST SUITE 1: HEALTH & ROOT ENDPOINTS")
    print("="*70)

    # Test 1: Health check returns 200
    response, elapsed = make_request("/health")
    if response and response.status_code == 200:
        log_test("/health", "returns_200_ok", "PASS")
    else:
        log_test("/health", "returns_200_ok", "FAIL", f"Got status {response.status_code if response else 'None'}")

    # Test 2: Health check returns JSON
    if response:
        try:
            data = response.json()
            log_test("/health", "returns_json", "PASS")

            # Test 3: Has required fields
            required_fields = ["status", "database", "version"]
            for field in required_fields:
                if field in data:
                    log_test("/health", f"has_field_{field}", "PASS")
                else:
                    log_test("/health", f"has_field_{field}", "FAIL", f"Missing field: {field}")

            # Test 4: Database connected
            if data.get("database") == "connected":
                log_test("/health", "database_connected", "PASS")
            else:
                log_test("/health", "database_connected", "FAIL", f"Database: {data.get('database')}")

        except json.JSONDecodeError:
            log_test("/health", "returns_json", "FAIL", "Response is not valid JSON")

    # Test 5: Response time acceptable (<200ms)
    if elapsed < 200:
        log_test("/health", "response_time_acceptable", "PASS")
    else:
        log_test("/health", "response_time_acceptable", "WARN", f"Slow response: {elapsed}ms")

    # Test 6: Root endpoint
    response, elapsed = make_request("/")
    if response and response.status_code == 200:
        log_test("/", "returns_200_ok", "PASS")
        data = response.json()
        if "service" in data and "version" in data:
            log_test("/", "has_metadata", "PASS")
        else:
            log_test("/", "has_metadata", "FAIL", "Missing service metadata")
    else:
        log_test("/", "returns_200_ok", "FAIL")


# =====================================================================
# TEST SUITE 2: MARKETPLACE ENDPOINTS
# =====================================================================

def test_marketplace_endpoints():
    """Test all marketplace endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 2: MARKETPLACE ENDPOINTS")
    print("="*70)

    # Test 1: Get categories
    response, elapsed = make_request("/api/v1/marketplace/categories")
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/categories", "returns_200", "PASS")
        categories = response.json()
        if isinstance(categories, list) and len(categories) > 0:
            log_test("/api/v1/marketplace/categories", "returns_categories", "PASS")
        else:
            log_test("/api/v1/marketplace/categories", "returns_categories", "FAIL", "No categories returned")
    else:
        log_test("/api/v1/marketplace/categories", "returns_200", "FAIL")

    # Test 2: Get all products
    response, elapsed = make_request("/api/v1/marketplace/products")
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products", "returns_200", "PASS")
        products = response.json()
        if isinstance(products, list):
            log_test("/api/v1/marketplace/products", "returns_list", "PASS")
            if len(products) >= 20:
                log_test("/api/v1/marketplace/products", "has_20_products", "PASS")
            else:
                log_test("/api/v1/marketplace/products", "has_20_products", "WARN", f"Only {len(products)} products")
        else:
            log_test("/api/v1/marketplace/products", "returns_list", "FAIL")
    else:
        log_test("/api/v1/marketplace/products", "returns_200", "FAIL")

    # Test 3: Filter products by category
    response, elapsed = make_request("/api/v1/marketplace/products", params={"category": "accounting"})
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products", "filter_by_category", "PASS")
        products = response.json()
        # Verify all products are in accounting category
        all_accounting = all(p.get("category") == "accounting" for p in products)
        if all_accounting and len(products) > 0:
            log_test("/api/v1/marketplace/products", "category_filter_works", "PASS")
        else:
            log_test("/api/v1/marketplace/products", "category_filter_works", "FAIL", "Filter not working correctly")

    # Test 4: Search products
    response, elapsed = make_request("/api/v1/marketplace/products", params={"search": "quick"})
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products", "search_works", "PASS")
        products = response.json()
        # Should find QuickBooks
        has_quickbooks = any("quick" in p.get("name", "").lower() for p in products)
        if has_quickbooks:
            log_test("/api/v1/marketplace/products", "search_finds_quickbooks", "PASS")
        else:
            log_test("/api/v1/marketplace/products", "search_finds_quickbooks", "FAIL")

    # Test 5: Invalid category
    response, elapsed = make_request("/api/v1/marketplace/products", params={"category": "nonexistent_category"})
    if response and response.status_code == 200:
        products = response.json()
        if len(products) == 0:
            log_test("/api/v1/marketplace/products", "invalid_category_returns_empty", "PASS")
        else:
            log_test("/api/v1/marketplace/products", "invalid_category_returns_empty", "WARN", "Should return empty list")

    # Test 6: SQL injection in search
    response, elapsed = make_request("/api/v1/marketplace/products", params={"search": "'; DROP TABLE products; --"})
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products", "sql_injection_protected", "PASS")
    else:
        log_test("/api/v1/marketplace/products", "sql_injection_protected", "SECURITY", "SQL injection may be vulnerable")

    # Test 7: Get product by ID
    response, elapsed = make_request("/api/v1/marketplace/products/1")
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products/{id}", "valid_id_returns_200", "PASS")
        product = response.json()
        required_fields = ["id", "name", "slug", "pricing_plans"]
        for field in required_fields:
            if field in product:
                log_test("/api/v1/marketplace/products/{id}", f"has_{field}", "PASS")
            else:
                log_test("/api/v1/marketplace/products/{id}", f"has_{field}", "FAIL")
    else:
        log_test("/api/v1/marketplace/products/{id}", "valid_id_returns_200", "FAIL")

    # Test 8: Invalid product ID
    response, elapsed = make_request("/api/v1/marketplace/products/999999")
    if response and response.status_code == 404:
        log_test("/api/v1/marketplace/products/{id}", "invalid_id_returns_404", "PASS")
    else:
        log_test("/api/v1/marketplace/products/{id}", "invalid_id_returns_404", "FAIL", f"Got {response.status_code if response else 'None'}")

    # Test 9: Non-numeric product ID
    response, elapsed = make_request("/api/v1/marketplace/products/abc")
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/marketplace/products/{id}", "non_numeric_id_returns_error", "PASS")
    else:
        log_test("/api/v1/marketplace/products/{id}", "non_numeric_id_returns_error", "FAIL")

    # Test 10: Get product by slug
    response, elapsed = make_request("/api/v1/marketplace/products/slug/quickbooks")
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/products/slug/{slug}", "valid_slug_returns_200", "PASS")
        product = response.json()
        if product.get("slug") == "quickbooks":
            log_test("/api/v1/marketplace/products/slug/{slug}", "correct_product_returned", "PASS")
        else:
            log_test("/api/v1/marketplace/products/slug/{slug}", "correct_product_returned", "FAIL")
    else:
        log_test("/api/v1/marketplace/products/slug/{slug}", "valid_slug_returns_200", "FAIL")

    # Test 11: Invalid slug
    response, elapsed = make_request("/api/v1/marketplace/products/slug/nonexistent")
    if response and response.status_code == 404:
        log_test("/api/v1/marketplace/products/slug/{slug}", "invalid_slug_returns_404", "PASS")
    else:
        log_test("/api/v1/marketplace/products/slug/{slug}", "invalid_slug_returns_404", "FAIL")

    # Test 12: Pricing calculator - valid request
    response, elapsed = make_request("/api/v1/marketplace/pricing-calculator",
                                     params={
                                         "product_id": 1,
                                         "tier": "professional",
                                         "billing_period": "monthly",
                                         "users": 5
                                     })
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/pricing-calculator", "valid_calculation", "PASS")
        data = response.json()
        if "total_price" in data and "total_with_fees" in data:
            log_test("/api/v1/marketplace/pricing-calculator", "has_pricing_fields", "PASS")
        else:
            log_test("/api/v1/marketplace/pricing-calculator", "has_pricing_fields", "FAIL")
    else:
        log_test("/api/v1/marketplace/pricing-calculator", "valid_calculation", "FAIL")

    # Test 13: Pricing calculator - annual vs monthly
    monthly_response, _ = make_request("/api/v1/marketplace/pricing-calculator",
                                       params={"product_id": 1, "tier": "professional", "billing_period": "monthly", "users": 1})
    annual_response, _ = make_request("/api/v1/marketplace/pricing-calculator",
                                      params={"product_id": 1, "tier": "professional", "billing_period": "annually", "users": 1})

    if monthly_response and annual_response and monthly_response.status_code == 200 and annual_response.status_code == 200:
        monthly_data = monthly_response.json()
        annual_data = annual_response.json()
        if "annual_savings" in annual_data:
            log_test("/api/v1/marketplace/pricing-calculator", "annual_savings_calculated", "PASS")
        else:
            log_test("/api/v1/marketplace/pricing-calculator", "annual_savings_calculated", "WARN", "No annual savings shown")

    # Test 14: Pricing calculator - invalid product
    response, elapsed = make_request("/api/v1/marketplace/pricing-calculator",
                                     params={"product_id": 99999, "tier": "professional", "billing_period": "monthly", "users": 1})
    if response and response.status_code == 404:
        log_test("/api/v1/marketplace/pricing-calculator", "invalid_product_returns_404", "PASS")
    else:
        log_test("/api/v1/marketplace/pricing-calculator", "invalid_product_returns_404", "FAIL")

    # Test 15: Pricing calculator - invalid tier
    response, elapsed = make_request("/api/v1/marketplace/pricing-calculator",
                                     params={"product_id": 1, "tier": "nonexistent", "billing_period": "monthly", "users": 1})
    if response and response.status_code == 404:
        log_test("/api/v1/marketplace/pricing-calculator", "invalid_tier_returns_404", "PASS")
    else:
        log_test("/api/v1/marketplace/pricing-calculator", "invalid_tier_returns_404", "FAIL")

    # Test 16: Pricing calculator - missing required params
    response, elapsed = make_request("/api/v1/marketplace/pricing-calculator", params={"product_id": 1})
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/marketplace/pricing-calculator", "missing_params_returns_error", "PASS")
    else:
        log_test("/api/v1/marketplace/pricing-calculator", "missing_params_returns_error", "FAIL")

    # Test 17: Purchase license - valid purchase
    purchase_data = {
        "product_id": 1,
        "tier": "professional",
        "wallet_address": TEST_WALLET,
        "billing_period": "monthly",
        "users": 5
    }
    response, elapsed = make_request("/api/v1/marketplace/purchase", method="POST", data=purchase_data)
    if response and response.status_code == 200:
        log_test("/api/v1/marketplace/purchase", "valid_purchase_succeeds", "PASS")
        data = response.json()
        if data.get("success") and "license_id" in data and "transaction_hash" in data:
            log_test("/api/v1/marketplace/purchase", "purchase_returns_license", "PASS")
            # Store for later tests
            global TEST_PURCHASE_LICENSE_ID, TEST_PURCHASE_TX_HASH
            TEST_PURCHASE_LICENSE_ID = data.get("license_id")
            TEST_PURCHASE_TX_HASH = data.get("transaction_hash")
        else:
            log_test("/api/v1/marketplace/purchase", "purchase_returns_license", "FAIL")
    else:
        log_test("/api/v1/marketplace/purchase", "valid_purchase_succeeds", "FAIL")

    # Test 18: Purchase - invalid product
    invalid_purchase = {
        "product_id": 99999,
        "tier": "professional",
        "wallet_address": TEST_WALLET,
        "billing_period": "monthly",
        "users": 1
    }
    response, elapsed = make_request("/api/v1/marketplace/purchase", method="POST", data=invalid_purchase)
    if response and response.status_code == 404:
        log_test("/api/v1/marketplace/purchase", "invalid_product_returns_404", "PASS")
    else:
        log_test("/api/v1/marketplace/purchase", "invalid_product_returns_404", "FAIL")

    # Test 19: Purchase - missing wallet_address
    invalid_purchase = {
        "product_id": 1,
        "tier": "professional",
        "billing_period": "monthly",
        "users": 1
    }
    response, elapsed = make_request("/api/v1/marketplace/purchase", method="POST", data=invalid_purchase)
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/marketplace/purchase", "missing_wallet_returns_error", "PASS")
    else:
        log_test("/api/v1/marketplace/purchase", "missing_wallet_returns_error", "FAIL")


# =====================================================================
# TEST SUITE 3: INTEGRATIONS ENDPOINTS
# =====================================================================

def test_integrations_endpoints():
    """Test integrations endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 3: INTEGRATIONS ENDPOINTS")
    print("="*70)

    # Test 1: List installed integrations - valid wallet
    response, elapsed = make_request("/api/v1/integrations/installed",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/integrations/installed", "valid_wallet_returns_200", "PASS")
        data = response.json()
        if "integrations" in data:
            log_test("/api/v1/integrations/installed", "has_integrations_field", "PASS")
        else:
            log_test("/api/v1/integrations/installed", "has_integrations_field", "FAIL")
    else:
        log_test("/api/v1/integrations/installed", "valid_wallet_returns_200", "FAIL")

    # Test 2: List installed - missing wallet_address
    response, elapsed = make_request("/api/v1/integrations/installed")
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/integrations/installed", "missing_wallet_returns_error", "PASS")
    else:
        log_test("/api/v1/integrations/installed", "missing_wallet_returns_error", "FAIL")

    # Test 3: Get tool schema - QuickBooks
    response, elapsed = make_request("/api/v1/integrations/quickbooks/schema")
    if response and response.status_code == 200:
        log_test("/api/v1/integrations/{tool}/schema", "quickbooks_schema_returns_200", "PASS")
        data = response.json()
        if "data_types" in data:
            log_test("/api/v1/integrations/{tool}/schema", "has_data_types", "PASS")
        else:
            log_test("/api/v1/integrations/{tool}/schema", "has_data_types", "FAIL")
    else:
        log_test("/api/v1/integrations/{tool}/schema", "quickbooks_schema_returns_200", "FAIL")

    # Test 4: Get tool schema - invalid tool
    response, elapsed = make_request("/api/v1/integrations/nonexistent/schema")
    if response and response.status_code == 404:
        log_test("/api/v1/integrations/{tool}/schema", "invalid_tool_returns_404", "PASS")
    else:
        log_test("/api/v1/integrations/{tool}/schema", "invalid_tool_returns_404", "FAIL")


# =====================================================================
# TEST SUITE 4: AI ENDPOINTS
# =====================================================================

def test_ai_endpoints():
    """Test AI chatbot endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 4: AI CHATBOT ENDPOINTS")
    print("="*70)

    # Test 1: AI chat - valid request
    chat_data = {
        "message": "What's my total revenue?",
        "wallet_address": TEST_WALLET,
        "use_rag": True
    }
    response, elapsed = make_request("/api/v1/ai/chat", method="POST", data=chat_data)
    if response and response.status_code == 200:
        log_test("/api/v1/ai/chat", "valid_chat_returns_200", "PASS")
        data = response.json()
        if "response" in data and "conversation_id" in data:
            log_test("/api/v1/ai/chat", "has_required_fields", "PASS")
        else:
            log_test("/api/v1/ai/chat", "has_required_fields", "FAIL")
    else:
        log_test("/api/v1/ai/chat", "valid_chat_returns_200", "FAIL")

    # Test 2: AI chat response time (<5 seconds)
    if elapsed < 5000:
        log_test("/api/v1/ai/chat", "response_time_acceptable", "PASS")
    else:
        log_test("/api/v1/ai/chat", "response_time_acceptable", "WARN", f"Slow: {elapsed}ms")

    # Test 3: AI chat - missing message
    invalid_chat = {
        "wallet_address": TEST_WALLET
    }
    response, elapsed = make_request("/api/v1/ai/chat", method="POST", data=invalid_chat)
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/ai/chat", "missing_message_returns_error", "PASS")
    else:
        log_test("/api/v1/ai/chat", "missing_message_returns_error", "FAIL")

    # Test 4: AI chat - missing wallet
    invalid_chat = {
        "message": "Test message"
    }
    response, elapsed = make_request("/api/v1/ai/chat", method="POST", data=invalid_chat)
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/ai/chat", "missing_wallet_returns_error", "PASS")
    else:
        log_test("/api/v1/ai/chat", "missing_wallet_returns_error", "FAIL")

    # Test 5: Get suggestions
    response, elapsed = make_request("/api/v1/ai/suggestions",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/ai/suggestions", "returns_suggestions", "PASS")
        data = response.json()
        if "suggestions" in data and isinstance(data["suggestions"], list):
            log_test("/api/v1/ai/suggestions", "suggestions_is_list", "PASS")
        else:
            log_test("/api/v1/ai/suggestions", "suggestions_is_list", "FAIL")
    else:
        log_test("/api/v1/ai/suggestions", "returns_suggestions", "FAIL")

    # Test 6: Get query history
    response, elapsed = make_request("/api/v1/ai/history",
                                     params={"wallet_address": TEST_WALLET, "limit": 10})
    if response and response.status_code == 200:
        log_test("/api/v1/ai/history", "returns_history", "PASS")
    else:
        log_test("/api/v1/ai/history", "returns_history", "FAIL")

    # Test 7: RAG stats
    response, elapsed = make_request("/api/v1/ai/rag/stats",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/ai/rag/stats", "returns_stats", "PASS")
    else:
        log_test("/api/v1/ai/rag/stats", "returns_stats", "FAIL")


# =====================================================================
# TEST SUITE 5: OAUTH ENDPOINTS
# =====================================================================

def test_oauth_endpoints():
    """Test OAuth endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 5: OAUTH ENDPOINTS")
    print("="*70)

    # Test 1: Start OAuth flow - QuickBooks
    oauth_data = {
        "wallet_address": TEST_WALLET
    }
    response, elapsed = make_request("/api/v1/oauth/start/quickbooks",
                                     method="POST", data=oauth_data)
    if response and response.status_code == 200:
        log_test("/api/v1/oauth/start/{integration}", "quickbooks_oauth_starts", "PASS")
        data = response.json()
        if "authorization_url" in data:
            log_test("/api/v1/oauth/start/{integration}", "returns_authorization_url", "PASS")
        else:
            log_test("/api/v1/oauth/start/{integration}", "returns_authorization_url", "FAIL")
    else:
        log_test("/api/v1/oauth/start/{integration}", "quickbooks_oauth_starts", "FAIL")

    # Test 2: Start OAuth - invalid integration
    response, elapsed = make_request("/api/v1/oauth/start/invalid",
                                     method="POST", data=oauth_data)
    if response and response.status_code == 400:
        log_test("/api/v1/oauth/start/{integration}", "invalid_integration_returns_400", "PASS")
    else:
        log_test("/api/v1/oauth/start/{integration}", "invalid_integration_returns_400", "FAIL")

    # Test 3: OAuth status
    response, elapsed = make_request("/api/v1/oauth/status/quickbooks",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/oauth/status/{integration}", "returns_status", "PASS")
    else:
        log_test("/api/v1/oauth/status/{integration}", "returns_status", "FAIL")


# =====================================================================
# TEST SUITE 6: DASHBOARD ENDPOINTS
# =====================================================================

def test_dashboard_endpoints():
    """Test dashboard endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 6: DASHBOARD ENDPOINTS")
    print("="*70)

    # Test 1: Get KPIs
    response, elapsed = make_request("/api/v1/dashboard/kpis",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/dashboard/kpis", "returns_kpis", "PASS")
        data = response.json()
        required_fields = ["total_revenue", "active_customers", "inventory_value", "unpaid_invoices"]
        for field in required_fields:
            if field in data:
                log_test("/api/v1/dashboard/kpis", f"has_{field}", "PASS")
            else:
                log_test("/api/v1/dashboard/kpis", f"has_{field}", "FAIL")
    else:
        log_test("/api/v1/dashboard/kpis", "returns_kpis", "FAIL")

    # Test 2: Missing wallet_address
    response, elapsed = make_request("/api/v1/dashboard/kpis")
    if response and response.status_code in [400, 422]:
        log_test("/api/v1/dashboard/kpis", "missing_wallet_returns_error", "PASS")
    else:
        log_test("/api/v1/dashboard/kpis", "missing_wallet_returns_error", "FAIL")

    # Test 3: Revenue trend
    response, elapsed = make_request("/api/v1/dashboard/revenue-trend",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/dashboard/revenue-trend", "returns_trend", "PASS")
        data = response.json()
        if "trend_data" in data and isinstance(data["trend_data"], list):
            log_test("/api/v1/dashboard/revenue-trend", "has_trend_data", "PASS")
        else:
            log_test("/api/v1/dashboard/revenue-trend", "has_trend_data", "FAIL")
    else:
        log_test("/api/v1/dashboard/revenue-trend", "returns_trend", "FAIL")

    # Test 4: Recent activity
    response, elapsed = make_request("/api/v1/dashboard/recent-activity",
                                     params={"wallet_address": TEST_WALLET, "limit": 10})
    if response and response.status_code == 200:
        log_test("/api/v1/dashboard/recent-activity", "returns_activity", "PASS")
        data = response.json()
        if "activities" in data and isinstance(data["activities"], list):
            log_test("/api/v1/dashboard/recent-activity", "has_activities", "PASS")
        else:
            log_test("/api/v1/dashboard/recent-activity", "has_activities", "FAIL")
    else:
        log_test("/api/v1/dashboard/recent-activity", "returns_activity", "FAIL")

    # Test 5: Top customers
    response, elapsed = make_request("/api/v1/dashboard/top-customers",
                                     params={"wallet_address": TEST_WALLET, "limit": 5})
    if response and response.status_code == 200:
        log_test("/api/v1/dashboard/top-customers", "returns_customers", "PASS")
        data = response.json()
        if "customers" in data and isinstance(data["customers"], list):
            log_test("/api/v1/dashboard/top-customers", "has_customers", "PASS")
        else:
            log_test("/api/v1/dashboard/top-customers", "has_customers", "FAIL")
    else:
        log_test("/api/v1/dashboard/top-customers", "returns_customers", "FAIL")

    # Test 6: Analytics
    response, elapsed = make_request("/api/v1/dashboard/analytics",
                                     params={"wallet_address": TEST_WALLET, "period": "mtd"})
    if response and response.status_code == 200:
        log_test("/api/v1/dashboard/analytics", "returns_analytics", "PASS")
    else:
        log_test("/api/v1/dashboard/analytics", "returns_analytics", "FAIL")


# =====================================================================
# TEST SUITE 7: STORAGE ENDPOINTS
# =====================================================================

def test_storage_endpoints():
    """Test storage endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 7: STORAGE ENDPOINTS")
    print("="*70)

    # Test 1: Upload data
    upload_data = {
        "customer_wallet": TEST_WALLET,
        "integration": "quickbooks",
        "data_type": "test-invoice",
        "data": {
            "invoice_id": "TEST-001",
            "amount": 1000.00,
            "customer": "Test Corp"
        },
        "metadata": {
            "test": True
        }
    }
    response, elapsed = make_request("/api/v1/storage/upload", method="POST", data=upload_data)
    if response and response.status_code == 200:
        log_test("/api/v1/storage/upload", "upload_succeeds", "PASS")
        data = response.json()
        if "cid" in data:
            log_test("/api/v1/storage/upload", "returns_cid", "PASS")
            global TEST_STORAGE_CID
            TEST_STORAGE_CID = data["cid"]
        else:
            log_test("/api/v1/storage/upload", "returns_cid", "FAIL")
    else:
        log_test("/api/v1/storage/upload", "upload_succeeds", "FAIL")

    # Test 2: List files
    list_data = {
        "customer_wallet": TEST_WALLET,
        "limit": 100
    }
    response, elapsed = make_request("/api/v1/storage/list", method="POST", data=list_data)
    if response and response.status_code == 200:
        log_test("/api/v1/storage/list", "list_succeeds", "PASS")
        data = response.json()
        if "files" in data:
            log_test("/api/v1/storage/list", "has_files_field", "PASS")
        else:
            log_test("/api/v1/storage/list", "has_files_field", "FAIL")
    else:
        log_test("/api/v1/storage/list", "list_succeeds", "FAIL")


# =====================================================================
# TEST SUITE 8: SETTINGS ENDPOINTS
# =====================================================================

def test_settings_endpoints():
    """Test settings endpoints"""
    print("\n" + "="*70)
    print("TEST SUITE 8: SETTINGS ENDPOINTS")
    print("="*70)

    # Test 1: Get settings
    response, elapsed = make_request("/api/v1/settings",
                                     params={"wallet_address": TEST_WALLET})
    if response and response.status_code == 200:
        log_test("/api/v1/settings", "get_settings_succeeds", "PASS")
        data = response.json()
        if "timezone" in data and "language" in data:
            log_test("/api/v1/settings", "has_default_settings", "PASS")
        else:
            log_test("/api/v1/settings", "has_default_settings", "FAIL")
    else:
        log_test("/api/v1/settings", "get_settings_succeeds", "FAIL")

    # Test 2: Update settings
    update_data = {
        "company_name": "Test Company",
        "timezone": "America/New_York"
    }
    response, elapsed = make_request("/api/v1/settings",
                                     params={"wallet_address": TEST_WALLET},
                                     method="PUT", data=update_data)
    if response and response.status_code == 200:
        log_test("/api/v1/settings", "update_settings_succeeds", "PASS")
        data = response.json()
        if data.get("company_name") == "Test Company":
            log_test("/api/v1/settings", "settings_updated_correctly", "PASS")
        else:
            log_test("/api/v1/settings", "settings_updated_correctly", "FAIL")
    else:
        log_test("/api/v1/settings", "update_settings_succeeds", "FAIL")


# =====================================================================
# TEST SUITE 9: SECURITY TESTING
# =====================================================================

def test_security():
    """Security-focused tests"""
    print("\n" + "="*70)
    print("TEST SUITE 9: SECURITY TESTING")
    print("="*70)

    # Test 1: Multi-tenant isolation - User A cannot access User B's data
    # Upload as User A
    upload_a = {
        "customer_wallet": TEST_WALLET,
        "integration": "quickbooks",
        "data_type": "private-invoice",
        "data": {"secret": "User A secret"},
    }
    response_a, _ = make_request("/api/v1/storage/upload", method="POST", data=upload_a)

    # Try to list as User B
    list_b = {
        "customer_wallet": TEST_WALLET_2,
        "limit": 100
    }
    response_b, _ = make_request("/api/v1/storage/list", method="POST", data=list_b)

    if response_b and response_b.status_code == 200:
        data_b = response_b.json()
        # User B should NOT see User A's files
        if len(data_b.get("files", [])) == 0 or not any(f.get("customer_wallet") == TEST_WALLET for f in data_b.get("files", [])):
            log_test("SECURITY", "multi_tenant_isolation", "PASS")
        else:
            log_test("SECURITY", "multi_tenant_isolation", "SECURITY", "User B can see User A's files!")

    # Test 2: Rate limiting
    print("Testing rate limiting (sending 60 requests)...")
    rate_limit_hit = False
    for i in range(60):
        response, _ = make_request("/health")
        if response and response.status_code == 429:
            rate_limit_hit = True
            break

    if rate_limit_hit:
        log_test("SECURITY", "rate_limiting_enabled", "PASS")
    else:
        log_test("SECURITY", "rate_limiting_enabled", "WARN", "No rate limit hit after 60 requests")


# =====================================================================
# MAIN TEST RUNNER
# =====================================================================

def print_summary():
    """Print test summary"""
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    total_tests = test_results["passed"] + test_results["failed"]
    pass_rate = (test_results["passed"] / total_tests * 100) if total_tests > 0 else 0

    print(f"Total Tests: {total_tests}")
    print(f"✅ Passed: {test_results['passed']}")
    print(f"❌ Failed: {test_results['failed']}")
    print(f"⚠️  Warnings: {len(test_results['warnings'])}")
    print(f"🔒 Security Issues: {len(test_results['security_issues'])}")
    print(f"Pass Rate: {pass_rate:.1f}%")

    if test_results["errors"]:
        print("\n" + "="*70)
        print("FAILED TESTS")
        print("="*70)
        for error in test_results["errors"][:10]:  # Show first 10
            print(f"❌ {error['endpoint']} - {error['test']}: {error['details']}")

    if test_results["security_issues"]:
        print("\n" + "="*70)
        print("🔒 SECURITY ISSUES")
        print("="*70)
        for issue in test_results["security_issues"]:
            print(f"🔒 {issue['endpoint']} - {issue['test']}: {issue['details']}")

    # Performance summary
    if test_results["performance"]:
        avg_response_time = sum(p["response_time_ms"] for p in test_results["performance"]) / len(test_results["performance"])
        max_response = max(test_results["performance"], key=lambda x: x["response_time_ms"])

        print("\n" + "="*70)
        print("PERFORMANCE SUMMARY")
        print("="*70)
        print(f"Average Response Time: {avg_response_time:.2f}ms")
        print(f"Slowest Endpoint: {max_response['endpoint']} ({max_response['response_time_ms']:.2f}ms)")


def main():
    """Main test runner"""
    print("="*70)
    print("COMPREHENSIVE BACKEND API TESTING SUITE")
    print("Agent 2: Backend API Deep Tester")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Test Wallet: {TEST_WALLET}")
    print(f"Started: {datetime.now().isoformat()}")

    # Run all test suites
    test_health_endpoint()
    test_marketplace_endpoints()
    test_integrations_endpoints()
    test_ai_endpoints()
    test_oauth_endpoints()
    test_dashboard_endpoints()
    test_storage_endpoints()
    test_settings_endpoints()
    test_security()

    # Print summary
    print_summary()

    # Save results to file
    with open("/home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard/test_results.json", "w") as f:
        json.dump(test_results, f, indent=2, default=str)

    print(f"\n✅ Results saved to: test_results.json")
    print(f"Completed: {datetime.now().isoformat()}")

    # Exit with appropriate code
    sys.exit(0 if test_results["failed"] == 0 else 1)


if __name__ == "__main__":
    main()
