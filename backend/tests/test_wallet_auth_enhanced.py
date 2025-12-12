"""
Tests for Enhanced Wallet Authentication

Tests wallet signature verification, session management, and multi-wallet support.
"""
import pytest
import time
from unittest.mock import Mock, patch
from eth_account import Account
from eth_account.messages import encode_defunct

from app.services.wallet_session_service import wallet_session_service, WalletSession
from app.middleware.wallet_auth import WalletAuthMiddleware


class TestWalletSessionService:
    """Test wallet session management"""

    def setup_method(self):
        """Setup test fixtures"""
        # Create test wallet
        self.test_account = Account.create()
        self.wallet_address = self.test_account.address

    def test_generate_auth_message(self):
        """Test auth message generation"""
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)

        # Verify message format
        assert self.wallet_address.lower() in message
        assert "timestamp" in message.lower()
        assert "nonce" in message.lower()
        assert len(nonce) == 32  # 16 bytes hex

    def test_verify_signature_and_create_session(self):
        """Test signature verification and session creation"""
        # Generate auth message
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)

        # Sign message
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        # Create session
        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce,
            metadata={"test": True}
        )

        # Verify session
        assert session is not None
        assert session.wallet_address == self.wallet_address.lower()
        assert session.session_token is not None
        assert session.metadata.get("test") is True
        assert not session.is_expired()

    def test_invalid_signature_fails(self):
        """Test that invalid signatures are rejected"""
        # Generate auth message
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)

        # Use wrong signature
        wrong_account = Account.create()
        message_hash = encode_defunct(text=message)
        wrong_signature = wrong_account.sign_message(message_hash)

        # Try to create session
        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=wrong_signature.signature.hex(),
            message=message,
            nonce=nonce
        )

        # Should fail
        assert session is None

    def test_nonce_reuse_fails(self):
        """Test that nonces can only be used once"""
        # Generate auth message
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)

        # Sign message
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        # Create session (first attempt - should succeed)
        session1 = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce
        )
        assert session1 is not None

        # Try to reuse same nonce (should fail)
        session2 = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce
        )
        assert session2 is None

    def test_get_session(self):
        """Test session retrieval"""
        # Create session
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce
        )

        # Retrieve session
        retrieved = wallet_session_service.get_session(session.session_token)
        assert retrieved is not None
        assert retrieved.wallet_address == session.wallet_address
        assert retrieved.session_token == session.session_token

    def test_invalidate_session(self):
        """Test session invalidation"""
        # Create session
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce
        )

        # Invalidate session
        wallet_session_service.invalidate_session(session.session_token)

        # Try to retrieve (should fail)
        retrieved = wallet_session_service.get_session(session.session_token)
        assert retrieved is None

    def test_refresh_session(self):
        """Test session refresh"""
        # Create session
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce
        )

        original_expires = session.expires_at

        # Wait a moment
        time.sleep(1)

        # Refresh session
        refreshed = wallet_session_service.refresh_session(session.session_token)
        assert refreshed is not None
        assert refreshed.expires_at > original_expires

    def test_multi_wallet_support(self):
        """Test adding multiple wallets to session"""
        # Create first wallet session
        message1, nonce1 = wallet_session_service.generate_auth_message(self.wallet_address)
        message_hash1 = encode_defunct(text=message1)
        signature1 = self.test_account.sign_message(message_hash1)

        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature1.signature.hex(),
            message=message1,
            nonce=nonce1
        )

        # Create second wallet
        second_account = Account.create()
        second_wallet = second_account.address

        # Generate auth for second wallet
        message2, nonce2 = wallet_session_service.generate_auth_message(second_wallet)
        message_hash2 = encode_defunct(text=message2)
        signature2 = second_account.sign_message(message_hash2)

        # Add second wallet to session
        success = wallet_session_service.add_wallet_to_session(
            session_token=session.session_token,
            new_wallet_address=second_wallet,
            signature=signature2.signature.hex(),
            message=message2,
            nonce=nonce2
        )

        assert success is True

        # Verify session has both wallets
        updated_session = wallet_session_service.get_session(session.session_token)
        assert second_wallet.lower() in updated_session.metadata.get("wallets", [])

    def test_session_limit_enforcement(self):
        """Test that session limit is enforced"""
        # Create more than MAX_SESSIONS_PER_WALLET sessions
        sessions = []

        for i in range(wallet_session_service.MAX_SESSIONS_PER_WALLET + 2):
            message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
            message_hash = encode_defunct(text=message)
            signature = self.test_account.sign_message(message_hash)

            session = wallet_session_service.verify_signature_and_create_session(
                wallet_address=self.wallet_address,
                signature=signature.signature.hex(),
                message=message,
                nonce=nonce
            )
            sessions.append(session)
            time.sleep(0.1)  # Small delay to ensure different timestamps

        # Get all active sessions
        active_sessions = wallet_session_service.get_wallet_sessions(self.wallet_address)

        # Should not exceed max limit
        assert len(active_sessions) <= wallet_session_service.MAX_SESSIONS_PER_WALLET

    def test_get_wallet_sessions(self):
        """Test getting all sessions for a wallet"""
        # Create multiple sessions
        sessions = []
        for i in range(3):
            message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
            message_hash = encode_defunct(text=message)
            signature = self.test_account.sign_message(message_hash)

            session = wallet_session_service.verify_signature_and_create_session(
                wallet_address=self.wallet_address,
                signature=signature.signature.hex(),
                message=message,
                nonce=nonce
            )
            sessions.append(session)

        # Get all sessions
        all_sessions = wallet_session_service.get_wallet_sessions(self.wallet_address)

        # Verify count
        assert len(all_sessions) >= 3

    def test_invalidate_all_sessions(self):
        """Test invalidating all sessions for a wallet"""
        # Create multiple sessions
        for i in range(3):
            message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
            message_hash = encode_defunct(text=message)
            signature = self.test_account.sign_message(message_hash)

            wallet_session_service.verify_signature_and_create_session(
                wallet_address=self.wallet_address,
                signature=signature.signature.hex(),
                message=message,
                nonce=nonce
            )

        # Invalidate all
        wallet_session_service.invalidate_all_sessions(self.wallet_address)

        # Verify no active sessions
        active_sessions = wallet_session_service.get_wallet_sessions(self.wallet_address)
        assert len(active_sessions) == 0


class TestWalletAuthMiddleware:
    """Test wallet authentication middleware"""

    def test_verify_signature(self):
        """Test signature verification method"""
        # Create test account
        account = Account.create()
        wallet_address = account.address
        message = "Test message"

        # Sign message
        message_hash = encode_defunct(text=message)
        signature = account.sign_message(message_hash)

        # Verify signature
        is_valid = WalletAuthMiddleware.verify_signature(
            wallet_address=wallet_address,
            signature=signature.signature.hex(),
            message=message
        )

        assert is_valid is True

    def test_invalid_signature_rejected(self):
        """Test that invalid signatures are rejected"""
        # Create two accounts
        account1 = Account.create()
        account2 = Account.create()
        message = "Test message"

        # Sign with account1
        message_hash = encode_defunct(text=message)
        signature = account1.sign_message(message_hash)

        # Try to verify with account2's address (should fail)
        is_valid = WalletAuthMiddleware.verify_signature(
            wallet_address=account2.address,
            signature=signature.signature.hex(),
            message=message
        )

        assert is_valid is False


class TestAuthenticationFlow:
    """Test complete authentication flow"""

    def setup_method(self):
        """Setup test fixtures"""
        self.test_account = Account.create()
        self.wallet_address = self.test_account.address

    def test_complete_login_flow(self):
        """Test complete login flow from message generation to session creation"""
        # Step 1: Generate auth message
        message, nonce = wallet_session_service.generate_auth_message(self.wallet_address)
        assert message is not None
        assert nonce is not None

        # Step 2: Sign message (simulating frontend wallet signing)
        message_hash = encode_defunct(text=message)
        signature = self.test_account.sign_message(message_hash)

        # Step 3: Create session with signature
        session = wallet_session_service.verify_signature_and_create_session(
            wallet_address=self.wallet_address,
            signature=signature.signature.hex(),
            message=message,
            nonce=nonce,
            metadata={
                "user_agent": "pytest",
                "ip_address": "127.0.0.1"
            }
        )

        # Verify session created successfully
        assert session is not None
        assert session.wallet_address == self.wallet_address.lower()
        assert session.session_token is not None
        assert len(session.session_token) == 64  # SHA256 hash
        assert not session.is_expired()
        assert session.metadata.get("user_agent") == "pytest"

        # Step 4: Verify session can be retrieved
        retrieved = wallet_session_service.get_session(session.session_token)
        assert retrieved is not None
        assert retrieved.wallet_address == session.wallet_address

        # Step 5: Logout
        wallet_session_service.invalidate_session(session.session_token)

        # Step 6: Verify session is invalidated
        final_check = wallet_session_service.get_session(session.session_token)
        assert final_check is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
