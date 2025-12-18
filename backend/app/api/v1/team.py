"""
Team Management API Endpoints

Provides endpoints for managing team members, invitations, and roles.
Enables businesses to invite employees to their dashboard.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum
import logging
import uuid

from app.core.database import get_db
from app.services.team_service import team_service, UserRole
from app.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class TeamRole(str, Enum):
    """Team member roles"""
    owner = "owner"
    admin = "admin"
    member = "member"
    viewer = "viewer"


class TeamMemberResponse(BaseModel):
    """Team member response"""
    id: str
    name: str
    email: str
    role: str
    status: str  # 'active' or 'pending'
    wallet_address: Optional[str] = None
    joined_at: Optional[str] = None


class TeamResponse(BaseModel):
    """Team list response"""
    members: List[TeamMemberResponse]
    total: int


class InviteMemberRequest(BaseModel):
    """Request to invite a team member"""
    email: EmailStr
    role: TeamRole = TeamRole.member
    message: Optional[str] = None


class InviteMemberResponse(BaseModel):
    """Response after inviting a member"""
    success: bool
    message: str
    invitation_id: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    """Request to update member role"""
    role: TeamRole


class RemoveMemberResponse(BaseModel):
    """Response after removing a member"""
    success: bool
    message: str


# In-memory storage for wallet-based teams (MVP)
# In production, this would be a database
_wallet_teams = {}


def _get_or_create_team(wallet_address: str, user_email: str = None) -> dict:
    """Get or create a team for a wallet address"""
    wallet_lower = wallet_address.lower()

    if wallet_lower not in _wallet_teams:
        # Create new team with owner
        team_id = str(uuid.uuid4())
        _wallet_teams[wallet_lower] = {
            'id': team_id,
            'owner_wallet': wallet_lower,
            'members': [
                {
                    'id': '1',
                    'name': 'You (Owner)',
                    'email': user_email or f'{wallet_lower[:10]}...@wallet',
                    'role': 'owner',
                    'status': 'active',
                    'wallet_address': wallet_lower,
                    'joined_at': datetime.now().isoformat()
                }
            ],
            'invitations': []
        }

    return _wallet_teams[wallet_lower]


# Endpoints
@router.get("", response_model=TeamResponse)
async def get_team_members(
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team members for a business

    Returns all team members associated with this wallet's dashboard.
    """
    try:
        team = _get_or_create_team(wallet_address)

        members = [
            TeamMemberResponse(
                id=m['id'],
                name=m['name'],
                email=m['email'],
                role=m['role'],
                status=m['status'],
                wallet_address=m.get('wallet_address'),
                joined_at=m.get('joined_at')
            )
            for m in team['members']
        ]

        return TeamResponse(members=members, total=len(members))

    except Exception as e:
        logger.error(f"Error fetching team members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team members: {str(e)}"
        )


@router.post("/invite", response_model=InviteMemberResponse)
async def invite_team_member(
    request: InviteMemberRequest,
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new team member

    Sends an invitation email to the specified email address.
    The invitee will receive a link to join the team.
    """
    try:
        team = _get_or_create_team(wallet_address)

        # Check if email is already a member
        for member in team['members']:
            if member['email'].lower() == request.email.lower():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"{request.email} is already a team member"
                )

        # Generate invitation
        invitation_id = str(uuid.uuid4())
        invitation_token = str(uuid.uuid4())

        # Create pending member entry
        new_member = {
            'id': invitation_id,
            'name': request.email.split('@')[0].title(),
            'email': request.email,
            'role': request.role.value,
            'status': 'pending',
            'wallet_address': None,
            'joined_at': datetime.now().isoformat(),
            'invitation_token': invitation_token
        }

        team['members'].append(new_member)

        # Store invitation
        team['invitations'].append({
            'id': invitation_id,
            'email': request.email,
            'role': request.role.value,
            'token': invitation_token,
            'created_at': datetime.now().isoformat(),
            'status': 'pending'
        })

        # Send invitation email
        try:
            # Get company name from settings if available
            company_name = "Your Company"  # Could fetch from settings
            invitation_link = f"https://app.varity.so/accept-invitation/{invitation_token}"

            await email_service.send_team_invitation(
                to_email=request.email,
                inviter_name="Team Admin",
                company_name=company_name,
                role=request.role.value.title(),
                invitation_link=invitation_link
            )
            logger.info(f"Invitation email sent to {request.email}")
        except Exception as email_error:
            # Log but don't fail - invitation is still created
            logger.warning(f"Could not send invitation email: {str(email_error)}")

        return InviteMemberResponse(
            success=True,
            message=f"Invitation sent to {request.email}",
            invitation_id=invitation_id
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting team member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite team member: {str(e)}"
        )


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    request: UpdateRoleRequest,
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a team member's role

    Changes the role of an existing team member.
    Cannot change the role of the team owner.
    """
    try:
        team = _get_or_create_team(wallet_address)

        # Find member
        member_found = None
        for member in team['members']:
            if member['id'] == member_id:
                member_found = member
                break

        if not member_found:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team member {member_id} not found"
            )

        # Cannot change owner role
        if member_found['role'] == 'owner':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change the owner's role"
            )

        # Update role
        old_role = member_found['role']
        member_found['role'] = request.role.value

        logger.info(f"Updated role for {member_found['email']} from {old_role} to {request.role.value}")

        return {
            "success": True,
            "message": f"Role updated to {request.role.value}",
            "member_id": member_id,
            "new_role": request.role.value
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating member role: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )


@router.delete("/members/{member_id}", response_model=RemoveMemberResponse)
async def remove_team_member(
    member_id: str,
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a team member

    Removes a member from the team. Cannot remove the team owner.
    """
    try:
        team = _get_or_create_team(wallet_address)

        # Find and remove member
        member_to_remove = None
        for i, member in enumerate(team['members']):
            if member['id'] == member_id:
                if member['role'] == 'owner':
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot remove the team owner"
                    )
                member_to_remove = member
                team['members'].pop(i)
                break

        if not member_to_remove:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team member {member_id} not found"
            )

        logger.info(f"Removed team member {member_to_remove['email']}")

        return RemoveMemberResponse(
            success=True,
            message=f"Removed {member_to_remove['email']} from team"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove team member: {str(e)}"
        )


@router.post("/accept-invitation/{token}")
async def accept_invitation(
    token: str,
    wallet_address: str = Query(..., description="Invitee's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a team invitation

    Accepts an invitation using the token from the invitation email.
    Binds the invitee's wallet address to their team membership.
    """
    try:
        # Search for invitation across all teams
        for team_wallet, team in _wallet_teams.items():
            for invitation in team.get('invitations', []):
                if invitation['token'] == token and invitation['status'] == 'pending':
                    # Found the invitation - update member
                    for member in team['members']:
                        if member.get('invitation_token') == token:
                            member['status'] = 'active'
                            member['wallet_address'] = wallet_address.lower()
                            member['joined_at'] = datetime.now().isoformat()
                            del member['invitation_token']

                            # Update invitation status
                            invitation['status'] = 'accepted'
                            invitation['accepted_at'] = datetime.now().isoformat()

                            logger.info(f"Invitation accepted by {wallet_address}")

                            return {
                                "success": True,
                                "message": "Successfully joined the team",
                                "team_id": team['id'],
                                "role": member['role']
                            }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invalid or expired invitation"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept invitation: {str(e)}"
        )


@router.get("/invitations")
async def get_pending_invitations(
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get pending invitations

    Returns all pending invitations for this team.
    """
    try:
        team = _get_or_create_team(wallet_address)

        pending = [
            {
                'id': inv['id'],
                'email': inv['email'],
                'role': inv['role'],
                'created_at': inv['created_at'],
                'status': inv['status']
            }
            for inv in team.get('invitations', [])
            if inv['status'] == 'pending'
        ]

        return {
            "success": True,
            "invitations": pending,
            "total": len(pending)
        }

    except Exception as e:
        logger.error(f"Error fetching invitations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch invitations: {str(e)}"
        )


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    wallet_address: str = Query(..., description="Owner's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a pending invitation

    Cancels an invitation that hasn't been accepted yet.
    """
    try:
        team = _get_or_create_team(wallet_address)

        # Find and remove invitation
        for i, inv in enumerate(team.get('invitations', [])):
            if inv['id'] == invitation_id:
                if inv['status'] != 'pending':
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Can only cancel pending invitations"
                    )

                # Remove invitation
                team['invitations'].pop(i)

                # Remove pending member entry
                team['members'] = [m for m in team['members'] if m['id'] != invitation_id]

                return {
                    "success": True,
                    "message": "Invitation cancelled"
                }

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling invitation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel invitation: {str(e)}"
        )
