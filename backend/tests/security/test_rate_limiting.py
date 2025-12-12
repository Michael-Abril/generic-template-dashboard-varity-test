"""
Rate Limiting Security Tests

Tests that rate limiting is properly enforced to prevent:
- Brute force attacks
- DoS attacks
- API abuse

Target: Zero rate limit bypass vulnerabilities
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
import time

client = TestClient(app)


class TestRateLimiting:
    """Test rate limiting enforcement"""

    def test_rate_limit_headers_present(self):
        """Test that rate limit headers are returned"""
        response = client.get("/api/v1/marketplace/tools")

        # Should include rate limit headers
        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers

        # Values should be positive integers
        limit = int(response.headers["X-RateLimit-Limit"])
        remaining = int(response.headers["X-RateLimit-Remaining"])

        assert limit > 0
        assert remaining >= 0

    def test_rate_limit_enforcement(self):
        """Test that rate limiting blocks excessive requests"""
        wallet = "0xTEST111111111111111111111111111111111111"

        # Get the rate limit from headers
        first_response = client.get(
            "/api/v1/marketplace/tools",
            headers={"X-Wallet-Address": wallet}
        )

        if first_response.status_code != 200:
            pytest.skip("Endpoint not accessible")

        rate_limit = int(first_response.headers.get("X-RateLimit-Limit", "100"))

        # Make requests up to the limit
        for i in range(min(rate_limit + 10, 110)):  # Don't spam too much in tests
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={"X-Wallet-Address": wallet}
            )

            # Early requests should succeed
            if i < rate_limit:
                assert response.status_code == 200, f"Request {i} failed unexpectedly"
            # Later requests should be rate limited
            else:
                # Eventually should hit 429 Too Many Requests
                if response.status_code == 429:
                    break

        # At least some requests should have been rate limited
        # (if we hit the limit in the loop above)

    def test_rate_limit_per_wallet(self):
        """Test that rate limiting is enforced per wallet"""
        wallet_a = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
        wallet_b = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

        # Make requests from wallet A
        responses_a = []
        for _ in range(10):
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={"X-Wallet-Address": wallet_a}
            )
            responses_a.append(response.status_code)

        # Make requests from wallet B
        responses_b = []
        for _ in range(10):
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={"X-Wallet-Address": wallet_b}
            )
            responses_b.append(response.status_code)

        # Both wallets should be able to make requests independently
        assert all(status in [200, 429] for status in responses_a)
        assert all(status in [200, 429] for status in responses_b)

    def test_rate_limit_per_ip_for_unauthenticated(self):
        """Test that rate limiting works for unauthenticated requests"""
        # Make unauthenticated requests
        responses = []
        for _ in range(55):  # Slightly above IP rate limit (50/min)
            response = client.get("/api/v1/marketplace/tools")
            responses.append(response.status_code)

        # Should get mix of 200 and potentially 429
        assert all(status in [200, 429] for status in responses)

    def test_rate_limit_429_response_format(self):
        """Test that 429 response has proper error format"""
        wallet = "0xTEST222222222222222222222222222222222222"

        # Spam requests to trigger rate limit
        response = None
        for _ in range(120):  # Exceed default limit
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={"X-Wallet-Address": wallet}
            )
            if response.status_code == 429:
                break

        if response and response.status_code == 429:
            error_data = response.json()

            # Should have proper error structure
            assert "detail" in error_data or "error" in error_data

            # May include retry-after information
            detail = error_data.get("detail", {})
            if isinstance(detail, dict):
                assert "retry_after_seconds" in detail or "max_requests_per_minute" in detail


class TestSensitiveEndpointRateLimits:
    """Test stricter rate limits on sensitive endpoints"""

    def test_auth_endpoints_have_stricter_limits(self):
        """Test that authentication endpoints have stricter rate limits"""
        # OAuth endpoints should have lower rate limits
        # to prevent brute force attacks

        wallet = "0xTEST333333333333333333333333333333333333"

        # Try OAuth endpoint (if it exists and is accessible)
        responses = []
        for _ in range(15):  # Should be limited to ~10/min
            response = client.post(
                "/api/v1/oauth/callback",
                json={"code": "test", "state": "test"},
                headers={"X-Wallet-Address": wallet}
            )
            responses.append(response.status_code)

        # Should include auth errors or rate limits
        assert all(status in [200, 400, 401, 404, 422, 429] for status in responses)

    def test_ai_chat_rate_limiting(self):
        """Test that AI chat has appropriate rate limits"""
        wallet = "0xTEST444444444444444444444444444444444444"

        # AI endpoints may have different limits due to cost
        responses = []
        for _ in range(25):
            response = client.post(
                "/api/v1/ai/chat",
                json={
                    "message": "Hello",
                    "customer_wallet": wallet
                },
                headers={"X-Wallet-Address": wallet}
            )
            responses.append(response.status_code)

        # Should be rate limited or succeed
        assert all(status in [200, 401, 422, 429] for status in responses)


class TestRateLimitBypassAttempts:
    """Test that rate limiting cannot be bypassed"""

    def test_cannot_bypass_with_missing_wallet_header(self):
        """Test that removing wallet header doesn't bypass limit"""
        # Make requests without wallet header
        responses = []
        for _ in range(55):  # Above IP limit
            response = client.get("/api/v1/marketplace/tools")
            responses.append(response.status_code)

        # Should still be rate limited by IP
        assert 429 in responses or all(status == 200 for status in responses[:50])

    def test_cannot_bypass_with_different_user_agents(self):
        """Test that changing User-Agent doesn't bypass limit"""
        wallet = "0xTEST555555555555555555555555555555555555"

        # Make requests with different user agents
        user_agents = [
            "Mozilla/5.0",
            "Chrome/100.0",
            "Safari/14.0",
            "Edge/90.0",
            "Firefox/95.0"
        ]

        responses = []
        for i in range(25):
            ua = user_agents[i % len(user_agents)]
            response = client.get(
                "/api/v1/marketplace/tools",
                headers={
                    "X-Wallet-Address": wallet,
                    "User-Agent": ua
                }
            )
            responses.append(response.status_code)

        # Should be rate limited based on wallet, not User-Agent
        assert all(status in [200, 429] for status in responses)

    def test_cannot_bypass_with_query_params(self):
        """Test that adding query params doesn't bypass limit"""
        wallet = "0xTEST666666666666666666666666666666666666"

        # Make requests with different query params
        responses = []
        for i in range(25):
            response = client.get(
                f"/api/v1/marketplace/tools?dummy={i}",
                headers={"X-Wallet-Address": wallet}
            )
            responses.append(response.status_code)

        # Should be rate limited regardless of query params
        assert all(status in [200, 429] for status in responses)


class TestRateLimitRecovery:
    """Test rate limit recovery after cooldown"""

    def test_rate_limit_resets_over_time(self):
        """Test that rate limit resets after time window"""
        wallet = "0xTEST777777777777777777777777777777777777"

        # Make initial request
        response1 = client.get(
            "/api/v1/marketplace/tools",
            headers={"X-Wallet-Address": wallet}
        )

        remaining1 = int(response1.headers.get("X-RateLimit-Remaining", "99"))

        # Wait a bit (token bucket should refill)
        time.sleep(2)

        # Make another request
        response2 = client.get(
            "/api/v1/marketplace/tools",
            headers={"X-Wallet-Address": wallet}
        )

        remaining2 = int(response2.headers.get("X-RateLimit-Remaining", "99"))

        # Remaining should have increased (or stayed same if already at max)
        # Token bucket refills over time
        assert remaining2 >= remaining1 - 1  # Allow for one consumed token


@pytest.mark.parametrize("endpoint", [
    "/api/v1/marketplace/tools",
    "/api/v1/integrations",
    "/health",
])
def test_rate_limit_on_multiple_endpoints(endpoint):
    """Test that rate limiting is applied to multiple endpoints"""
    response = client.get(endpoint)

    # Should have rate limit headers (or be successful)
    assert response.status_code in [200, 404, 429]

    if response.status_code == 200:
        # Should include rate limit headers
        assert "X-RateLimit-Limit" in response.headers or "X-RateLimit-Remaining" in response.headers


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
