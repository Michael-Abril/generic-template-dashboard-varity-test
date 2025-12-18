"""
Security Tests: Signature Validation and Cryptographic Security

Tests wallet signature validation, expiration enforcement,
replay attack prevention, and cryptographic security.
"""
import pytest
import time
from eth_account import Account
from eth_account.messages import encode_defunct
from app.services.encryption_service import encryption_service


class TestSignatureExpiration:
    """Test signature expiration enforcement"""

    def test_signature_expires_after_15_minutes(self):
        """Signatures must expire after 15 minutes (900 seconds)"""
        wallet = Account.create()
        old_timestamp = int(time.time()) - 901  # 15 minutes 1 second ago
        message = "expired_test"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {old_timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        with pytest.raises(ValueError, match="Signature expired"):
            encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=old_timestamp
            )

    def test_signature_valid_within_15_minutes(self):
        """Signatures must be valid within 15 minutes"""
        wallet = Account.create()
        recent_timestamp = int(time.time()) - 600  # 10 minutes ago
        message = "valid_test"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {recent_timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should not raise
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=recent_timestamp
        )

        assert result is True

    def test_signature_rejects_future_timestamps(self):
        """Signatures with future timestamps must be rejected"""
        wallet = Account.create()
        future_timestamp = int(time.time()) + 300  # 5 minutes in future
        message = "future_test"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {future_timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        with pytest.raises(ValueError, match="in the future"):
            encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=future_timestamp
            )

    def test_signature_allows_clock_skew(self):
        """Signatures must allow 60 seconds clock skew"""
        wallet = Account.create()
        # 30 seconds in future (within allowed clock skew)
        timestamp = int(time.time()) + 30
        message = "clock_skew_test"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should succeed (within 60s clock skew)
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=timestamp
        )

        assert result is True


class TestWalletAddressMismatch:
    """Test wallet address verification"""

    def test_signature_from_different_wallet_rejected(self):
        """Signature from wallet A cannot be used for wallet B"""
        wallet_a = Account.create()
        wallet_b = Account.create()
        timestamp = int(time.time())
        message = "mismatch_test"

        # Sign with wallet A
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet_a.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet_a.sign_message(message_hash)

        # Try to use for wallet B
        with pytest.raises(ValueError, match="mismatch"):
            encryption_service.validate_wallet_signature(
                wallet_address=wallet_b.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=timestamp
            )

    def test_signature_message_must_match(self):
        """Signature message must match the claimed message"""
        wallet = Account.create()
        timestamp = int(time.time())
        original_message = "original_message"
        fake_message = "fake_message"

        # Sign original message
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {original_message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Try to verify with different message
        with pytest.raises(ValueError):
            encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=fake_message,
                timestamp=timestamp
            )

    def test_malformed_signature_rejected(self):
        """Malformed signatures must be rejected"""
        wallet = Account.create()
        timestamp = int(time.time())
        message = "malformed_test"

        malformed_signatures = [
            "0x",  # Empty signature
            "0xdeadbeef",  # Too short
            "not_a_hex_string",  # Invalid hex
            "0x" + "00" * 64,  # Invalid signature (all zeros)
        ]

        for bad_sig in malformed_signatures:
            with pytest.raises((ValueError, Exception)):
                encryption_service.validate_wallet_signature(
                    wallet_address=wallet.address,
                    auth_signature=bad_sig,
                    message=message,
                    timestamp=timestamp
                )


class TestReplayAttackPrevention:
    """Test replay attack prevention"""

    def test_signature_cannot_be_reused_after_expiration(self):
        """Signature cannot be reused after it expires"""
        wallet = Account.create()
        timestamp = int(time.time())
        message = "replay_test"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # First use: should succeed
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=timestamp
        )
        assert result is True

        # Simulate time passing (16 minutes)
        import unittest.mock as mock
        with mock.patch('time.time', return_value=timestamp + 1000):
            # Replay after expiration: should fail
            with pytest.raises(ValueError, match="Signature expired"):
                encryption_service.validate_wallet_signature(
                    wallet_address=wallet.address,
                    auth_signature=signature.signature.hex(),
                    message=message,
                    timestamp=timestamp
                )

    def test_same_signature_different_operations_blocked(self):
        """
        Signature for one operation cannot be used for another
        (e.g., signature for 'retrieve' cannot be used for 'delete')
        """
        wallet = Account.create()
        timestamp = int(time.time())
        retrieve_message = "retrieve_file"

        # Sign for retrieve operation
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {retrieve_message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Valid for retrieve
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=retrieve_message,
            timestamp=timestamp
        )
        assert result is True

        # Invalid for delete (different message)
        with pytest.raises(ValueError):
            encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message="delete_file",
                timestamp=timestamp
            )


class TestCryptographicSecurity:
    """Test cryptographic signature security"""

    def test_eip191_signature_format(self):
        """Signatures must follow EIP-191 format"""
        wallet = Account.create()
        timestamp = int(time.time())
        message = "eip191_test"

        # Correct EIP-191 format
        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should succeed
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=message,
            timestamp=timestamp
        )
        assert result is True

    def test_signature_uniqueness(self):
        """Each signature must be unique (different timestamps)"""
        wallet = Account.create()
        message = "uniqueness_test"

        # Generate two signatures at different times
        timestamp1 = int(time.time())
        full_message1 = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp1}\n"
            f"Message: {message}"
        )
        message_hash1 = encode_defunct(text=full_message1)
        signature1 = wallet.sign_message(message_hash1)

        time.sleep(1)

        timestamp2 = int(time.time())
        full_message2 = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp2}\n"
            f"Message: {message}"
        )
        message_hash2 = encode_defunct(text=full_message2)
        signature2 = wallet.sign_message(message_hash2)

        # Signatures must be different
        assert signature1.signature.hex() != signature2.signature.hex()

        # Both must be valid
        result1 = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature1.signature.hex(),
            message=message,
            timestamp=timestamp1
        )

        result2 = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature2.signature.hex(),
            message=message,
            timestamp=timestamp2
        )

        assert result1 is True
        assert result2 is True

    def test_signature_with_special_characters(self):
        """Signatures must work with special characters in message"""
        wallet = Account.create()
        timestamp = int(time.time())
        special_message = "test_with_!@#$%^&*()_+-=[]{}|;':\",./<>?"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {special_message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should succeed
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=special_message,
            timestamp=timestamp
        )
        assert result is True

    def test_signature_with_unicode(self):
        """Signatures must work with Unicode characters"""
        wallet = Account.create()
        timestamp = int(time.time())
        unicode_message = "test_with_中文_русский_العربية_🔒"

        full_message = (
            f"Varity Access Request\n"
            f"Wallet: {wallet.address.lower()}\n"
            f"Timestamp: {timestamp}\n"
            f"Message: {unicode_message}"
        )
        message_hash = encode_defunct(text=full_message)
        signature = wallet.sign_message(message_hash)

        # Should succeed
        result = encryption_service.validate_wallet_signature(
            wallet_address=wallet.address,
            auth_signature=signature.signature.hex(),
            message=unicode_message,
            timestamp=timestamp
        )
        assert result is True


class TestSignatureConcurrency:
    """Test signature validation under concurrent load"""

    def test_concurrent_signature_validation(self):
        """Signature validation must be thread-safe"""
        import concurrent.futures

        wallet = Account.create()
        message = "concurrent_test"

        def validate_signature():
            timestamp = int(time.time())
            full_message = (
                f"Varity Access Request\n"
                f"Wallet: {wallet.address.lower()}\n"
                f"Timestamp: {timestamp}\n"
                f"Message: {message}"
            )
            message_hash = encode_defunct(text=full_message)
            signature = wallet.sign_message(message_hash)

            return encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=timestamp
            )

        # Run 100 concurrent validations
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(validate_signature) for _ in range(100)]
            results = [f.result() for f in futures]

        # All should succeed
        assert all(results)
        assert len(results) == 100

    def test_different_wallets_concurrent(self):
        """Multiple wallets can validate signatures concurrently"""
        import concurrent.futures

        wallets = [Account.create() for _ in range(10)]
        message = "multi_wallet_test"

        def validate_for_wallet(wallet):
            timestamp = int(time.time())
            full_message = (
                f"Varity Access Request\n"
                f"Wallet: {wallet.address.lower()}\n"
                f"Timestamp: {timestamp}\n"
                f"Message: {message}"
            )
            message_hash = encode_defunct(text=full_message)
            signature = wallet.sign_message(message_hash)

            return encryption_service.validate_wallet_signature(
                wallet_address=wallet.address,
                auth_signature=signature.signature.hex(),
                message=message,
                timestamp=timestamp
            )

        # Validate signatures for all wallets concurrently
        with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(validate_for_wallet, w) for w in wallets]
            results = [f.result() for f in futures]

        # All should succeed
        assert all(results)
        assert len(results) == 10
