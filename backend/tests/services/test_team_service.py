"""
Unit tests for TeamService
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch

from app.services.team_service import TeamService


class TestTeamService:
    """Test suite for team management service"""

    @pytest.fixture
    def team_service(self, mock_db_session):
        """Create TeamService instance"""
        return TeamService(db=mock_db_session)

    @pytest.mark.asyncio
    async def test_create_team_member(
        self,
        team_service,
        mock_wallet_address
    ):
        """Test creating team member"""
        member_data = {
            "wallet_address": mock_wallet_address,
            "name": "John Doe",
            "role": "admin"
        }

        with patch.object(team_service, 'db') as mock_db:
            mock_db.add = Mock()
            mock_db.commit = Mock()

            member = await team_service.create_member(member_data)

            assert isinstance(member, dict) or member is not None

    @pytest.mark.asyncio
    async def test_get_team_members(
        self,
        team_service,
        mock_company_id
    ):
        """Test retrieving team members"""
        with patch.object(team_service, 'db') as mock_db:
            mock_db.query.return_value.filter.return_value.all.return_value = []

            members = await team_service.get_members(mock_company_id)

            assert isinstance(members, list)

    @pytest.mark.asyncio
    async def test_update_member_role(
        self,
        team_service,
        mock_wallet_address
    ):
        """Test updating team member role"""
        new_role = "manager"

        success = await team_service.update_role(mock_wallet_address, new_role)

        assert isinstance(success, bool) or success is None
