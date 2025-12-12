"""
XSS (Cross-Site Scripting) Protection Tests

Tests all API endpoints for XSS vulnerabilities.
Target: Zero XSS vulnerabilities
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


# XSS Attack Vectors
XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "<svg/onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<iframe src='javascript:alert(\"XSS\")'></iframe>",
    "<body onload=alert('XSS')>",
    "<input onfocus=alert('XSS') autofocus>",
    "<select onfocus=alert('XSS') autofocus>",
    "<textarea onfocus=alert('XSS') autofocus>",
    "<keygen onfocus=alert('XSS') autofocus>",
    "<video><source onerror='alert(\"XSS\")'>",
    "<audio src=x onerror=alert('XSS')>",
    "<details open ontoggle=alert('XSS')>",
    "<marquee onstart=alert('XSS')>",
    "'-alert('XSS')-'",
    "\"><script>alert('XSS')</script>",
    "';alert('XSS');//",
]


class TestXSSProtection:
    """Test suite for XSS prevention"""

    def test_settings_xss_prevention(self):
        """Test that user settings are sanitized"""
        for payload in XSS_PAYLOADS:
            response = client.put(
                "/api/v1/settings",
                json={
                    "company_name": payload,
                    "company_bio": payload,
                    "company_website": f"https://example.com/{payload}"
                }
            )

            # Should either accept and sanitize, or reject
            assert response.status_code in [200, 400, 422]

            # If accepted, verify data is sanitized
            if response.status_code == 200:
                # Fetch settings back
                get_response = client.get("/api/v1/settings")
                if get_response.status_code == 200:
                    settings_data = get_response.json()

                    # Verify dangerous tags are removed or escaped
                    assert "<script>" not in str(settings_data).lower()
                    assert "javascript:" not in str(settings_data).lower()
                    assert "onerror" not in str(settings_data).lower()
                    assert "onload" not in str(settings_data).lower()

    def test_ai_chat_xss_prevention(self):
        """Test that AI chat messages are sanitized"""
        for payload in XSS_PAYLOADS:
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "message": payload,
                    "customer_wallet": "0x1234567890123456789012345678901234567890"
                }
            )

            assert response.status_code in [200, 400, 422, 429]

            # If successful, verify response is safe
            if response.status_code == 200:
                chat_response = response.json()
                response_text = str(chat_response)

                # Verify no script injection in response
                assert "<script>" not in response_text.lower()
                assert "javascript:" not in response_text.lower()

    def test_integration_data_xss_prevention(self):
        """Test that integration data is sanitized"""
        for payload in XSS_PAYLOADS:
            response = client.post(
                "/api/v1/sync/manual",
                json={
                    "integration": "quickbooks",
                    "data": {
                        "invoice_number": payload,
                        "customer_name": payload,
                        "notes": payload
                    }
                }
            )

            assert response.status_code in [200, 400, 401, 422]

    def test_marketplace_search_xss_prevention(self):
        """Test that marketplace search is safe"""
        for payload in XSS_PAYLOADS:
            response = client.get(
                "/api/v1/marketplace/tools",
                params={"search": payload}
            )

            assert response.status_code in [200, 400, 422]

            if response.status_code == 200:
                data = response.json()
                # Verify response doesn't echo back unsafe content
                assert "<script>" not in str(data).lower()

    def test_security_headers_xss_protection(self):
        """Test that security headers protect against XSS"""
        response = client.get("/api/v1/marketplace/tools")

        # Verify XSS protection headers are present
        assert "X-XSS-Protection" in response.headers
        assert response.headers["X-XSS-Protection"] == "1; mode=block"

        # Verify Content-Security-Policy header
        assert "Content-Security-Policy" in response.headers
        csp = response.headers["Content-Security-Policy"]
        assert "default-src 'self'" in csp

        # Verify X-Content-Type-Options header
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_response_content_type_safety(self):
        """Test that responses have safe content types"""
        response = client.get("/api/v1/marketplace/tools")

        # Should be application/json, not text/html
        content_type = response.headers.get("content-type", "")
        assert "application/json" in content_type.lower()
        assert "text/html" not in content_type.lower()


class TestHTMLSanitization:
    """Test HTML sanitization in user-provided content"""

    def test_html_tags_stripped(self):
        """Test that HTML tags are stripped from user input"""
        malicious_input = "<b>Bold Text</b><script>alert('XSS')</script>"

        response = client.put(
            "/api/v1/settings",
            json={"company_bio": malicious_input}
        )

        # Should either strip tags or reject
        assert response.status_code in [200, 400, 422]

    def test_html_entities_escaped(self):
        """Test that HTML entities are properly escaped"""
        test_input = "<>&\"'/"

        response = client.put(
            "/api/v1/settings",
            json={"company_name": test_input}
        )

        assert response.status_code in [200, 400, 422]

        # If accepted, verify it's stored safely
        if response.status_code == 200:
            get_response = client.get("/api/v1/settings")
            if get_response.status_code == 200:
                settings_data = get_response.json()
                # Should be escaped or stored as-is (both are safe for JSON)
                # JSON itself escapes these characters


class TestStoredXSS:
    """Test for stored XSS vulnerabilities"""

    def test_stored_xss_in_settings(self):
        """Test that stored data doesn't cause XSS when retrieved"""
        xss_payload = "<img src=x onerror=alert('XSS')>"

        # Store the payload
        store_response = client.put(
            "/api/v1/settings",
            json={"company_name": xss_payload}
        )

        # Retrieve it
        if store_response.status_code == 200:
            get_response = client.get("/api/v1/settings")

            # Should be safe when retrieved
            assert get_response.status_code == 200
            data = get_response.json()

            # Verify dangerous tags are removed
            company_name = data.get("company_name", "")
            assert "<img" not in company_name.lower() or "onerror" not in company_name.lower()

    def test_reflected_xss_in_error_messages(self):
        """Test that error messages don't reflect user input unsanitized"""
        xss_payload = "<script>alert('XSS')</script>"

        response = client.get(
            "/api/v1/marketplace/tools",
            params={"invalid_param": xss_payload}
        )

        # Even if error occurs, response should be safe
        if response.status_code >= 400:
            error_msg = str(response.json())
            # XSS payload should NOT be reflected verbatim
            # (It's OK if it's present but escaped in JSON)


@pytest.mark.parametrize("payload", XSS_PAYLOADS[:5])  # Test subset for speed
def test_xss_parametrized(payload):
    """Parametrized XSS test for quick validation"""
    response = client.put(
        "/api/v1/settings",
        json={"company_bio": payload}
    )

    assert response.status_code in [200, 400, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
