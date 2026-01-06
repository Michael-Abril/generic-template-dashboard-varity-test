"""
Unit tests for SyncService
Tests data synchronization across integrations
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.sync_service import SyncService


class TestSyncService:
    """Test suite for data synchronization service"""

    @pytest.fixture
    def sync_service(self):
        """Create SyncService instance"""
        return SyncService()

    @pytest.mark.asyncio
    async def test_sync_integration_data(
        self,
        sync_service,
        mock_wallet_address
    ):
        """Test syncing data from integration"""
        with patch('app.services.oauth_service.OAuthService.decrypt_token') as mock_decrypt:
            mock_decrypt.return_value = {"access_token": "token123"}

            with patch('httpx.AsyncClient') as mock_client:
                mock_response = AsyncMock()
                mock_response.status_code = 200
                mock_response.json.return_value = {"data": [{"id": 1, "name": "Item 1"}]}
                mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

                data = await sync_service.sync_integration(
                    wallet_address=mock_wallet_address,
                    integration="quickbooks",
                    data_type="invoices"
                )

                assert isinstance(data, (list, dict))

    @pytest.mark.asyncio
    async def test_schedule_sync(
        self,
        sync_service,
        mock_wallet_address
    ):
        """Test scheduling periodic sync"""
        sync_id = await sync_service.schedule_sync(
            wallet_address=mock_wallet_address,
            integration="salesforce",
            interval_minutes=60
        )

        assert sync_id is not None or isinstance(sync_id, str)

    @pytest.mark.asyncio
    async def test_get_sync_status(
        self,
        sync_service
    ):
        """Test getting sync status"""
        sync_id = "sync123"

        status = await sync_service.get_sync_status(sync_id)

        assert isinstance(status, dict) or status is None
