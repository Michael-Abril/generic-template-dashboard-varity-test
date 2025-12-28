"""
HubSpot CRUD API Endpoints
Provides full Create, Read, Update, Delete operations for HubSpot CRM objects
"""
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.adapters.hubspot.sync import HubSpotSync

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


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


# Helper function to get HubSpot credentials
async def get_hubspot_credentials(wallet_address: str) -> dict:
    """Get HubSpot OAuth credentials from Filecoin storage"""
    try:
        # Retrieve encrypted credentials from Filecoin
        # NOTE: OAuth callback stores with data_type="oauth-credentials" (not "oauth_token")
        credentials_data = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration="hubspot",
            data_type="oauth-credentials"
        )

        if not credentials_data:
            raise HTTPException(
                status_code=404,
                detail="HubSpot not connected. Please connect via OAuth first."
            )

        # Get the most recent credentials
        latest_creds = max(credentials_data, key=lambda x: x.get("timestamp", ""))
        encrypted_blob = latest_creds.get("data")

        # Decrypt credentials
        decrypted = await encryption_service.decrypt_for_customer(
            encrypted_data=encrypted_blob,
            customer_wallet=wallet_address
        )

        return decrypted
    except Exception as e:
        logger.error(f"Failed to get HubSpot credentials: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve HubSpot credentials: {str(e)}"
        )


# Contact endpoints
@router.post("/contacts")
async def create_contact(
    wallet_address: str = Query(...),
    contact: ContactCreate = Body(...)
):
    """Create a new contact in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)

        # Initialize HubSpot adapter
        adapter = HubSpotSync(credentials)

        # Prepare contact data (remove None values)
        contact_data = {k: v for k, v in contact.dict().items() if v is not None}

        # Create contact via adapter
        result = await adapter.create_contact(contact_data)

        return {
            "success": True,
            "id": result.get("id"),
            "message": "Contact created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    wallet_address: str = Query(...),
    contact: ContactCreate = Body(...)
):
    """Update an existing contact in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare update data (remove None values)
        contact_data = {k: v for k, v in contact.dict().items() if v is not None}

        # Update contact via adapter
        result = await adapter.update_contact(contact_id, contact_data)

        return {
            "success": True,
            "message": "Contact updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: str,
    wallet_address: str = Query(...)
):
    """Delete a contact from HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Delete contact via adapter
        await adapter.delete_contact(contact_id)

        return {
            "success": True,
            "message": "Contact deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Company endpoints
@router.post("/companies")
async def create_company(
    wallet_address: str = Query(...),
    company: CompanyCreate = Body(...)
):
    """Create a new company in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare company data (remove None values)
        company_data = {k: v for k, v in company.dict().items() if v is not None}

        # Create company via adapter
        result = await adapter.create_company(company_data)

        return {
            "success": True,
            "id": result.get("id"),
            "message": "Company created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/companies/{company_id}")
async def update_company(
    company_id: str,
    wallet_address: str = Query(...),
    company: CompanyCreate = Body(...)
):
    """Update an existing company in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare update data (remove None values)
        company_data = {k: v for k, v in company.dict().items() if v is not None}

        # Update company via adapter
        result = await adapter.update_company(company_id, company_data)

        return {
            "success": True,
            "message": "Company updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/companies/{company_id}")
async def delete_company(
    company_id: str,
    wallet_address: str = Query(...)
):
    """Delete a company from HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Delete company via adapter
        await adapter.delete_company(company_id)

        return {
            "success": True,
            "message": "Company deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete company: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Deal endpoints
@router.post("/deals")
async def create_deal(
    wallet_address: str = Query(...),
    deal: DealCreate = Body(...)
):
    """Create a new deal in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare deal data (remove None values)
        deal_data = {k: v for k, v in deal.dict().items() if v is not None}

        # Create deal via adapter
        result = await adapter.create_deal(deal_data)

        return {
            "success": True,
            "id": result.get("id"),
            "message": "Deal created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create deal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/deals/{deal_id}")
async def update_deal(
    deal_id: str,
    wallet_address: str = Query(...),
    deal: DealCreate = Body(...)
):
    """Update an existing deal in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare update data (remove None values)
        deal_data = {k: v for k, v in deal.dict().items() if v is not None}

        # Update deal via adapter
        result = await adapter.update_deal(deal_id, deal_data)

        return {
            "success": True,
            "message": "Deal updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update deal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/deals/{deal_id}")
async def delete_deal(
    deal_id: str,
    wallet_address: str = Query(...)
):
    """Delete a deal from HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Delete deal via adapter
        await adapter.delete_deal(deal_id)

        return {
            "success": True,
            "message": "Deal deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete deal: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Ticket endpoints
@router.post("/tickets")
async def create_ticket(
    wallet_address: str = Query(...),
    ticket: TicketCreate = Body(...)
):
    """Create a new ticket in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare ticket data (remove None values)
        ticket_data = {k: v for k, v in ticket.dict().items() if v is not None}

        # Create ticket via adapter
        result = await adapter.create_ticket(ticket_data)

        return {
            "success": True,
            "id": result.get("id"),
            "message": "Ticket created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/tickets/{ticket_id}")
async def update_ticket(
    ticket_id: str,
    wallet_address: str = Query(...),
    ticket: TicketCreate = Body(...)
):
    """Update an existing ticket in HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Prepare update data (remove None values)
        ticket_data = {k: v for k, v in ticket.dict().items() if v is not None}

        # Update ticket via adapter
        result = await adapter.update_ticket(ticket_id, ticket_data)

        return {
            "success": True,
            "message": "Ticket updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/tickets/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    wallet_address: str = Query(...)
):
    """Delete a ticket from HubSpot"""
    try:
        credentials = await get_hubspot_credentials(wallet_address)
        adapter = HubSpotSync(credentials)

        # Delete ticket via adapter
        await adapter.delete_ticket(ticket_id)

        return {
            "success": True,
            "message": "Ticket deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete ticket: {e}")
        raise HTTPException(status_code=500, detail=str(e))
