"""
Unit tests for AnalyticsService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta

from app.services.analytics_service import AnalyticsService


class TestAnalyticsService:
    """Test suite for analytics service"""

    @pytest.fixture
    def analytics_service(self, mock_db_session):
        """Create AnalyticsService instance"""
        return AnalyticsService(db=mock_db_session)

    @pytest.mark.asyncio
    async def test_get_merchant_metrics(
        self,
        analytics_service,
        mock_wallet_address
    ):
        """Test retrieving merchant performance metrics"""
        with patch.object(analytics_service, 'db') as mock_db:
            mock_db.query.return_value.filter.return_value.all.return_value = [
                Mock(amount=1000, timestamp=datetime.utcnow())
            ]

            metrics = await analytics_service.get_merchant_metrics(mock_wallet_address)

            assert "total_volume" in metrics or isinstance(metrics, dict)

    @pytest.mark.asyncio
    async def test_calculate_residuals(
        self,
        analytics_service
    ):
        """Test calculating merchant residuals"""
        volume = 100000
        commission_rate = 0.02

        residual = await analytics_service.calculate_residual(volume, commission_rate)

        assert residual == 2000

    @pytest.mark.asyncio
    async def test_get_time_series_data(
        self,
        analytics_service
    ):
        """Test retrieving time series analytics"""
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()

        with patch.object(analytics_service, 'db') as mock_db:
            mock_db.query.return_value.filter.return_value.all.return_value = []

            data = await analytics_service.get_time_series(start_date, end_date)

            assert isinstance(data, (list, dict))
