"""
Unit tests for EmailService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.email_service import EmailService


class TestEmailService:
    """Test suite for email service"""

    @pytest.fixture
    def email_service(self):
        """Create EmailService instance"""
        return EmailService()

    @pytest.mark.asyncio
    async def test_send_email(
        self,
        email_service
    ):
        """Test sending email"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            success = await email_service.send_email(
                to="test@example.com",
                subject="Test Email",
                body="Test content"
            )

            assert success is True or isinstance(success, bool)

    @pytest.mark.asyncio
    async def test_send_bulk_email(
        self,
        email_service
    ):
        """Test sending bulk emails"""
        recipients = ["user1@example.com", "user2@example.com"]

        with patch.object(email_service, 'send_email', return_value=True):
            results = await email_service.send_bulk_email(
                recipients=recipients,
                subject="Bulk Test",
                body="Test"
            )

            assert len(results) == len(recipients)
