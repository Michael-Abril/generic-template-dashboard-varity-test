"""
Integration tests for the generic company dashboard API

Run with: pytest tests/test_api_integration.py -v
"""
import pytest
import requests
import json
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
TEST_WALLET = "0x1234567890123456789012345678901234567890"
TIMEOUT = 10  # seconds


class TestHealthEndpoints:
    """Test basic health and status endpoints"""

    def test_health_endpoint(self):
        """Test health check endpoint"""
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"

    def test_health_response_structure(self):
        """Test health endpoint response structure"""
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        data = response.json()

        # Check expected fields
        expected_fields = ["status", "timestamp"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"


class TestMarketplaceAPI:
    """Test marketplace endpoints"""

    def test_list_tools(self):
        """Test listing all tools"""
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools",
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Should return at least one tool"

        # Check first tool structure
        tool = data[0]
        required_fields = [
            "id", "name", "category", "description",
            "monthlyPrice", "provider", "features"
        ]
        for field in required_fields:
            assert field in tool, f"Tool missing field: {field}"

    def test_get_tool_details(self):
        """Test getting specific tool details"""
        # Get QuickBooks (tool ID 0)
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools/0",
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        tool = response.json()
        assert tool["name"] == "QuickBooks"
        assert tool["category"] == "Accounting"
        assert tool["monthlyPrice"] == 49
        assert "features" in tool
        assert len(tool["features"]) > 0

    def test_get_invalid_tool(self):
        """Test getting non-existent tool"""
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools/999",
            timeout=TIMEOUT
        )
        assert response.status_code == 404

    def test_get_categories(self):
        """Test listing tool categories"""
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/categories",
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        categories = response.json()
        assert isinstance(categories, list)

        # Check expected categories
        expected_categories = ["Accounting", "CRM", "E-commerce"]
        for category in expected_categories:
            assert category in categories, f"Missing category: {category}"

    def test_filter_tools_by_category(self):
        """Test filtering tools by category"""
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools",
            params={"category": "Accounting"},
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        tools = response.json()
        for tool in tools:
            assert tool["category"] == "Accounting"

    def test_search_tools(self):
        """Test searching tools by name"""
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools",
            params={"search": "QuickBooks"},
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        tools = response.json()
        assert len(tools) > 0
        assert any(tool["name"] == "QuickBooks" for tool in tools)


class TestIntegrationsAPI:
    """Test integrations endpoints"""

    def test_get_installed_tools_empty(self):
        """Test getting user's installed tools (empty state)"""
        new_wallet = "0x9876543210987654321098765432109876543210"
        response = requests.get(
            f"{BASE_URL}/api/v1/integrations/installed",
            params={"wallet": new_wallet},
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        tools = response.json()
        assert isinstance(tools, list)
        # New wallet should have no installed tools
        assert len(tools) == 0

    def test_sync_quickbooks(self):
        """Test QuickBooks data sync"""
        response = requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        result = response.json()
        assert result["success"] is True
        assert result["integration"] == "quickbooks"
        assert "files_uploaded" in result
        assert result["files_uploaded"] > 0
        assert "cid" in result or "storage_path" in result

    def test_get_quickbooks_data(self):
        """Test retrieving QuickBooks data"""
        # First sync data
        sync_response = requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )
        assert sync_response.status_code == 200

        # Then retrieve data
        time.sleep(1)  # Brief pause for storage
        response = requests.get(
            f"{BASE_URL}/api/v1/integrations/quickbooks/data",
            params={"wallet": TEST_WALLET},
            timeout=TIMEOUT
        )
        assert response.status_code == 200

        data = response.json()
        assert "invoices" in data
        assert "expenses" in data
        assert "customers" in data
        assert "summary" in data

        # Check data structure
        assert isinstance(data["invoices"], list)
        assert len(data["invoices"]) > 0

        # Check invoice structure
        invoice = data["invoices"][0]
        assert "invoice_number" in invoice
        assert "customer_name" in invoice
        assert "amount" in invoice
        assert "status" in invoice

    def test_get_quickbooks_summary(self):
        """Test QuickBooks summary statistics"""
        # Ensure data exists
        requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )

        time.sleep(1)
        response = requests.get(
            f"{BASE_URL}/api/v1/integrations/quickbooks/data",
            params={"wallet": TEST_WALLET},
            timeout=TIMEOUT
        )

        data = response.json()
        summary = data["summary"]

        assert "total_revenue" in summary
        assert "total_expenses" in summary
        assert "profit_margin" in summary
        assert summary["total_revenue"] > 0

    def test_get_data_without_sync(self):
        """Test retrieving data for wallet with no data"""
        new_wallet = "0xABCDEF1234567890ABCDEF1234567890ABCDEF12"
        response = requests.get(
            f"{BASE_URL}/api/v1/integrations/quickbooks/data",
            params={"wallet": new_wallet},
            timeout=TIMEOUT
        )

        # Should return 404 or empty data
        assert response.status_code in [200, 404]


class TestAIAPI:
    """Test AI endpoints"""

    def test_ai_chat_basic(self):
        """Test basic AI chat endpoint"""
        # Ensure QuickBooks data exists
        requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )

        time.sleep(1)
        response = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            json={
                "message": "What's my total revenue?",
                "wallet_address": TEST_WALLET
            },
            timeout=30  # AI queries may take longer
        )
        assert response.status_code == 200

        result = response.json()
        assert "response" in result
        assert "sources" in result
        assert isinstance(result["response"], str)
        assert len(result["response"]) > 0

        # Check sources
        assert isinstance(result["sources"], list)

    def test_ai_chat_with_context(self):
        """Test AI chat with conversation context"""
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            json={
                "message": "What's my total revenue?",
                "wallet_address": TEST_WALLET
            },
            timeout=30
        )

        # Follow-up message
        response2 = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            json={
                "message": "And what about expenses?",
                "wallet_address": TEST_WALLET
            },
            timeout=30
        )

        assert response1.status_code == 200
        assert response2.status_code == 200

        result2 = response2.json()
        assert "response" in result2

    def test_ai_query_advanced(self):
        """Test advanced AI query endpoint"""
        # Ensure data exists
        requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )

        time.sleep(1)
        response = requests.post(
            f"{BASE_URL}/api/v1/ai/query",
            json={
                "query": "Show me top 3 customers by revenue",
                "tools": ["quickbooks"],
                "wallet_address": TEST_WALLET
            },
            timeout=30
        )
        assert response.status_code == 200

        result = response.json()
        assert "response" in result
        assert "data" in result or "analysis" in result

    def test_ai_chat_without_integrations(self):
        """Test AI chat with no integrations installed"""
        new_wallet = "0xNEWWALLET1234567890123456789012345678"
        response = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            json={
                "message": "What's my revenue?",
                "wallet_address": new_wallet
            },
            timeout=30
        )

        # Should still respond, but indicate no data
        assert response.status_code == 200
        result = response.json()
        assert "response" in result


class TestStorageIntegration:
    """Test storage layer integration"""

    def test_file_upload_and_retrieval(self):
        """Test file upload and retrieval flow"""
        # Sync data (uploads files)
        sync_response = requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={"wallet_address": TEST_WALLET},
            timeout=TIMEOUT
        )
        assert sync_response.status_code == 200

        sync_result = sync_response.json()
        assert "files_uploaded" in sync_result
        files_count = sync_result["files_uploaded"]
        assert files_count > 0

        # Retrieve data (downloads files)
        time.sleep(1)
        retrieve_response = requests.get(
            f"{BASE_URL}/api/v1/integrations/quickbooks/data",
            params={"wallet": TEST_WALLET},
            timeout=TIMEOUT
        )
        assert retrieve_response.status_code == 200

        data = retrieve_response.json()
        # Verify we got back the data we uploaded
        assert len(data.keys()) >= files_count


class TestErrorHandling:
    """Test error handling and edge cases"""

    def test_invalid_wallet_address(self):
        """Test with invalid wallet address"""
        response = requests.get(
            f"{BASE_URL}/api/v1/integrations/installed",
            params={"wallet": "invalid-address"},
            timeout=TIMEOUT
        )
        # Should handle gracefully
        assert response.status_code in [200, 400]

    def test_missing_required_params(self):
        """Test endpoints with missing parameters"""
        response = requests.post(
            f"{BASE_URL}/api/v1/integrations/quickbooks/sync",
            json={},  # Missing wallet_address
            timeout=TIMEOUT
        )
        assert response.status_code in [400, 422]

    def test_malformed_json(self):
        """Test with malformed JSON"""
        response = requests.post(
            f"{BASE_URL}/api/v1/ai/chat",
            data="not-valid-json",
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT
        )
        assert response.status_code in [400, 422]


class TestPerformance:
    """Test performance and response times"""

    def test_marketplace_response_time(self):
        """Test marketplace endpoint response time"""
        start = time.time()
        response = requests.get(
            f"{BASE_URL}/api/v1/marketplace/tools",
            timeout=TIMEOUT
        )
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 2.0, f"Response took {duration}s (should be < 2s)"

    def test_health_response_time(self):
        """Test health endpoint response time"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=TIMEOUT)
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 0.5, f"Response took {duration}s (should be < 0.5s)"


# Pytest configuration
@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """Setup test environment before running tests"""
    # Check if backend is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code != 200:
            pytest.exit("Backend is not healthy. Please start the backend.")
    except requests.exceptions.ConnectionError:
        pytest.exit(
            "Cannot connect to backend. "
            "Please start backend with: cd backend && uvicorn main:app --reload"
        )

    yield

    # Cleanup after tests
    # (Add cleanup logic here if needed)


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
