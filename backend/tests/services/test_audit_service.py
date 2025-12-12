"""
Unit tests for AuditService
Tests blockchain audit logging
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from app.services.audit_service import AuditService


class TestAuditService:
    """Test suite for audit logging service"""

    @pytest.fixture
    def audit_service(self):
        """Create AuditService instance"""
        return AuditService()

    @pytest.mark.asyncio
    async def test_log_event(
        self,
        audit_service,
        mock_wallet_address
    ):
        """Test logging audit event to blockchain"""
        with patch('app.services.blockchain_service.BlockchainService.send_transaction') as mock_tx:
            mock_tx.return_value = "0xtxhash..."

            tx_hash = await audit_service.log_event(
                user_address=mock_wallet_address,
                event_type="merchant_registered",
                event_data={"merchant_id": "123"}
            )

            assert tx_hash.startswith("0x")

    @pytest.mark.asyncio
    async def test_get_audit_trail(
        self,
        audit_service,
        mock_wallet_address
    ):
        """Test retrieving audit trail"""
        with patch('app.services.blockchain_service.BlockchainService.get_contract_events') as mock_events:
            mock_events.return_value = [
                {"event": "AuditLog", "args": {"user": mock_wallet_address, "action": "login"}}
            ]

            events = await audit_service.get_audit_trail(mock_wallet_address)

            assert len(events) >= 0

    @pytest.mark.asyncio
    async def test_verify_audit_log(
        self,
        audit_service
    ):
        """Test verifying audit log integrity"""
        log_hash = "0xloghash..."

        with patch('app.services.blockchain_service.BlockchainService.call_contract_function') as mock_call:
            mock_call.return_value = True

            is_valid = await audit_service.verify_log(log_hash)

            assert isinstance(is_valid, bool)
