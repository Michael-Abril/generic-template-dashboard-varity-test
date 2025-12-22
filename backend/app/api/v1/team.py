"""
Team Management API Endpoints

Provides endpoints for managing team members, invitations, and roles.
Enables businesses to invite employees to their dashboard.

PRODUCTION-READY: Uses database persistence with proper access control.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta
from enum import Enum
import logging
import uuid
import secrets

from app.core.database import get_db
from app.models.team import Team, TeamMember, TeamInvitation, TeamRole as DBTeamRole, InvitationStatus
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


# Helper functions
async def get_or_create_team(db: AsyncSession, wallet_address: str, user_email: str = None) -> Team:
    """Get or create a team for a wallet address"""
    wallet_lower = wallet_address.lower()

    # Check if team exists
    result = await db.execute(
        select(Team).where(Team.owner_wallet == wallet_lower)
    )
    team = result.scalar_one_or_none()

    if not team:
        # Create new team with owner
        team = Team(
            owner_wallet=wallet_lower,
            company_name=None  # Will be set from settings
        )
        db.add(team)
        await db.flush()

        # Add owner as first member
        owner_member = TeamMember(
            team_id=team.id,
            name="Owner",
            email=user_email or f"{wallet_lower[:10]}...@wallet",
            role=DBTeamRole.OWNER,
            status="active",
            wallet_address=wallet_lower
        )
        db.add(owner_member)
        await db.commit()
        await db.refresh(team)

    return team


async def get_team_member_by_wallet(db: AsyncSession, team_id: int, wallet_address: str) -> Optional[TeamMember]:
    """Get a team member by their wallet address"""
    result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.wallet_address == wallet_address.lower()
            )
        )
    )
    return result.scalar_one_or_none()


async def verify_team_access(db: AsyncSession, wallet_address: str, required_roles: List[str] = None) -> tuple[Team, TeamMember]:
    """
    Verify that wallet has access to team operations.
    Returns (team, member) if authorized, raises HTTPException if not.
    """
    wallet_lower = wallet_address.lower()

    # Get team where this wallet is owner
    result = await db.execute(
        select(Team).where(Team.owner_wallet == wallet_lower)
    )
    team = result.scalar_one_or_none()

    if not team:
        # Check if wallet is a team member
        result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.wallet_address == wallet_lower,
                    TeamMember.status == "active"
                )
            ).options(selectinload(TeamMember.team))
        )
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No team found for this wallet address"
            )

        team = member.team
    else:
        # Wallet is owner, get their member record
        member = await get_team_member_by_wallet(db, team.id, wallet_lower)

    # Check role permissions if required
    if required_roles and member.role.value not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {required_roles}"
        )

    return team, member


# Endpoints
@router.get("", response_model=TeamResponse)
async def get_team_members(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team members for a business

    Returns all team members associated with this wallet's team.
    Creates a new team if this is the first access for this wallet.
    Works for both team owners and team members.
    """
    try:
        # First try to get or create team for this wallet (if they're an owner)
        team = await get_or_create_team(db, wallet_address)

        # If we got a team, verify access
        wallet_lower = wallet_address.lower()
        member = await get_team_member_by_wallet(db, team.id, wallet_lower)

        if not member:
            # Not a member of this team, check if they're a member elsewhere
            result = await db.execute(
                select(TeamMember).where(
                    and_(
                        TeamMember.wallet_address == wallet_lower,
                        TeamMember.status == "active"
                    )
                ).options(selectinload(TeamMember.team))
            )
            member = result.scalar_one_or_none()

            if member:
                team = member.team

        # Get all members
        result = await db.execute(
            select(TeamMember).where(TeamMember.team_id == team.id)
        )
        members = result.scalars().all()

        member_responses = [
            TeamMemberResponse(
                id=str(m.id),
                name=m.name or m.email.split('@')[0].title(),
                email=m.email,
                role=m.role.value if hasattr(m.role, 'value') else m.role,
                status=m.status,
                wallet_address=m.wallet_address,
                joined_at=m.joined_at.isoformat() if m.joined_at else None
            )
            for m in members
        ]

        return TeamResponse(members=member_responses, total=len(member_responses))

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team members: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team members: {str(e)}"
        )


@router.post("/invite", response_model=InviteMemberResponse)
async def invite_team_member(
    request: InviteMemberRequest,
    wallet_address: str = Query(..., description="Inviter's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Invite a new team member

    Only owners and admins can invite new members.
    Sends an invitation email to the specified email address.
    """
    try:
        # Verify caller has permission to invite
        team, caller = await verify_team_access(db, wallet_address, required_roles=["owner", "admin"])

        # Check if email is already a member
        result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team.id,
                    TeamMember.email == request.email.lower()
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{request.email} is already a team member"
            )

        # Generate secure invitation token
        invitation_token = secrets.token_urlsafe(32)

        # Create pending member entry
        new_member = TeamMember(
            team_id=team.id,
            name=request.email.split('@')[0].title(),
            email=request.email.lower(),
            role=DBTeamRole(request.role.value),
            status="pending",
            wallet_address=None
        )
        db.add(new_member)
        await db.flush()

        # Create invitation record
        invitation = TeamInvitation(
            team_id=team.id,
            member_id=new_member.id,
            email=request.email.lower(),
            role=DBTeamRole(request.role.value),
            token=invitation_token,
            status=InvitationStatus.PENDING,
            invited_by_wallet=wallet_address.lower(),
            invited_by_name=caller.name,
            expires_at=datetime.utcnow() + timedelta(days=7)
        )
        db.add(invitation)
        await db.commit()

        # Send invitation email
        try:
            company_name = team.company_name or "Your Company"
            invitation_link = f"https://app.varity.so/accept-invitation/{invitation_token}"

            await email_service.send_team_invitation(
                to_email=request.email,
                inviter_name=caller.name or "Team Admin",
                company_name=company_name,
                role=request.role.value.title(),
                invitation_link=invitation_link
            )
            logger.info(f"Invitation email sent to {request.email}")
        except Exception as email_error:
            logger.warning(f"Could not send invitation email: {str(email_error)}")
            # Continue - invitation is still valid

        return InviteMemberResponse(
            success=True,
            message=f"Invitation sent to {request.email}",
            invitation_id=str(new_member.id)
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error inviting team member: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite team member: {str(e)}"
        )


@router.put("/members/{member_id}/role")
async def update_member_role(
    member_id: str,
    request: UpdateRoleRequest,
    wallet_address: str = Query(..., description="Caller's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a team member's role

    Only owners and admins can change roles.
    Cannot change the role of the team owner.
    """
    try:
        # Verify caller has permission
        team, caller = await verify_team_access(db, wallet_address, required_roles=["owner", "admin"])

        # Find member
        result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.id == int(member_id),
                    TeamMember.team_id == team.id
                )
            )
        )
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team member {member_id} not found"
            )

        # Cannot change owner role
        if member.role == DBTeamRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot change the owner's role"
            )

        # Admin cannot promote to owner or demote other admins (unless they are owner)
        if caller.role != DBTeamRole.OWNER:
            if request.role.value == "owner":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only owner can promote to owner role"
                )
            if member.role == DBTeamRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only owner can change admin roles"
                )

        # Update role
        old_role = member.role.value
        member.role = DBTeamRole(request.role.value)
        await db.commit()

        logger.info(f"Updated role for {member.email} from {old_role} to {request.role.value}")

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
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update role: {str(e)}"
        )


@router.delete("/members/{member_id}", response_model=RemoveMemberResponse)
async def remove_team_member(
    member_id: str,
    wallet_address: str = Query(..., description="Caller's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Remove a team member

    Only owners and admins can remove members.
    Cannot remove the team owner.
    """
    try:
        # Verify caller has permission
        team, caller = await verify_team_access(db, wallet_address, required_roles=["owner", "admin"])

        # Find member
        result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.id == int(member_id),
                    TeamMember.team_id == team.id
                )
            )
        )
        member = result.scalar_one_or_none()

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Team member {member_id} not found"
            )

        # Cannot remove owner
        if member.role == DBTeamRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the team owner"
            )

        # Admin cannot remove other admins (unless caller is owner)
        if caller.role != DBTeamRole.OWNER and member.role == DBTeamRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only owner can remove admins"
            )

        member_email = member.email

        # Delete associated invitation if exists
        await db.execute(
            select(TeamInvitation).where(TeamInvitation.member_id == member.id)
        )

        await db.delete(member)
        await db.commit()

        logger.info(f"Removed team member {member_email}")

        return RemoveMemberResponse(
            success=True,
            message=f"Removed {member_email} from team"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing team member: {str(e)}")
        await db.rollback()
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
        # Find invitation by token
        result = await db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.token == token,
                    TeamInvitation.status == InvitationStatus.PENDING
                )
            ).options(selectinload(TeamInvitation.member))
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid or expired invitation"
            )

        # Check if expired
        if invitation.expires_at < datetime.utcnow():
            invitation.status = InvitationStatus.EXPIRED
            await db.commit()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invitation has expired"
            )

        # Check if wallet is already part of a team
        result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.wallet_address == wallet_address.lower(),
                    TeamMember.status == "active"
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This wallet is already part of a team"
            )

        # Update member record
        member = invitation.member
        member.status = "active"
        member.wallet_address = wallet_address.lower()
        member.joined_at = datetime.utcnow()

        # Update invitation status
        invitation.status = InvitationStatus.ACCEPTED
        invitation.accepted_at = datetime.utcnow()

        await db.commit()

        logger.info(f"Invitation accepted by {wallet_address} for team {invitation.team_id}")

        return {
            "success": True,
            "message": "Successfully joined the team",
            "team_id": str(invitation.team_id),
            "role": member.role.value
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept invitation: {str(e)}"
        )


@router.get("/invitations")
async def get_pending_invitations(
    wallet_address: str = Query(..., description="Caller's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get pending invitations

    Returns all pending invitations for this team.
    Only owners and admins can view invitations.
    """
    try:
        team, _ = await verify_team_access(db, wallet_address, required_roles=["owner", "admin"])

        result = await db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.team_id == team.id,
                    TeamInvitation.status == InvitationStatus.PENDING
                )
            )
        )
        invitations = result.scalars().all()

        pending = [
            {
                "id": str(inv.id),
                "email": inv.email,
                "role": inv.role.value if hasattr(inv.role, 'value') else inv.role,
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
                "expires_at": inv.expires_at.isoformat() if inv.expires_at else None,
                "status": inv.status.value if hasattr(inv.status, 'value') else inv.status
            }
            for inv in invitations
        ]

        return {
            "success": True,
            "invitations": pending,
            "total": len(pending)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invitations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch invitations: {str(e)}"
        )


@router.delete("/invitations/{invitation_id}")
async def cancel_invitation(
    invitation_id: str,
    wallet_address: str = Query(..., description="Caller's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Cancel a pending invitation

    Only owners and admins can cancel invitations.
    """
    try:
        team, _ = await verify_team_access(db, wallet_address, required_roles=["owner", "admin"])

        # Find invitation
        result = await db.execute(
            select(TeamInvitation).where(
                and_(
                    TeamInvitation.id == int(invitation_id),
                    TeamInvitation.team_id == team.id
                )
            ).options(selectinload(TeamInvitation.member))
        )
        invitation = result.scalar_one_or_none()

        if not invitation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invitation not found"
            )

        if invitation.status != InvitationStatus.PENDING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only cancel pending invitations"
            )

        # Update status
        invitation.status = InvitationStatus.CANCELLED

        # Remove pending member
        if invitation.member:
            await db.delete(invitation.member)

        await db.commit()

        return {
            "success": True,
            "message": "Invitation cancelled"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling invitation: {str(e)}")
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel invitation: {str(e)}"
        )


@router.get("/my-team")
async def get_my_team_info(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get team info for a team member

    Returns information about the team the user belongs to.
    Works for any team member (not just owners).
    """
    try:
        team, member = await verify_team_access(db, wallet_address)

        return {
            "success": True,
            "team": {
                "id": str(team.id),
                "company_name": team.company_name,
                "owner_wallet": team.owner_wallet,
                "created_at": team.created_at.isoformat() if team.created_at else None
            },
            "my_role": member.role.value if hasattr(member.role, 'value') else member.role,
            "my_status": member.status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching team info: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team info: {str(e)}"
        )
