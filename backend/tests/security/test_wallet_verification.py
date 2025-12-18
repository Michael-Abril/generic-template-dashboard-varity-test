"""
Security Tests: Wallet Verification and Multi-Tenant Isolation

Tests wallet ownership verification for file operations to prevent
unauthorized access and ensure strict multi-tenant isolation.
"""
import pytest
import time
from eth_account import Account
from eth_account.messages import encode_defunct


class TestWalletVerification:
    """Test wallet ownership verification for all file operations"""

    @pytest.fixture
    def wallet_a(self):
        """Customer A's wallet"""
        return Account.create()

    @pytest.fixture
    def wallet_b(self):
        """Customer B's wallet (different from A)"""
        return Account.create()

    @pytest.fixture
    def valid_signature(self, wallet_a):
        """Generate valid signature for wallet A"""
        timestamp = int(time.time())
        message = "retrieve_file"
        wallet = wallet_a.address.lower()

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )

        message_hash = encode_defunct(text=full_message)
        signature = wallet_a.sign_message(message_hash)

        return {
            "signature": signature.signature.hex(),
            "message": message,
            "timestamp": timestamp
        }

    def test_customer_a_cannot_access_customer_b_file(
        self,
        client,
        wallet_a,
        wallet_b,
        valid_signature
    ):
        """
        CRITICAL: Test multi-tenant isolation
        Customer A cannot access Customer B's files
        """
        # Customer B uploads a file
        response_upload = client.post(
            "/api/v1/storage/upload",
            json={
                "customer_wallet": wallet_b.address,
                "integration": "test",
                "data_type": "confidential",
                "data": {"secret": "customer_b_secret_data"},
                "metadata": {"owner": "Customer B"}
            }
        )
        assert response_upload.status_code == 200
        cid = response_upload.json()["cid"]

        # Customer A tries to retrieve Customer B's file
        response_retrieve = client.post(
            "/api/v1/storage/retrieve",
            json={
                "cid": cid,
                "customer_wallet": wallet_a.address,
                "auth_signature": valid_signature
            }
        )

        # Should be rejected with 403 Forbidden
        assert response_retrieve.status_code == 403
        assert "Access denied" in response_retrieve.json()["detail"]
        assert wallet_a.address.lower() in response_retrieve.json()["detail"].lower()

    def test_customer_a_can_access_own_file(
        self,
        client,
        wallet_a,
        valid_signature
    ):
        """
        Test legitimate access: Customer A can access their own file
        """
        # Customer A uploads a file
        response_upload = client.post(
            "/api/v1/storage/upload",
            json={
                "customer_wallet": wallet_a.address,
                "integration": "test",
                "data_type": "documents",
                "data": {"content": "my_data"},
                "metadata": {"owner": "Customer A"}
            }
        )
        assert response_upload.status_code == 200
        cid = response_upload.json()["cid"]

        # Customer A retrieves their own file
        response_retrieve = client.post(
            "/api/v1/storage/retrieve",
            json={
                "cid": cid,
                "customer_wallet": wallet_a.address,
                "auth_signature": valid_signature
            }
        )

        # Should succeed
        assert response_retrieve.status_code == 200
        assert response_retrieve.json()["success"] is True
        assert response_retrieve.json()["data"]["content"] == "my_data"

    def test_unauthorized_delete_blocked(
        self,
        client,
        wallet_a,
        wallet_b
    ):
        """
        Test delete protection: Customer A cannot delete Customer B's file
        """
        # Customer B uploads a file
        response_upload = client.post(
            "/api/v1/storage/upload",
            json={
                "customer_wallet": wallet_b.address,
                "integration": "test",
                "data_type": "important",
                "data": {"document": "important_data"}
            }
        )
        cid = response_upload.json()["cid"]

        # Generate signature for wallet A
        timestamp = int(time.time())
        message = "delete_file"
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet_a.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet_a.sign_message(message_hash)

        # Customer A tries to delete Customer B's file
        response_delete = client.delete(
            f"/api/v1/storage/{cid}",
            params={"customer_wallet": wallet_a.address},
            json={
                "signature": signature.signature.hex(),
                "message": message,
                "timestamp": timestamp
            }
        )

        # Should be rejected with 403
        assert response_delete.status_code == 403
        assert "does not own this file" in response_delete.json()["detail"]

    def test_file_list_isolation(
        self,
        client,
        wallet_a,
        wallet_b
    ):
        """
        Test file listing isolation: Customers only see their own files
        """
        # Customer A uploads files
        for i in range(3):
            client.post(
                "/api/v1/storage/upload",
                json={
                    "customer_wallet": wallet_a.address,
                    "integration": "test",
                    "data_type": f"doc_{i}",
                    "data": {"index": i}
                }
            )

        # Customer B uploads files
        for i in range(2):
            client.post(
                "/api/v1/storage/upload",
                json={
                    "customer_wallet": wallet_b.address,
                    "integration": "test",
                    "data_type": f"doc_{i}",
                    "data": {"index": i}
                }
            )

        # Customer A lists their files
        response_a = client.post(
            "/api/v1/storage/list",
            json={
                "customer_wallet": wallet_a.address,
                "limit": 100
            }
        )

        # Customer B lists their files
        response_b = client.post(
            "/api/v1/storage/list",
            json={
                "customer_wallet": wallet_b.address,
                "limit": 100
            }
        )

        # Verify isolation
        assert response_a.json()["count"] == 3
        assert response_b.json()["count"] == 2

        # Verify no cross-contamination
        files_a = response_a.json()["files"]
        files_b = response_b.json()["files"]

        for file in files_a:
            assert file["metadata"]["customer_wallet"] == wallet_a.address.lower()

        for file in files_b:
            assert file["metadata"]["customer_wallet"] == wallet_b.address.lower()

    def test_audit_log_unauthorized_attempt(
        self,
        client,
        wallet_a,
        wallet_b,
        caplog
    ):
        """
        Test audit logging: Unauthorized access attempts are logged
        """
        # Customer B uploads file
        response_upload = client.post(
            "/api/v1/storage/upload",
            json={
                "customer_wallet": wallet_b.address,
                "integration": "test",
                "data_type": "secret",
                "data": {"classified": True}
            }
        )
        cid = response_upload.json()["cid"]

        # Customer A tries to access
        timestamp = int(time.time())
        message = "retrieve_file"
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet_a.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet_a.sign_message(message_hash)

        response = client.post(
            "/api/v1/storage/retrieve",
            json={
                "cid": cid,
                "customer_wallet": wallet_a.address,
                "auth_signature": {
                    "signature": signature.signature.hex(),
                    "message": message,
                    "timestamp": timestamp
                }
            }
        )

        # Should fail
        assert response.status_code == 403

        # Check audit log
        assert "UNAUTHORIZED FILE ACCESS ATTEMPT" in caplog.text
        assert cid in caplog.text
        assert wallet_a.address.lower() in caplog.text.lower()
        assert wallet_b.address.lower() in caplog.text.lower()

    def test_concurrent_access_isolation(
        self,
        client,
        wallet_a,
        wallet_b
    ):
        """
        Test concurrent operations maintain isolation
        """
        import concurrent.futures

        # Upload files for both customers
        cids_a = []
        cids_b = []

        for i in range(5):
            resp_a = client.post(
                "/api/v1/storage/upload",
                json={
                    "customer_wallet": wallet_a.address,
                    "integration": "test",
                    "data_type": f"concurrent_{i}",
                    "data": {"customer": "A", "index": i}
                }
            )
            cids_a.append(resp_a.json()["cid"])

            resp_b = client.post(
                "/api/v1/storage/upload",
                json={
                    "customer_wallet": wallet_b.address,
                    "integration": "test",
                    "data_type": f"concurrent_{i}",
                    "data": {"customer": "B", "index": i}
                }
            )
            cids_b.append(resp_b.json()["cid"])

        # Try concurrent unauthorized access
        def try_access(wallet, cid):
            timestamp = int(time.time())
            message = "retrieve_file"
            full_message = (
                f"Varity Access Request\n"
                f"Wallet: {wallet.address.lower()}\n"
                f"Timestamp: {timestamp}\n"
                f"Message: {message}"
            )
            message_hash = encode_defunct(text=full_message)
            signature = wallet.sign_message(message_hash)

            return client.post(
                "/api/v1/storage/retrieve",
                json={
                    "cid": cid,
                    "customer_wallet": wallet.address,
                    "auth_signature": {
                        "signature": signature.signature.hex(),
                        "message": message,
                        "timestamp": timestamp
                    }
                }
            )

        # Customer A tries to access all of Customer B's files concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            futures = [
                executor.submit(try_access, wallet_a, cid)
                for cid in cids_b
            ]

            results = [f.result() for f in futures]

        # All should be rejected
        for result in results:
            assert result.status_code == 403
            assert "Access denied" in result.json()["detail"]


class TestSignatureValidation:
    """Test signature validation security"""

    def test_expired_signature_rejected(
        self,
        client,
        encryption_service
    ):
        """
        Test signature expiration: Signatures older than 15 minutes are rejected
        """
        wallet = Account.create()
        old_timestamp = int(time.time()) - 1000  # 16+ minutes ago
        message = "test_expired"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {old_timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should raise ValueError for expired signature
        with pytest.raises(ValueError, match="Signature expired"):
            await encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=old_timestamp
            )

    def test_future_signature_rejected(
        self,
        client,
        encryption_service
    ):
        """
        Test future timestamp rejection: Signatures with future timestamps are rejected
        """
        wallet = Account.create()
        future_timestamp = int(time.time()) + 300  # 5 minutes in future
        message = "test_future"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {future_timestamp}\n"
            f"Message: {message}"
            )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should raise ValueError for future timestamp
        with pytest.raises(ValueError, match="in the future"):
            await encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=future_timestamp
            )

    def test_wrong_wallet_signature_rejected(
        self,
        encryption_service
    ):
        """
        Test wallet mismatch: Signature from wallet A cannot be used for wallet B
        """
        wallet_a = Account.create()
        wallet_b = Account.create()
        timestamp = int(time.time())
        message = "test_mismatch"

        # Sign with wallet A
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet_a.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet_a.sign_message(message_hash)

        # Try to use wallet A's signature for wallet B
        with pytest.raises(ValueError, match="mismatch"):
            await encryption_service.validate_wallet_signature(
                wallet_address=wallet_b.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=timestamp
            )

    def test_valid_signature_accepted(
        self,
        encryption_service
    ):
        """
        Test valid signature acceptance
        """
        wallet = Account.create()
        timestamp = int(time.time())
        message = "test_valid"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should succeed
        result = await encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=timestamp
        )

        assert result is True

    def test_replay_attack_prevention(
        self,
        encryption_service
    ):
        """
        Test replay attack prevention: Same signature cannot be reused after expiration
        """
        wallet = Account.create()
        timestamp = int(time.time())
        message = "test_replay"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # First use: should succeed
        result1 = await encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=timestamp
        )
        assert result1 is True

        # Simulate time passing (16 minutes)
        import unittest.mock as mock
        with mock.patch('time.time', return_value=timestamp + 1000):
            # Second use after expiration: should fail
            with pytest.raises(ValueError, match="Signature expired"):
                await encryption_service.validate_wallet_signature(
                    wallet_address=wallet.address,
                    auth_signature=signature.signature.hex(),
                    message=message,
                    timestamp=timestamp
                )
