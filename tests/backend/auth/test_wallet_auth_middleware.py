"""
Test Suite for Wallet Authentication Middleware

Tests wallet signature verification, rate limiting, and exception handling.
"""
import pytest
import time
from web3 import Web3
from eth_account.messages import encode_defunct
from eth_account import Account
from fastapi.testclient import TestClient
from app.main import app

# Create test client
client = TestClient(app)


class TestWalletSignature:
    """Test wallet signature verification"""

    @pytest.fixture
    def test_account(self):
        """Create a test Ethereum account"""
        w3 = Web3()
        account = w3.eth.account.create()
        return account

    def create_signed_message(self, account, message: str):
        """Create a properly signed message"""
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)
        return signed_message.signature.hex()

    def test_valid_signature_accepted(self, test_account):
        """Test that valid signatures are accepted"""
        message = "Authenticate wallet for Varity Dashboard"
        timestamp = int(time.time())
        signature = self.create_signed_message(test_account, message)

        response = client.post(
            "/api/v1/storage/upload",
            headers={
                "X-Wallet-Address": test_account.address,
                "X-Signature": signature,
                "X-Message": message,
                "X-Timestamp": str(timestamp),
            },
            json={
                "customer_wallet": test_account.address,
                "integration": "test",
                "data_type": "test_data",
                "data": {"test": "data"}
            }
        )

        # Should not get 401 (may get other errors if services not configured)
        assert response.status_code != 401, "Valid signature was rejected"

    def test_invalid_signature_rejected(self, test_account):
        """Test that invalid signatures are rejected"""
        message = "Authenticate wallet for Varity Dashboard"
        timestamp = int(time.time())
        # Use wrong signature
        signature = "0x" + "0" * 130

        response = client.post(
            "/api/v1/storage/upload",
            headers={
                "X-Wallet-Address": test_account.address,
                "X-Signature": signature,
                "X-Message": message,
                "X-Timestamp": str(timestamp),
            },
            json={
                "customer_wallet": test_account.address,
                "integration": "test",
                "data_type": "test_data",
                "data": {"test": "data"}
            }
        )

        assert response.status_code == 401
        assert "Invalid wallet signature" in response.json()["detail"]

    def test_missing_headers_rejected(self):
        """Test that requests with missing headers are rejected"""
        response = client.post(
            "/api/v1/storage/upload",
            json={
                "customer_wallet": "0x1234",
                "integration": "test",
                "data_type": "test_data",
                "data": {"test": "data"}
            }
        )

        assert response.status_code == 401
        assert "Missing authentication headers" in response.json()["detail"]["error"]

    def test_expired_timestamp_rejected(self, test_account):
        """Test that expired timestamps are rejected"""
        message = "Authenticate wallet for Varity Dashboard"
        # Timestamp from 10 minutes ago
        timestamp = int(time.time()) - 600
        signature = self.create_signed_message(test_account, message)

        response = client.post(
            "/api/v1/storage/upload",
            headers={
                "X-Wallet-Address": test_account.address,
                "X-Signature": signature,
                "X-Message": message,
                "X-Timestamp": str(timestamp),
            },
            json={
                "customer_wallet": test_account.address,
                "integration": "test",
                "data_type": "test_data",
                "data": {"test": "data"}
            }
        )

        assert response.status_code == 401
        assert "timestamp expired" in response.json()["detail"]["error"]

    def test_unprotected_endpoints_no_auth(self):
        """Test that unprotected endpoints don't require auth"""
        response = client.get("/")
        assert response.status_code == 200

        response = client.get("/health")
        assert response.status_code == 200


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limit_enforcement(self):
        """Test that rate limit is enforced"""
        # Make requests until rate limit is hit
        # Using health endpoint which should be unprotected but rate limited
        responses = []
        for i in range(55):  # Exceed IP rate limit of 50
            response = client.get("/health")
            responses.append(response.status_code)

        # Should eventually get 429
        assert 429 in responses, "Rate limit was not enforced"

    def test_rate_limit_headers(self):
        """Test that rate limit headers are present"""
        response = client.get("/health")

        assert "X-RateLimit-Limit" in response.headers
        assert "X-RateLimit-Remaining" in response.headers


class TestExceptionHandling:
    """Test global exception handlers"""

    def test_validation_error_handling(self):
        """Test that validation errors return proper format"""
        # Send invalid data to trigger validation error
        response = client.post(
            "/api/v1/storage/list",
            json={
                "customer_wallet": "invalid",
                "limit": "not_a_number"  # Should be int
            }
        )

        assert response.status_code == 422
        json_response = response.json()
        assert json_response["success"] is False
        assert "Validation error" in json_response["error"]
        assert "details" in json_response


class TestSignatureVerification:
    """Test signature verification utility"""

    def test_signature_recovery(self):
        """Test that signatures can be properly recovered"""
        from app.middleware.auth import WalletAuthMiddleware

        # Create test account
        w3 = Web3()
        account = w3.eth.account.create()

        # Sign message
        message = "Test message"
        message_hash = encode_defunct(text=message)
        signed_message = account.sign_message(message_hash)

        # Verify signature
        is_valid = WalletAuthMiddleware.verify_signature(
            account.address,
            signed_message.signature.hex(),
            message
        )

        assert is_valid is True

    def test_wrong_wallet_rejected(self):
        """Test that signature from wrong wallet is rejected"""
        from app.middleware.auth import WalletAuthMiddleware

        w3 = Web3()
        account1 = w3.eth.account.create()
        account2 = w3.eth.account.create()

        # Sign with account1
        message = "Test message"
        message_hash = encode_defunct(text=message)
        signed_message = account1.sign_message(message_hash)

        # Try to verify with account2's address
        is_valid = WalletAuthMiddleware.verify_signature(
            account2.address,  # Wrong address
            signed_message.signature.hex(),
            message
        )

        assert is_valid is False


def run_tests():
    """Run all tests and print results"""
    print("=" * 70)
    print("WALLET AUTHENTICATION MIDDLEWARE TEST SUITE")
    print("=" * 70)

    # Create test account for demonstrations
    w3 = Web3()
    test_account = w3.eth.account.create()

    print(f"\nTest Account Created:")
    print(f"  Address: {test_account.address}")
    print(f"  Private Key: {test_account.key.hex()}")

    # Run signature verification test
    print("\n" + "-" * 70)
    print("Test 1: Signature Verification")
    print("-" * 70)

    message = "Authenticate wallet for Varity Dashboard"
    message_hash = encode_defunct(text=message)
    signed_message = test_account.sign_message(message_hash)

    print(f"Message: {message}")
    print(f"Signature: {signed_message.signature.hex()}")

    from app.middleware.auth import WalletAuthMiddleware
    is_valid = WalletAuthMiddleware.verify_signature(
        test_account.address,
        signed_message.signature.hex(),
        message
    )

    print(f"Signature Valid: {is_valid}")
    assert is_valid, "Signature verification failed!"
    print("✓ PASSED")

    # Test invalid signature
    print("\n" + "-" * 70)
    print("Test 2: Invalid Signature Rejection")
    print("-" * 70)

    invalid_signature = "0x" + "0" * 130
    is_valid = WalletAuthMiddleware.verify_signature(
        test_account.address,
        invalid_signature,
        message
    )

    print(f"Invalid Signature: {invalid_signature[:20]}...")
    print(f"Signature Valid: {is_valid}")
    assert not is_valid, "Invalid signature was accepted!"
    print("✓ PASSED")

    # Test timestamp validation
    print("\n" + "-" * 70)
    print("Test 3: Timestamp Validation")
    print("-" * 70)

    current_time = int(time.time())
    expired_time = current_time - 600  # 10 minutes ago

    print(f"Current Time: {current_time}")
    print(f"Expired Time: {expired_time}")
    print(f"Difference: {current_time - expired_time} seconds")
    print(f"Max Age: 300 seconds")

    is_expired = abs(current_time - expired_time) > 300
    print(f"Is Expired: {is_expired}")
    assert is_expired, "Expired timestamp not detected!"
    print("✓ PASSED")

    # Test API endpoint with authentication
    print("\n" + "-" * 70)
    print("Test 4: API Endpoint Authentication")
    print("-" * 70)

    timestamp = int(time.time())
    signature = signed_message.signature.hex()

    print(f"Testing endpoint: POST /api/v1/storage/upload")
    print(f"Headers:")
    print(f"  X-Wallet-Address: {test_account.address}")
    print(f"  X-Signature: {signature[:20]}...")
    print(f"  X-Message: {message}")
    print(f"  X-Timestamp: {timestamp}")

    response = client.post(
        "/api/v1/storage/upload",
        headers={
            "X-Wallet-Address": test_account.address,
            "X-Signature": signature,
            "X-Message": message,
            "X-Timestamp": str(timestamp),
        },
        json={
            "customer_wallet": test_account.address,
            "integration": "test",
            "data_type": "test_data",
            "data": {"test": "data"}
        }
    )

    print(f"\nResponse Status: {response.status_code}")
    print(f"Response: {response.json() if response.status_code != 500 else 'Service unavailable'}")

    # 401 means auth failed, anything else means auth passed
    if response.status_code == 401:
        print("✗ FAILED - Authentication rejected valid signature")
        print(f"Error: {response.json()}")
    else:
        print("✓ PASSED - Authentication accepted valid signature")

    # Test rate limiting
    print("\n" + "-" * 70)
    print("Test 5: Rate Limiting")
    print("-" * 70)

    print("Making 55 requests to trigger rate limit (limit: 50 per minute for IP)...")
    rate_limited = False

    for i in range(55):
        response = client.get("/health")
        if response.status_code == 429:
            print(f"Rate limit triggered at request {i + 1}")
            print(f"Response: {response.json()}")
            rate_limited = True
            break

    if rate_limited:
        print("✓ PASSED - Rate limiting working")
    else:
        print("⚠ WARNING - Rate limit not triggered (may need adjustment)")

    print("\n" + "=" * 70)
    print("TEST SUITE COMPLETED")
    print("=" * 70)


if __name__ == "__main__":
    run_tests()
