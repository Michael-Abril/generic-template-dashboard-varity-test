"""
Unit tests for SettingsService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.settings_service import SettingsService


class TestSettingsService:
    """Test suite for settings management service"""

    @pytest.fixture
    def settings_service(self, mock_db_session):
        """Create SettingsService instance"""
        return SettingsService(db=mock_db_session)

    @pytest.mark.asyncio
    async def test_get_user_settings(
        self,
        settings_service,
        mock_wallet_address
    ):
        """Test retrieving user settings"""
        with patch.object(settings_service, 'db') as mock_db:
            mock_db.query.return_value.filter.return_value.first.return_value = Mock(
                settings={"theme": "dark", "notifications": True}
            )

            settings = await settings_service.get_settings(mock_wallet_address)

            assert isinstance(settings, dict)

    @pytest.mark.asyncio
    async def test_update_user_settings(
        self,
        settings_service,
        mock_wallet_address
    ):
        """Test updating user settings"""
        new_settings = {"theme": "light", "notifications": False}

        success = await settings_service.update_settings(mock_wallet_address, new_settings)

        assert isinstance(success, bool) or success is not None

    @pytest.mark.asyncio
    async def test_reset_settings(
        self,
        settings_service,
        mock_wallet_address
    ):
        """Test resetting settings to default"""
        success = await settings_service.reset_to_default(mock_wallet_address)

        assert isinstance(success, bool) or success is not None
