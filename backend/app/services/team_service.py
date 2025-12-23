"""
Team Management Service for Varity Dashboard
Handles multi-user access, roles, permissions, and team collaboration
"""
import os
import logging
import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import hashlib
import secrets

logger = logging.getLogger(__name__)


class UserRole(Enum):
    """User role definitions with permission levels"""
    OWNER = "owner"           # Full access, billing, can delete company
    ADMIN = "admin"           # Full access except billing and deletion
    MANAGER = "manager"       # Can view/edit most data, invite users
    ANALYST = "analyst"       # Can view all data, create reports
    VIEWER = "viewer"         # Read-only access to dashboards
    BILLING = "billing"       # Access to billing and invoices only
    CUSTOM = "custom"         # Custom role with specific permissions


class Permission(Enum):
    """Granular permission definitions"""
    # Dashboard permissions
    DASHBOARD_VIEW = "dashboard.view"
    DASHBOARD_EDIT = "dashboard.edit"
    DASHBOARD_CREATE = "dashboard.create"
    DASHBOARD_DELETE = "dashboard.delete"

    # Analytics permissions
    ANALYTICS_VIEW = "analytics.view"
    ANALYTICS_CREATE = "analytics.create"
    ANALYTICS_EXPORT = "analytics.export"

    # Integration permissions
    INTEGRATION_VIEW = "integration.view"
    INTEGRATION_CONNECT = "integration.connect"
    INTEGRATION_DISCONNECT = "integration.disconnect"
    INTEGRATION_SYNC = "integration.sync"

    # Team permissions
    TEAM_VIEW = "team.view"
    TEAM_INVITE = "team.invite"
    TEAM_EDIT = "team.edit"
    TEAM_REMOVE = "team.remove"

    # Settings permissions
    SETTINGS_VIEW = "settings.view"
    SETTINGS_EDIT = "settings.edit"
    SETTINGS_BILLING = "settings.billing"

    # Report permissions
    REPORT_VIEW = "report.view"
    REPORT_CREATE = "report.create"
    REPORT_SCHEDULE = "report.schedule"
    REPORT_EXPORT = "report.export"

    # Data permissions
    DATA_VIEW = "data.view"
    DATA_EDIT = "data.edit"
    DATA_DELETE = "data.delete"
    DATA_EXPORT = "data.export"


class TeamManagementService:
    """
    Service for managing teams, users, roles, and permissions
    """

    def __init__(self):
        """Initialize team management service"""
        self.role_permissions = self._define_role_permissions()
        self.teams = {}  # In production, use database
        self.invitations = {}  # Pending invitations
        logger.info("Team Management Service initialized")

    def _define_role_permissions(self) -> Dict[UserRole, List[Permission]]:
        """Define default permissions for each role"""
        return {
            UserRole.OWNER: [p for p in Permission],  # All permissions

            UserRole.ADMIN: [
                Permission.DASHBOARD_VIEW, Permission.DASHBOARD_EDIT,
                Permission.DASHBOARD_CREATE, Permission.DASHBOARD_DELETE,
                Permission.ANALYTICS_VIEW, Permission.ANALYTICS_CREATE,
                Permission.ANALYTICS_EXPORT,
                Permission.INTEGRATION_VIEW, Permission.INTEGRATION_CONNECT,
                Permission.INTEGRATION_DISCONNECT, Permission.INTEGRATION_SYNC,
                Permission.TEAM_VIEW, Permission.TEAM_INVITE,
                Permission.TEAM_EDIT, Permission.TEAM_REMOVE,
                Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT,
                Permission.REPORT_VIEW, Permission.REPORT_CREATE,
                Permission.REPORT_SCHEDULE, Permission.REPORT_EXPORT,
                Permission.DATA_VIEW, Permission.DATA_EDIT,
                Permission.DATA_DELETE, Permission.DATA_EXPORT
            ],

            UserRole.MANAGER: [
                Permission.DASHBOARD_VIEW, Permission.DASHBOARD_EDIT,
                Permission.ANALYTICS_VIEW, Permission.ANALYTICS_CREATE,
                Permission.ANALYTICS_EXPORT,
                Permission.INTEGRATION_VIEW, Permission.INTEGRATION_SYNC,
                Permission.TEAM_VIEW, Permission.TEAM_INVITE,
                Permission.SETTINGS_VIEW,
                Permission.REPORT_VIEW, Permission.REPORT_CREATE,
                Permission.REPORT_EXPORT,
                Permission.DATA_VIEW, Permission.DATA_EDIT,
                Permission.DATA_EXPORT
            ],

            UserRole.ANALYST: [
                Permission.DASHBOARD_VIEW,
                Permission.ANALYTICS_VIEW, Permission.ANALYTICS_CREATE,
                Permission.ANALYTICS_EXPORT,
                Permission.INTEGRATION_VIEW,
                Permission.TEAM_VIEW,
                Permission.REPORT_VIEW, Permission.REPORT_CREATE,
                Permission.REPORT_EXPORT,
                Permission.DATA_VIEW, Permission.DATA_EXPORT
            ],

            UserRole.VIEWER: [
                Permission.DASHBOARD_VIEW,
                Permission.ANALYTICS_VIEW,
                Permission.INTEGRATION_VIEW,
                Permission.TEAM_VIEW,
                Permission.REPORT_VIEW,
                Permission.DATA_VIEW
            ],

            UserRole.BILLING: [
                Permission.SETTINGS_VIEW,
                Permission.SETTINGS_BILLING,
                Permission.REPORT_VIEW
            ]
        }

    async def create_team(
        self,
        company_id: str,
        owner_user_id: str,
        company_name: str,
        settings: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new team for a company

        Args:
            company_id: Company identifier
            owner_user_id: User ID of the team owner
            company_name: Name of the company
            settings: Optional team settings

        Returns:
            Created team details
        """
        try:
            team = {
                'id': str(uuid.uuid4()),
                'company_id': company_id,
                'company_name': company_name,
                'owner_id': owner_user_id,
                'members': [
                    {
                        'user_id': owner_user_id,
                        'role': UserRole.OWNER.value,
                        'permissions': [p.value for p in self.role_permissions[UserRole.OWNER]],
                        'joined_at': datetime.now().isoformat(),
                        'status': 'active'
                    }
                ],
                'settings': settings or {
                    'allow_self_signup': False,
                    'require_2fa': False,
                    'session_timeout': 3600,
                    'ip_whitelist': [],
                    'notification_preferences': {
                        'new_member': True,
                        'role_change': True,
                        'integration_status': True
                    }
                },
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }

            # Store team (in production, use database)
            self.teams[team['id']] = team

            logger.info(f"Created team {team['id']} for company {company_name}")
            return {
                'success': True,
                'team': team
            }

        except Exception as e:
            logger.error(f"Failed to create team: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def invite_member(
        self,
        team_id: str,
        inviter_id: str,
        invitee_email: str,
        role: UserRole,
        custom_permissions: Optional[List[str]] = None,
        message: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Invite a new member to the team

        Args:
            team_id: Team identifier
            inviter_id: User ID of the inviter
            invitee_email: Email of the person to invite
            role: Role to assign
            custom_permissions: Optional custom permissions
            message: Optional invitation message

        Returns:
            Invitation details
        """
        try:
            # Check if inviter has permission
            if not await self.check_permission(team_id, inviter_id, Permission.TEAM_INVITE):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to invite members'
                }

            # Generate invitation token
            invitation_token = secrets.token_urlsafe(32)
            invitation = {
                'id': str(uuid.uuid4()),
                'team_id': team_id,
                'inviter_id': inviter_id,
                'email': invitee_email,
                'role': role.value,
                'permissions': custom_permissions or [p.value for p in self.role_permissions[role]],
                'token': invitation_token,
                'message': message,
                'status': 'pending',
                'created_at': datetime.now().isoformat(),
                'expires_at': (datetime.now() + timedelta(days=7)).isoformat()
            }

            # Store invitation
            self.invitations[invitation['id']] = invitation

            # Send invitation email (using email service)
            from .email_service import email_service
            team = self.teams.get(team_id)

            invitation_link = f"http://localhost:3000/accept-invitation/{invitation_token}"
            await email_service.send_team_invitation(
                to_email=invitee_email,
                inviter_name="Team Admin",  # Get actual name from user service
                company_name=team['company_name'] if team else "Company",
                role=role.value,
                invitation_link=invitation_link
            )

            logger.info(f"Sent invitation to {invitee_email} for team {team_id}")
            return {
                'success': True,
                'invitation': {
                    'id': invitation['id'],
                    'email': invitee_email,
                    'role': role.value,
                    'expires_at': invitation['expires_at']
                }
            }

        except Exception as e:
            logger.error(f"Failed to invite member: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def accept_invitation(
        self,
        invitation_token: str,
        user_id: str,
        user_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Accept a team invitation

        Args:
            invitation_token: Invitation token
            user_id: User ID of the person accepting
            user_info: User information

        Returns:
            Result of accepting invitation
        """
        try:
            # Find invitation by token
            invitation = None
            for inv in self.invitations.values():
                if inv['token'] == invitation_token and inv['status'] == 'pending':
                    # Check if not expired
                    if datetime.fromisoformat(inv['expires_at']) > datetime.now():
                        invitation = inv
                        break

            if not invitation:
                return {
                    'success': False,
                    'error': 'Invalid or expired invitation'
                }

            # Add user to team
            team = self.teams.get(invitation['team_id'])
            if not team:
                return {
                    'success': False,
                    'error': 'Team not found'
                }

            # Create member entry
            member = {
                'user_id': user_id,
                'email': invitation['email'],
                'name': user_info.get('name', ''),
                'role': invitation['role'],
                'permissions': invitation['permissions'],
                'joined_at': datetime.now().isoformat(),
                'invited_by': invitation['inviter_id'],
                'status': 'active'
            }

            team['members'].append(member)
            team['updated_at'] = datetime.now().isoformat()

            # Mark invitation as accepted
            invitation['status'] = 'accepted'
            invitation['accepted_at'] = datetime.now().isoformat()
            invitation['accepted_by'] = user_id

            logger.info(f"User {user_id} joined team {team['id']}")
            return {
                'success': True,
                'team_id': team['id'],
                'role': member['role']
            }

        except Exception as e:
            logger.error(f"Failed to accept invitation: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def update_member_role(
        self,
        team_id: str,
        admin_id: str,
        member_id: str,
        new_role: UserRole,
        custom_permissions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Update a team member's role

        Args:
            team_id: Team identifier
            admin_id: Admin user ID making the change
            member_id: Member user ID to update
            new_role: New role to assign
            custom_permissions: Optional custom permissions

        Returns:
            Update result
        """
        try:
            # Check if admin has permission
            if not await self.check_permission(team_id, admin_id, Permission.TEAM_EDIT):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to edit team members'
                }

            team = self.teams.get(team_id)
            if not team:
                return {
                    'success': False,
                    'error': 'Team not found'
                }

            # Find and update member
            member_found = False
            for member in team['members']:
                if member['user_id'] == member_id:
                    # Can't change owner role
                    if member['role'] == UserRole.OWNER.value:
                        return {
                            'success': False,
                            'error': 'Cannot change owner role'
                        }

                    member['role'] = new_role.value
                    member['permissions'] = custom_permissions or \
                                           [p.value for p in self.role_permissions[new_role]]
                    member['updated_at'] = datetime.now().isoformat()
                    member['updated_by'] = admin_id
                    member_found = True
                    break

            if not member_found:
                return {
                    'success': False,
                    'error': 'Member not found in team'
                }

            team['updated_at'] = datetime.now().isoformat()

            logger.info(f"Updated role for member {member_id} in team {team_id} to {new_role.value}")
            return {
                'success': True,
                'member_id': member_id,
                'new_role': new_role.value
            }

        except Exception as e:
            logger.error(f"Failed to update member role: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def remove_member(
        self,
        team_id: str,
        admin_id: str,
        member_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Remove a member from the team

        Args:
            team_id: Team identifier
            admin_id: Admin user ID making the removal
            member_id: Member user ID to remove
            reason: Optional removal reason

        Returns:
            Removal result
        """
        try:
            # Check if admin has permission
            if not await self.check_permission(team_id, admin_id, Permission.TEAM_REMOVE):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to remove team members'
                }

            team = self.teams.get(team_id)
            if not team:
                return {
                    'success': False,
                    'error': 'Team not found'
                }

            # Find and remove member
            member_to_remove = None
            for i, member in enumerate(team['members']):
                if member['user_id'] == member_id:
                    # Can't remove owner
                    if member['role'] == UserRole.OWNER.value:
                        return {
                            'success': False,
                            'error': 'Cannot remove team owner'
                        }

                    member_to_remove = member
                    team['members'].pop(i)
                    break

            if not member_to_remove:
                return {
                    'success': False,
                    'error': 'Member not found in team'
                }

            # Log the removal
            removal_log = {
                'team_id': team_id,
                'member_id': member_id,
                'removed_by': admin_id,
                'removed_at': datetime.now().isoformat(),
                'reason': reason
            }

            team['updated_at'] = datetime.now().isoformat()

            logger.info(f"Removed member {member_id} from team {team_id}")
            return {
                'success': True,
                'removed_member': member_id
            }

        except Exception as e:
            logger.error(f"Failed to remove member: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_team_members(
        self,
        team_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Get list of team members

        Args:
            team_id: Team identifier
            user_id: User requesting the list

        Returns:
            Team members list
        """
        try:
            # Check if user has permission
            if not await self.check_permission(team_id, user_id, Permission.TEAM_VIEW):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to view team members'
                }

            team = self.teams.get(team_id)
            if not team:
                return {
                    'success': False,
                    'error': 'Team not found'
                }

            # Format member data for response
            members = []
            for member in team['members']:
                members.append({
                    'user_id': member['user_id'],
                    'email': member.get('email'),
                    'name': member.get('name'),
                    'role': member['role'],
                    'status': member.get('status', 'active'),
                    'joined_at': member['joined_at']
                })

            return {
                'success': True,
                'team': {
                    'id': team['id'],
                    'company_name': team['company_name'],
                    'members': members,
                    'member_count': len(members)
                }
            }

        except Exception as e:
            logger.error(f"Failed to get team members: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def check_permission(
        self,
        team_id: str,
        user_id: str,
        permission: Permission
    ) -> bool:
        """
        Check if user has specific permission

        Args:
            team_id: Team identifier
            user_id: User identifier
            permission: Permission to check

        Returns:
            True if user has permission
        """
        team = self.teams.get(team_id)
        if not team:
            return False

        for member in team['members']:
            if member['user_id'] == user_id:
                return permission.value in member['permissions']

        return False

    async def get_user_permissions(
        self,
        team_id: str,
        user_id: str
    ) -> List[str]:
        """
        Get all permissions for a user

        Args:
            team_id: Team identifier
            user_id: User identifier

        Returns:
            List of permissions
        """
        team = self.teams.get(team_id)
        if not team:
            return []

        for member in team['members']:
            if member['user_id'] == user_id:
                return member['permissions']

        return []

    async def create_custom_role(
        self,
        team_id: str,
        admin_id: str,
        role_name: str,
        permissions: List[Permission],
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a custom role with specific permissions

        Args:
            team_id: Team identifier
            admin_id: Admin creating the role
            role_name: Name of the custom role
            permissions: List of permissions for the role
            description: Optional role description

        Returns:
            Created role details
        """
        try:
            # Check if admin has permission
            if not await self.check_permission(team_id, admin_id, Permission.TEAM_EDIT):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to create custom roles'
                }

            team = self.teams.get(team_id)
            if not team:
                return {
                    'success': False,
                    'error': 'Team not found'
                }

            # Create custom role
            custom_role = {
                'id': str(uuid.uuid4()),
                'name': role_name,
                'permissions': [p.value for p in permissions],
                'description': description,
                'created_by': admin_id,
                'created_at': datetime.now().isoformat()
            }

            # Store custom role in team settings
            if 'custom_roles' not in team['settings']:
                team['settings']['custom_roles'] = []

            team['settings']['custom_roles'].append(custom_role)
            team['updated_at'] = datetime.now().isoformat()

            logger.info(f"Created custom role {role_name} for team {team_id}")
            return {
                'success': True,
                'role': custom_role
            }

        except Exception as e:
            logger.error(f"Failed to create custom role: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    async def get_activity_log(
        self,
        team_id: str,
        user_id: str,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get team activity log

        Args:
            team_id: Team identifier
            user_id: User requesting the log
            limit: Number of activities to return

        Returns:
            Activity log entries
        """
        try:
            # Check if user has permission to view team activity
            if not await self.check_permission(team_id, user_id, Permission.TEAM_VIEW):
                return {
                    'success': False,
                    'error': 'Insufficient permissions to view activity log'
                }

            # In production, query from database tables for team activity
            # For now, we derive activity from team_members and team_invitations tables
            # Import database dependencies
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import sessionmaker

            database_url = os.getenv('DATABASE_URL', '')
            if not database_url:
                logger.warning("DATABASE_URL not set, cannot query activity log")
                return {
                    'success': True,
                    'activities': []
                }

            # Convert async URL to sync URL
            sync_db_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

            engine = create_engine(sync_db_url)
            Session = sessionmaker(bind=engine)
            session = Session()

            activities = []

            # Get recent member joins
            member_results = session.execute(text("""
                SELECT email, name, role, joined_at, 'member_joined' as action
                FROM team_members
                WHERE team_id = :team_id
                AND status = 'active'
                ORDER BY joined_at DESC
                LIMIT :limit
            """), {"team_id": team_id, "limit": limit})

            for row in member_results.fetchall():
                email, name, role, joined_at, action = row
                user_display = name if name else email
                activities.append({
                    'id': str(uuid.uuid4()),
                    'action': action,
                    'user': email,
                    'details': f'{user_display} joined the team as {role}',
                    'timestamp': joined_at.isoformat() if joined_at else datetime.now().isoformat()
                })

            # Get recent invitations
            invitation_results = session.execute(text("""
                SELECT email, role, created_at, status, 'invitation_sent' as action
                FROM team_invitations
                WHERE team_id = :team_id
                ORDER BY created_at DESC
                LIMIT :limit
            """), {"team_id": team_id, "limit": limit})

            for row in invitation_results.fetchall():
                email, role, created_at, status, action = row
                if status == 'pending':
                    details = f'Invitation sent to {email} for {role} role'
                elif status == 'accepted':
                    details = f'{email} accepted invitation'
                elif status == 'expired':
                    details = f'Invitation to {email} expired'
                else:
                    details = f'Invitation to {email} was {status}'

                activities.append({
                    'id': str(uuid.uuid4()),
                    'action': f'invitation_{status}',
                    'user': email,
                    'details': details,
                    'timestamp': created_at.isoformat() if created_at else datetime.now().isoformat()
                })

            session.close()

            # Sort all activities by timestamp (most recent first)
            activities.sort(key=lambda x: x['timestamp'], reverse=True)

            return {
                'success': True,
                'activities': activities[:limit]
            }

        except Exception as e:
            logger.error(f"Failed to get activity log: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'activities': []
            }


# Singleton instance
team_service = TeamManagementService()