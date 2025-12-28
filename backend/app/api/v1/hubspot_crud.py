"""
HubSpot CRUD API Endpoints
Provides full Create, Read, Update, Delete operations for HubSpot CRM objects

Fixed December 28, 2025 (Integration Fixer Team):
- Refactored to use Database OAuthToken model instead of Filecoin retrieval
- Uses same pattern as google.py, salesforce_crud.py for consistency and reliability
- Enables token refresh on expiration
- Removed dependency on FilecoinService/EncryptionService for credential retrieval
"""
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import httpx
import logging
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.purchase import OAuthToken
from app.api.v1.integrations import refresh_oauth_token
from app.adapters.hubspot.sync import HubSpotSync

logger = logging.getLogger(__name__)

router = APIRouter()


# Pydantic models for request/response
class ContactCreate(BaseModel):
    """Contact creation request"""
    email: str
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    phone: Optional[str] = None
    mobilephone: Optional[str] = None
    company: Optional[str] = None
    jobtitle: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
    lifecyclestage: Optional[str] = "lead"
    hs_lead_status: Optional[str] = "NEW"


class CompanyCreate(BaseModel):
    """Company creation request"""
    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    numberofemployees: Optional[int] = None
    annualrevenue: Optional[float] = None
    description: Optional[str] = None
    website: Optional[str] = None


class DealCreate(BaseModel):
    """Deal creation request"""
    dealname: str
    amount: Optional[float] = None
    dealstage: str = "appointmentscheduled"
    pipeline: Optional[str] = None
    closedate: Optional[str] = None
    hubspot_owner_id: Optional[str] = None
    dealtype: Optional[str] = None
    description: Optional[str] = None


class TicketCreate(BaseModel):
    """Ticket creation request"""
    subject: str
    content: Optional[str] = None
    hs_ticket_priority: str = "MEDIUM"
    hs_pipeline_stage: str = "1"
    hubspot_owner_id: Optional[str] = None


# Helper function to get HubSpot access token from Database OAuthToken
# FIXED Dec 28, 2025: Uses Database OAuthToken model (same pattern as google.py, salesforce_crud.py)
# Previously used Filecoin with data_type="oauth-credentials" which was inconsistent
async def get_hubspot_access_token(
    wallet_address: str,
    db: AsyncSession
) -> str:
    """
    Get active HubSpot OAuth access token.

    Args:
        wallet_address: User's wallet address
        db: Database session

    Returns:
        Decrypted access token

    Raises:
        HTTPException: If wallet is not connected or token refresh fails
    """
    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == wallet_address.lower(),
                OAuthToken.provider == "hubspot",
                OAuthToken.is_active == True  # noqa: E712
            )
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=404,
            detail="HubSpot not connected. Please connect via OAuth first."
        )

    # Check if token needs refresh
    if token.expires_at and token.expires_at < datetime.utcnow():
        logger.info(f"HubSpot token expired for {wallet_address[:10]}..., attempting refresh")
        refresh_success = await refresh_oauth_token(token, "hubspot", db)
        if not refresh_success:
            raise HTTPException(
                status_code=401,
                detail="HubSpot token expired and refresh failed. Please reconnect."
            )
        logger.info(f"HubSpot token refreshed successfully for {wallet_address[:10]}...")

    # YELLOW-001 FIX: Use auth context to access tokens securely
    with OAuthToken.auth_context(wallet_address.lower()):
        # Use the access_token property which auto-decrypts (same pattern as Slack, Google fixes)
        return token.access_token


# Contact endpoints
@router.post("/contacts")
async def create_contact(
    wallet_address: str = Query(...),
    contact: ContactCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new contact in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        # Initialize HubSpot adapter with access token
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare contact data (remove None values)
        contact_data = {k: v for k, v in contact.dict().items() if v is not None}

        # Create contact via adapter
        result = await adapter.create_contact(contact_data)

        logger.info(f"Contact created for {wallet_address[:10]}...: id={result.get('id')}")
        return {
            "success": True,
            "id": result.get("id"),
            "message": "Contact created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create contact for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    wallet_address: str = Query(...),
    contact: ContactCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing contact in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare update data (remove None values)
        contact_data = {k: v for k, v in contact.dict().items() if v is not None}

        # Update contact via adapter
        result = await adapter.update_contact(contact_id, contact_data)

        logger.info(f"Contact updated for {wallet_address[:10]}...: id={contact_id}")
        return {
            "success": True,
            "message": "Contact updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update contact for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a contact from HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Delete contact via adapter
        await adapter.delete_contact(contact_id)

        logger.info(f"Contact deleted for {wallet_address[:10]}...: id={contact_id}")
        return {
            "success": True,
            "message": "Contact deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete contact for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


# Company endpoints
@router.post("/companies")
async def create_company(
    wallet_address: str = Query(...),
    company: CompanyCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new company in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare company data (remove None values)
        company_data = {k: v for k, v in company.dict().items() if v is not None}

        # Create company via adapter
        result = await adapter.create_company(company_data)

        logger.info(f"Company created for {wallet_address[:10]}...: id={result.get('id')}")
        return {
            "success": True,
            "id": result.get("id"),
            "message": "Company created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create company for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/companies/{company_id}")
async def update_company(
    company_id: str,
    wallet_address: str = Query(...),
    company: CompanyCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing company in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare update data (remove None values)
        company_data = {k: v for k, v in company.dict().items() if v is not None}

        # Update company via adapter
        result = await adapter.update_company(company_id, company_data)

        logger.info(f"Company updated for {wallet_address[:10]}...: id={company_id}")
        return {
            "success": True,
            "message": "Company updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update company for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a company from HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Delete company via adapter
        await adapter.delete_company(company_id)

        logger.info(f"Company deleted for {wallet_address[:10]}...: id={company_id}")
        return {
            "success": True,
            "message": "Company deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete company for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


# Deal endpoints
@router.post("/deals")
async def create_deal(
    wallet_address: str = Query(...),
    deal: DealCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new deal in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare deal data (remove None values)
        deal_data = {k: v for k, v in deal.dict().items() if v is not None}

        # Create deal via adapter
        result = await adapter.create_deal(deal_data)

        logger.info(f"Deal created for {wallet_address[:10]}...: id={result.get('id')}")
        return {
            "success": True,
            "id": result.get("id"),
            "message": "Deal created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create deal for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    wallet_address: str = Query(...),
    deal: DealCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing deal in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare update data (remove None values)
        deal_data = {k: v for k, v in deal.dict().items() if v is not None}

        # Update deal via adapter
        result = await adapter.update_deal(deal_id, deal_data)

        logger.info(f"Deal updated for {wallet_address[:10]}...: id={deal_id}")
        return {
            "success": True,
            "message": "Deal updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update deal for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a deal from HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Delete deal via adapter
        await adapter.delete_deal(deal_id)

        logger.info(f"Deal deleted for {wallet_address[:10]}...: id={deal_id}")
        return {
            "success": True,
            "message": "Deal deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete deal for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


# Ticket endpoints
@router.post("/tickets")
async def create_ticket(
    wallet_address: str = Query(...),
    ticket: TicketCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new ticket in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare ticket data (remove None values)
        ticket_data = {k: v for k, v in ticket.dict().items() if v is not None}

        # Create ticket via adapter
        result = await adapter.create_ticket(ticket_data)

        logger.info(f"Ticket created for {wallet_address[:10]}...: id={result.get('id')}")
        return {
            "success": True,
            "id": result.get("id"),
            "message": "Ticket created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create ticket for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    wallet_address: str = Query(...),
    ticket: TicketCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing ticket in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Prepare update data (remove None values)
        ticket_data = {k: v for k, v in ticket.dict().items() if v is not None}

        # Update ticket via adapter
        result = await adapter.update_ticket(ticket_id, ticket_data)

        logger.info(f"Ticket updated for {wallet_address[:10]}...: id={ticket_id}")
        return {
            "success": True,
            "message": "Ticket updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticket for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete a ticket from HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)
        adapter = HubSpotSync({"access_token": access_token})

        # Delete ticket via adapter
        await adapter.delete_ticket(ticket_id)

        logger.info(f"Ticket deleted for {wallet_address[:10]}...: id={ticket_id}")
        return {
            "success": True,
            "message": "Ticket deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete ticket for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))
