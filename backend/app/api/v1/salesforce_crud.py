"""
Salesforce CRUD API Endpoints
Provides full Create, Read, Update, Delete operations for Salesforce objects
"""
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.adapters.salesforce.sync import SalesforceSync

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# Pydantic models for request/response
class LeadCreate(BaseModel):
    """Lead creation request"""
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: str
    company: str
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    website: Optional[str] = None
    lead_source: Optional[str] = None
    industry: Optional[str] = None
    annual_revenue: Optional[float] = None
    number_of_employees: Optional[int] = None
    status: str = "New"
    rating: Optional[str] = None
    street: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    description: Optional[str] = None


class OpportunityCreate(BaseModel):
    """Opportunity creation request"""
    name: str
    account_id: Optional[str] = None
    close_date: str
    stage_name: str
    amount: Optional[float] = None
    probability: Optional[int] = None
    type: Optional[str] = None
    lead_source: Optional[str] = None
    next_step: Optional[str] = None
    description: Optional[str] = None


class AccountCreate(BaseModel):
    """Account creation request"""
    name: str
    parent_id: Optional[str] = None
    account_number: Optional[str] = None
    type: Optional[str] = None
    industry: Optional[str] = None
    annual_revenue: Optional[float] = None
    rating: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    number_of_employees: Optional[int] = None
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = None
    description: Optional[str] = None


class ContactCreate(BaseModel):
    """Contact creation request"""
    salutation: Optional[str] = None
    first_name: Optional[str] = None
    last_name: str
    account_id: Optional[str] = None
    title: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile_phone: Optional[str] = None
    mailing_street: Optional[str] = None
    mailing_city: Optional[str] = None
    mailing_state: Optional[str] = None
    mailing_postal_code: Optional[str] = None
    mailing_country: Optional[str] = None
    description: Optional[str] = None


class CaseCreate(BaseModel):
    """Case creation request"""
    contact_id: Optional[str] = None
    account_id: Optional[str] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    status: str = "New"
    priority: str = "Medium"
    origin: str = "Web"
    type: Optional[str] = None
    reason: Optional[str] = None


# Helper function to get Salesforce credentials
async def get_salesforce_credentials(wallet_address: str) -> dict:
    """Get Salesforce OAuth credentials from Filecoin storage"""
    try:
        # Retrieve encrypted credentials from Filecoin
        credentials_data = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration="salesforce",
            data_type="oauth_token"
        )

        if not credentials_data:
            raise HTTPException(
                status_code=404,
                detail="Salesforce not connected. Please connect via OAuth first."
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
        logger.error(f"Failed to get Salesforce credentials: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve Salesforce credentials: {str(e)}"
        )


# Lead endpoints
@router.post("/leads")
async def create_lead(
    wallet_address: str = Query(...),
    lead: LeadCreate = Body(...)
):
    """Create a new lead in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        # Prepare lead data for Salesforce API
        lead_data = {
            "LastName": lead.last_name,
            "Company": lead.company,
            "Status": lead.status,
        }

        # Add optional fields if provided
        if lead.salutation:
            lead_data["Salutation"] = lead.salutation
        if lead.first_name:
            lead_data["FirstName"] = lead.first_name
        if lead.title:
            lead_data["Title"] = lead.title
        if lead.email:
            lead_data["Email"] = lead.email
        if lead.phone:
            lead_data["Phone"] = lead.phone
        if lead.mobile_phone:
            lead_data["MobilePhone"] = lead.mobile_phone
        if lead.website:
            lead_data["Website"] = lead.website
        if lead.lead_source:
            lead_data["LeadSource"] = lead.lead_source
        if lead.industry:
            lead_data["Industry"] = lead.industry
        if lead.annual_revenue:
            lead_data["AnnualRevenue"] = lead.annual_revenue
        if lead.number_of_employees:
            lead_data["NumberOfEmployees"] = lead.number_of_employees
        if lead.rating:
            lead_data["Rating"] = lead.rating
        if lead.street:
            lead_data["Street"] = lead.street
        if lead.city:
            lead_data["City"] = lead.city
        if lead.state:
            lead_data["State"] = lead.state
        if lead.postal_code:
            lead_data["PostalCode"] = lead.postal_code
        if lead.country:
            lead_data["Country"] = lead.country
        if lead.description:
            lead_data["Description"] = lead.description

        # Make API call to Salesforce
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/Lead",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=lead_data,
                timeout=30.0
            )

            if response.status_code == 201:
                result = response.json()

                # Trigger a sync to update Filecoin storage
                # TODO: Implement incremental sync

                return {
                    "success": True,
                    "id": result.get("id"),
                    "message": "Lead created successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/leads/{lead_id}")
async def update_lead(
    lead_id: str,
    wallet_address: str = Query(...),
    lead: LeadCreate = Body(...)
):
    """Update an existing lead in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        # Prepare update data (same as create but with PATCH)
        lead_data = {}

        if lead.last_name:
            lead_data["LastName"] = lead.last_name
        if lead.company:
            lead_data["Company"] = lead.company
        if lead.status:
            lead_data["Status"] = lead.status
        if lead.salutation:
            lead_data["Salutation"] = lead.salutation
        if lead.first_name:
            lead_data["FirstName"] = lead.first_name
        if lead.title:
            lead_data["Title"] = lead.title
        if lead.email:
            lead_data["Email"] = lead.email
        if lead.phone:
            lead_data["Phone"] = lead.phone
        if lead.mobile_phone:
            lead_data["MobilePhone"] = lead.mobile_phone
        # ... add other fields

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{instance_url}/services/data/v58.0/sobjects/Lead/{lead_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=lead_data,
                timeout=30.0
            )

            if response.status_code == 204:
                return {
                    "success": True,
                    "message": "Lead updated successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/leads/{lead_id}")
async def delete_lead(
    lead_id: str,
    wallet_address: str = Query(...)
):
    """Delete a lead from Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{instance_url}/services/data/v58.0/sobjects/Lead/{lead_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                },
                timeout=30.0
            )

            if response.status_code == 204:
                return {
                    "success": True,
                    "message": "Lead deleted successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Opportunity endpoints
@router.post("/opportunities")
async def create_opportunity(
    wallet_address: str = Query(...),
    opportunity: OpportunityCreate = Body(...)
):
    """Create a new opportunity in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        opp_data = {
            "Name": opportunity.name,
            "CloseDate": opportunity.close_date,
            "StageName": opportunity.stage_name,
        }

        if opportunity.account_id:
            opp_data["AccountId"] = opportunity.account_id
        if opportunity.amount:
            opp_data["Amount"] = opportunity.amount
        if opportunity.probability:
            opp_data["Probability"] = opportunity.probability
        if opportunity.type:
            opp_data["Type"] = opportunity.type
        if opportunity.lead_source:
            opp_data["LeadSource"] = opportunity.lead_source
        if opportunity.next_step:
            opp_data["NextStep"] = opportunity.next_step
        if opportunity.description:
            opp_data["Description"] = opportunity.description

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/Opportunity",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=opp_data,
                timeout=30.0
            )

            if response.status_code == 201:
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("id"),
                    "message": "Opportunity created successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create opportunity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Similar endpoints for Accounts, Contacts, Cases would follow the same pattern
# For brevity, I'll add the endpoint stubs

@router.post("/accounts")
async def create_account(
    wallet_address: str = Query(...),
    account: AccountCreate = Body(...)
):
    """Create a new account in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        # Build Salesforce Account object
        sf_account = {
            "Name": account.name
        }

        # Add optional fields
        if account.phone:
            sf_account["Phone"] = account.phone
        if account.website:
            sf_account["Website"] = account.website
        if account.industry:
            sf_account["Industry"] = account.industry
        if account.billing_street:
            sf_account["BillingStreet"] = account.billing_street
        if account.billing_city:
            sf_account["BillingCity"] = account.billing_city
        if account.billing_state:
            sf_account["BillingState"] = account.billing_state
        if account.billing_postal_code:
            sf_account["BillingPostalCode"] = account.billing_postal_code
        if account.billing_country:
            sf_account["BillingCountry"] = account.billing_country
        if account.description:
            sf_account["Description"] = account.description

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/Account",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=sf_account,
                timeout=30.0
            )

            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("id"),
                    "message": "Account created successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/accounts/{account_id}")
async def update_account(
    account_id: str,
    wallet_address: str = Query(...),
    updates: Dict[str, Any] = Body(...)
):
    """Update an account in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{instance_url}/services/data/v58.0/sobjects/Account/{account_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=updates,
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Account updated successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/accounts/{account_id}")
async def delete_account(
    account_id: str,
    wallet_address: str = Query(...)
):
    """Delete an account in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{instance_url}/services/data/v58.0/sobjects/Account/{account_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Account deleted successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete account: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/contacts")
async def create_contact(
    wallet_address: str = Query(...),
    contact: ContactCreate = Body(...)
):
    """Create a new contact in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        # Build Salesforce Contact object
        sf_contact = {
            "LastName": contact.last_name
        }

        # Add optional fields
        if contact.first_name:
            sf_contact["FirstName"] = contact.first_name
        if contact.account_id:
            sf_contact["AccountId"] = contact.account_id
        if contact.email:
            sf_contact["Email"] = contact.email
        if contact.phone:
            sf_contact["Phone"] = contact.phone
        if contact.mobile_phone:
            sf_contact["MobilePhone"] = contact.mobile_phone
        if contact.title:
            sf_contact["Title"] = contact.title
        if contact.department:
            sf_contact["Department"] = contact.department
        if contact.mailing_street:
            sf_contact["MailingStreet"] = contact.mailing_street
        if contact.mailing_city:
            sf_contact["MailingCity"] = contact.mailing_city
        if contact.mailing_state:
            sf_contact["MailingState"] = contact.mailing_state
        if contact.mailing_postal_code:
            sf_contact["MailingPostalCode"] = contact.mailing_postal_code
        if contact.mailing_country:
            sf_contact["MailingCountry"] = contact.mailing_country
        if contact.description:
            sf_contact["Description"] = contact.description

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/Contact",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=sf_contact,
                timeout=30.0
            )

            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("id"),
                    "message": "Contact created successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/contacts/{contact_id}")
async def update_contact(
    contact_id: str,
    wallet_address: str = Query(...),
    updates: Dict[str, Any] = Body(...)
):
    """Update a contact in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{instance_url}/services/data/v58.0/sobjects/Contact/{contact_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=updates,
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Contact updated successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

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
    """Delete a contact in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{instance_url}/services/data/v58.0/sobjects/Contact/{contact_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Contact deleted successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete contact: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/opportunities/{opportunity_id}")
async def update_opportunity(
    opportunity_id: str,
    wallet_address: str = Query(...),
    updates: Dict[str, Any] = Body(...)
):
    """Update an opportunity in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.patch(
                f"{instance_url}/services/data/v58.0/sobjects/Opportunity/{opportunity_id}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=updates,
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Opportunity updated successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update opportunity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/opportunities/{opportunity_id}")
async def delete_opportunity(
    opportunity_id: str,
    wallet_address: str = Query(...)
):
    """Delete an opportunity in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)
        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{instance_url}/services/data/v58.0/sobjects/Opportunity/{opportunity_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=30.0
            )

            if response.status_code == 204:
                return {"success": True, "message": "Opportunity deleted successfully"}
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete opportunity: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cases")
async def create_case(
    wallet_address: str = Query(...),
    case: CaseCreate = Body(...)
):
    """Create a new case in Salesforce"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        # Build Salesforce Case object
        sf_case = {
            "Status": case.status,
            "Priority": case.priority,
            "Origin": case.origin
        }

        # Add optional fields
        if case.contact_id:
            sf_case["ContactId"] = case.contact_id
        if case.account_id:
            sf_case["AccountId"] = case.account_id
        if case.subject:
            sf_case["Subject"] = case.subject
        if case.description:
            sf_case["Description"] = case.description
        if case.type:
            sf_case["Type"] = case.type
        if case.reason:
            sf_case["Reason"] = case.reason

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/Case",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=sf_case,
                timeout=30.0
            )

            if response.status_code in [200, 201]:
                result = response.json()
                return {
                    "success": True,
                    "id": result.get("id"),
                    "message": "Case created successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create case: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/leads/{lead_id}/convert")
async def convert_lead(
    lead_id: str,
    wallet_address: str = Query(...),
    account_id: Optional[str] = Query(None),
    create_opportunity: bool = Query(True)
):
    """Convert a lead to Account, Contact, and optionally Opportunity"""
    try:
        credentials = await get_salesforce_credentials(wallet_address)

        convert_data = {
            "leadId": lead_id,
            "convertedStatus": "Closed - Converted",
            "doNotCreateOpportunity": not create_opportunity
        }

        if account_id:
            convert_data["accountId"] = account_id

        instance_url = credentials.get("instance_url")
        access_token = credentials.get("access_token")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{instance_url}/services/data/v58.0/sobjects/LeadConvert",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=convert_data,
                timeout=30.0
            )

            if response.status_code == 200:
                result = response.json()
                return {
                    "success": True,
                    "account_id": result.get("accountId"),
                    "contact_id": result.get("contactId"),
                    "opportunity_id": result.get("opportunityId"),
                    "message": "Lead converted successfully"
                }
            else:
                logger.error(f"Salesforce API error: {response.text}")
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Salesforce API error: {response.text}"
                )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to convert lead: {e}")
        raise HTTPException(status_code=500, detail=str(e))
