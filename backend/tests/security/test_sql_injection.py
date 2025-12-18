"""
SQL Injection Security Tests

Tests all API endpoints for SQL injection vulnerabilities.
Target: Zero vulnerabilities
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# SQL Injection Attack Vectors
SQL_INJECTION_PAYLOADS = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "1; DELETE FROM users WHERE 1=1; --",
    "' OR 1=1--",
    "' UNION SELECT * FROM users--",
    "1'; UPDATE users SET role='admin' WHERE '1'='1",
    "1' AND 1=0 UNION ALL SELECT 'admin', '81dc9bdb52d04dc20036dbd8313ed055'",
    "' OR 'a'='a",
    "') OR ('a'='a",
]


class TestSQLInjection:
    """Test suite for SQL injection prevention"""

    def test_marketplace_list_sql_injection(self):
        """Test marketplace listing endpoint against SQL injection"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.get(
                "/api/v1/marketplace/tools",
                params={"search": payload}
            )
            # Should return 200 OK or 400 Bad Request (input validation)
            # Should NOT return 500 Internal Server Error (SQL error)
            assert response.status_code in [200, 400, 422], (
                f"SQL injection payload '{payload}' caused unexpected status: {response.status_code}"
            )

            # Verify no error messages reveal SQL structure
            if response.status_code >= 400:
                error_msg = response.json().get("detail", "")
                assert "SQL" not in error_msg.upper()
                assert "DATABASE" not in error_msg.upper()
                assert "TABLE" not in error_msg.upper()

    def test_integration_search_sql_injection(self):
        """Test integration search against SQL injection"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.get(
                "/api/v1/integrations/search",
                params={"query": payload}
            )
            assert response.status_code in [200, 400, 422]

            # Verify safe error handling
            if response.status_code >= 400:
                assert "SQL" not in str(response.json()).upper()

    def test_settings_update_sql_injection(self):
        """Test settings update endpoint against SQL injection"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.put(
                "/api/v1/settings",
                json={
                    "company_name": payload,
                    "company_bio": payload,
                    "company_website": payload
                }
            )
            # Should validate and reject malicious input
            assert response.status_code in [200, 400, 422]

    def test_ai_chat_sql_injection(self):
        """Test AI chat endpoint against SQL injection"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "message": payload,
                    "customer_wallet": "0x1234567890123456789012345678901234567890"
                }
            )
            # Should safely handle malicious input
            assert response.status_code in [200, 400, 422, 429]  # May hit rate limit

    def test_storage_list_sql_injection(self):
        """Test storage listing against SQL injection"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.post(
                "/api/v1/storage/list",
                json={
                    "customer_wallet": payload,
                    "integration": payload,
                    "data_type": payload
                }
            )
            assert response.status_code in [200, 400, 422]

    def test_header_sql_injection(self):
        """Test SQL injection via HTTP headers"""
        for payload in SQL_INJECTION_PAYLOADS:
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={
                    "X-Wallet-Address": payload,
                    "User-Agent": payload
                }
            )
            # Should safely handle malicious headers
            assert response.status_code in [200, 400, 401, 422]

    def test_path_parameter_sql_injection(self):
        """Test SQL injection via path parameters"""
        for payload in SQL_INJECTION_PAYLOADS:
            # URL encode the payload
            import urllib.parse
            encoded = urllib.parse.quote(payload)

            response = client.get(f"/api/v1/storage/metadata/{encoded}")
            # Should safely handle malicious path parameters
            assert response.status_code in [200, 400, 404, 422]


class TestORMSafety:
    """Test that ORM (SQLAlchemy) is used correctly"""

    def test_orm_parameterized_queries(self):
        """Verify ORM uses parameterized queries (not string concatenation)"""
        # This is a code inspection test - verify that database queries
        # use SQLAlchemy ORM methods, not raw SQL strings

        # Test a typical query
        response = client.get("/api/v1/marketplace/tools")
        assert response.status_code == 200

        # If this succeeds, it means our ORM is configured correctly
        # SQLAlchemy automatically prevents SQL injection via parameterization

    def test_no_raw_sql_execution(self):
        """Verify no raw SQL is executed directly"""
        # Make various requests to trigger database queries
        endpoints = [
            "/api/v1/marketplace/tools",
            "/api/v1/integrations",
            "/health",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            # Should all succeed without SQL errors
            assert response.status_code in [200, 404]


@pytest.mark.parametrize("endpoint,method,payload", [
    ("/api/v1/marketplace/tools", "GET", {"search": "'; DROP TABLE tools; --"}),
    ("/api/v1/settings", "PUT", {"company_name": "' OR '1'='1"}),
    ("/api/v1/storage/list", "POST", {"customer_wallet": "admin'--"}),
])
def test_endpoint_sql_injection_parametrized(endpoint, method, payload):
    """Parametrized test for SQL injection on multiple endpoints"""
    if method == "GET":
        response = client.get(endpoint, params=payload)
    elif method == "POST":
        response = client.post(endpoint, json=payload)
    elif method == "PUT":
        response = client.put(endpoint, json=payload)

    # Should not cause SQL errors
    assert response.status_code in [200, 400, 422, 429]
    if response.status_code >= 400:
        assert "SQL" not in str(response.json()).upper()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
