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
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.models.purchase import OAuthToken
from app.api.v1.integrations import refresh_oauth_token
# Removed: from app.adapters.hubspot.sync import HubSpotSync (adapters deleted Jan 5, 2026)

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


class EmailCreate(BaseModel):
    """Email engagement creation request - Added Dec 28, 2025 to complete RAG coverage"""
    subject: str
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    from_email: Optional[str] = None
    to_email: str
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    association_type: Optional[str] = "contact"  # contact, company, or deal
    association_id: Optional[str] = None


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
    # Use timezone-naive datetime for comparison (OAuthToken.expires_at is timezone-naive)
    # FIX: Changed from datetime.now(timezone.utc) to datetime.utcnow() to avoid
    # "can't subtract offset-naive and offset-aware datetimes" error
    now = datetime.utcnow()
    if token.expires_at and token.expires_at < now:
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


# =====================================================================
# GET ENDPOINTS - List records from HubSpot
# These are LIVE API endpoints that query HubSpot in real-time
# =====================================================================

@router.get("/contacts")
async def list_contacts(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    List contacts from HubSpot.

    Returns contacts sorted by creation date (newest first).
    """
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.hubapi.com/crm/v3/objects/contacts",
                params={
                    "limit": limit,
                    "properties": "email,firstname,lastname,phone,company,jobtitle,lifecyclestage,createdate"
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"HubSpot contacts query failed: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.status_code}"
                )

            data = response.json()
            contacts = data.get("results", [])

            return {
                "success": True,
                "contacts": contacts,
                "total_count": len(contacts)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing HubSpot contacts: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/companies")
async def list_companies(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    List companies from HubSpot.

    Returns companies sorted by creation date (newest first).
    """
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.hubapi.com/crm/v3/objects/companies",
                params={
                    "limit": limit,
                    "properties": "name,domain,industry,phone,city,state,country,numberofemployees,annualrevenue,createdate"
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"HubSpot companies query failed: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.status_code}"
                )

            data = response.json()
            companies = data.get("results", [])

            return {
                "success": True,
                "companies": companies,
                "total_count": len(companies)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing HubSpot companies: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/deals")
async def list_deals(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    List deals from HubSpot.

    Returns deals sorted by creation date (newest first).
    """
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.hubapi.com/crm/v3/objects/deals",
                params={
                    "limit": limit,
                    "properties": "dealname,amount,dealstage,pipeline,closedate,hubspot_owner_id,createdate"
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"HubSpot deals query failed: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.status_code}"
                )

            data = response.json()
            deals = data.get("results", [])

            return {
                "success": True,
                "deals": deals,
                "total_count": len(deals)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing HubSpot deals: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


@router.get("/tickets")
async def list_tickets(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max records to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    List tickets from HubSpot.

    Returns tickets sorted by creation date (newest first).
    """
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.hubapi.com/crm/v3/objects/tickets",
                params={
                    "limit": limit,
                    "properties": "subject,content,hs_ticket_priority,hs_pipeline_stage,hubspot_owner_id,createdate"
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"HubSpot tickets query failed: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.status_code}"
                )

            data = response.json()
            tickets = data.get("results", [])

            return {
                "success": True,
                "tickets": tickets,
                "total_count": len(tickets)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing HubSpot tickets: {e}")
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =====================================================================
# POST ENDPOINTS - Create records in HubSpot
# =====================================================================

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


# ============================================================================
# EMAIL CRUD ENDPOINTS - Added Dec 28, 2025 to complete RAG coverage
# RAG stores emails, these endpoints provide real-time CRUD operations
# HubSpot uses "engagements" API for emails
# ============================================================================

@router.get("/emails")
async def list_emails(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(100, ge=1, le=500, description="Max emails to return"),
    contact_id: Optional[str] = Query(None, description="Filter by contact ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    List email engagements from HubSpot (LIVE API endpoint).

    This endpoint fetches email engagements directly from HubSpot API for real-time data.
    Emails in HubSpot are stored as "engagements" of type EMAIL.

    Returns emails with subject, from/to addresses, and timestamps.
    """
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient(timeout=30.0) as client:
            # HubSpot engagements API for listing emails
            # Use the v1 API which supports filtering by type
            response = await client.get(
                "https://api.hubapi.com/engagements/v1/engagements/paged",
                params={
                    "limit": limit
                },
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if response.status_code != 200:
                logger.error(f"HubSpot engagements query failed: {response.status_code}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.status_code}"
                )

            data = response.json()
            engagements = data.get("results", [])

            # Filter to only EMAIL type engagements
            emails = [
                {
                    "id": eng.get("engagement", {}).get("id"),
                    "subject": eng.get("metadata", {}).get("subject"),
                    "from_email": eng.get("metadata", {}).get("from", {}).get("email") if isinstance(eng.get("metadata", {}).get("from"), dict) else eng.get("metadata", {}).get("from"),
                    "to_emails": [t.get("email") if isinstance(t, dict) else t for t in eng.get("metadata", {}).get("to", [])],
                    "body_preview": (eng.get("metadata", {}).get("text") or "")[:200],
                    "has_html": bool(eng.get("metadata", {}).get("html")),
                    "created_at": eng.get("engagement", {}).get("createdAt"),
                    "timestamp": eng.get("engagement", {}).get("timestamp"),
                    "associations": eng.get("associations", {})
                }
                for eng in engagements
                if eng.get("engagement", {}).get("type") == "EMAIL"
            ]

            # If contact_id provided, filter by association
            if contact_id:
                emails = [
                    e for e in emails
                    if contact_id in str(e.get("associations", {}).get("contactIds", []))
                ]

            return {
                "success": True,
                "emails": emails,
                "count": len(emails),
                "is_live": True,
                "fetched_at": datetime.now(timezone.utc).isoformat()
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list emails for {wallet_address[:10]}...: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/emails")
async def create_email(
    wallet_address: str = Query(...),
    email: EmailCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create an email engagement in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        # Build email engagement data for HubSpot API
        engagement_data = {
            "engagement": {
                "active": True,
                "type": "EMAIL"
            },
            "metadata": {
                "subject": email.subject,
                "from": {"email": email.from_email} if email.from_email else None,
                "to": [{"email": email.to_email}]
            }
        }

        # Add body content
        if email.body_html:
            engagement_data["metadata"]["html"] = email.body_html
        if email.body_text:
            engagement_data["metadata"]["text"] = email.body_text

        # Add CC/BCC if provided
        if email.cc:
            engagement_data["metadata"]["cc"] = [{"email": e} for e in email.cc]
        if email.bcc:
            engagement_data["metadata"]["bcc"] = [{"email": e} for e in email.bcc]

        # Add associations if provided
        if email.association_id:
            association_key = f"{email.association_type}Ids" if email.association_type else "contactIds"
            engagement_data["associations"] = {
                association_key: [int(email.association_id)] if email.association_id.isdigit() else []
            }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.hubapi.com/engagements/v1/engagements",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=engagement_data,
                timeout=30.0
            )

            if response.status_code == 200:
                result = response.json()
                logger.info(f"Email created for {wallet_address[:10]}...: id={result.get('engagement', {}).get('id')}")
                return {
                    "success": True,
                    "id": str(result.get("engagement", {}).get("id")),
                    "message": "Email engagement created successfully"
                }
            else:
                logger.error(f"HubSpot API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.text[:200]}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create email for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/emails/{email_id}")
async def update_email(
    email_id: str,
    wallet_address: str = Query(...),
    subject: Optional[str] = Body(None),
    body_html: Optional[str] = Body(None),
    body_text: Optional[str] = Body(None),
    db: AsyncSession = Depends(get_db)
):
    """Update an email engagement in HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        update_data = {"metadata": {}}
        if subject is not None:
            update_data["metadata"]["subject"] = subject
        if body_html is not None:
            update_data["metadata"]["html"] = body_html
        if body_text is not None:
            update_data["metadata"]["text"] = body_text

        if not update_data["metadata"]:
            raise HTTPException(status_code=400, detail="No fields to update")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"https://api.hubapi.com/engagements/v1/engagements/{email_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=update_data,
                timeout=30.0
            )

            if response.status_code == 200:
                logger.info(f"Email updated for {wallet_address[:10]}...: id={email_id}")
                return {
                    "success": True,
                    "message": "Email engagement updated successfully"
                }
            else:
                logger.error(f"HubSpot API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.text[:200]}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update email for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/emails/{email_id}")
async def delete_email(
    email_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete an email engagement from HubSpot"""
    try:
        access_token = await get_hubspot_access_token(wallet_address, db)

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"https://api.hubapi.com/engagements/v1/engagements/{email_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code == 204:
                logger.info(f"Email deleted for {wallet_address[:10]}...: id={email_id}")
                return {
                    "success": True,
                    "message": "Email engagement deleted successfully"
                }
            else:
                logger.error(f"HubSpot API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"HubSpot API error: {response.text[:200]}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete email for {wallet_address[:10]}...")
        raise HTTPException(status_code=500, detail=str(e))
