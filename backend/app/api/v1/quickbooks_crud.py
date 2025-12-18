"""
QuickBooks CRUD API Endpoints
Provides full Create, Read, Update, Delete operations for QuickBooks objects
"""
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.adapters.quickbooks.sync import QuickBooksSync

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# Pydantic models for request/response
class InvoiceLineItem(BaseModel):
    """Invoice line item"""
    description: str
    quantity: float
    rate: float
    amount: Optional[float] = None


class InvoiceCreate(BaseModel):
    """Invoice creation request"""
    customer_id: str
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: str
    due_date: str
    terms: Optional[str] = "Net 30"
    line_items: List[InvoiceLineItem]
    discount: Optional[float] = 0
    tax: Optional[float] = 0
    notes: Optional[str] = None


class CustomerCreate(BaseModel):
    """Customer creation request"""
    display_name: str
    company_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    website: Optional[str] = None
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_postal_code: Optional[str] = None
    billing_country: Optional[str] = "US"
    notes: Optional[str] = None
    tax_exempt: Optional[bool] = False


class ExpenseCreate(BaseModel):
    """Expense creation request"""
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    category: str
    date: str
    amount: float
    payment_method: str
    payment_account: Optional[str] = None
    reference_number: Optional[str] = None
    memo: Optional[str] = None
    billable: Optional[bool] = False
    customer_id: Optional[str] = None


class VendorCreate(BaseModel):
    """Vendor creation request"""
    display_name: str
    company_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    billing_street: Optional[str] = None
    billing_city: Optional[str] = None
    billing_state: Optional[str] = None
    billing_postal_code: Optional[str] = None


# Helper function to get QuickBooks credentials
async def get_quickbooks_credentials(wallet_address: str) -> dict:
    """Get QuickBooks OAuth credentials from Filecoin storage"""
    try:
        # Retrieve encrypted credentials from Filecoin
        credentials_data = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration="quickbooks",
            data_type="oauth_token"
        )

        if not credentials_data:
            raise HTTPException(
                status_code=404,
                detail="QuickBooks not connected. Please connect via OAuth first."
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
        logger.error(f"Failed to get QuickBooks credentials: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve QuickBooks credentials: {str(e)}"
        )


async def make_qb_request(
    credentials: dict,
    method: str,
    endpoint: str,
    data: Optional[dict] = None
) -> dict:
    """Make API request to QuickBooks"""
    access_token = credentials.get("access_token")
    realm_id = credentials.get("realm_id")

    if not access_token or not realm_id:
        raise HTTPException(
            status_code=400,
            detail="Invalid QuickBooks credentials"
        )

    base_url = "https://quickbooks.api.intuit.com/v3/company"
    url = f"{base_url}/{realm_id}/{endpoint}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(
                    url,
                    headers=headers,
                    timeout=30.0
                )
            elif method == "POST":
                response = await client.post(
                    url,
                    headers=headers,
                    json=data,
                    timeout=30.0
                )
            elif method == "DELETE":
                response = await client.delete(
                    url,
                    headers=headers,
                    timeout=30.0
                )
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            response.raise_for_status()

            # QuickBooks returns empty body for DELETE
            if method == "DELETE":
                return {"success": True}

            return response.json()

        except httpx.HTTPStatusError as e:
            logger.error(f"QuickBooks API error: {e.response.text}")
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"QuickBooks API error: {e.response.text}"
            )


# INVOICE ENDPOINTS
@router.post("/invoices")
async def create_invoice(
    wallet_address: str = Query(...),
    invoice: InvoiceCreate = Body(...)
):
    """Create a new invoice in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Build QuickBooks Invoice object
        qb_invoice = {
            "CustomerRef": {
                "value": invoice.customer_id
            },
            "TxnDate": invoice.invoice_date,
            "DueDate": invoice.due_date,
            "Line": []
        }

        # Add document number if provided
        if invoice.invoice_number:
            qb_invoice["DocNumber"] = invoice.invoice_number

        # Add line items
        line_num = 1
        for item in invoice.line_items:
            amount = item.amount if item.amount is not None else (item.quantity * item.rate)
            qb_invoice["Line"].append({
                "DetailType": "SalesItemLineDetail",
                "Amount": amount,
                "Description": item.description,
                "SalesItemLineDetail": {
                    "Qty": item.quantity,
                    "UnitPrice": item.rate
                },
                "LineNum": line_num
            })
            line_num += 1

        # Add discount if provided
        if invoice.discount and invoice.discount > 0:
            qb_invoice["Line"].append({
                "DetailType": "DiscountLineDetail",
                "Amount": invoice.discount,
                "DiscountLineDetail": {
                    "PercentBased": False
                }
            })

        # Add custom field for notes if provided
        if invoice.notes:
            qb_invoice["CustomerMemo"] = {
                "value": invoice.notes
            }

        # Make API call
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="invoice",
            data=qb_invoice
        )

        invoice_data = result.get("Invoice", {})

        return {
            "success": True,
            "id": invoice_data.get("Id"),
            "doc_number": invoice_data.get("DocNumber"),
            "total": invoice_data.get("TotalAmt"),
            "message": "Invoice created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/invoices/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    wallet_address: str = Query(...),
    invoice: InvoiceCreate = Body(...)
):
    """Update an existing invoice in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # First, retrieve the existing invoice to get SyncToken
        existing = await make_qb_request(
            credentials=credentials,
            method="GET",
            endpoint=f"invoice/{invoice_id}"
        )

        existing_invoice = existing.get("Invoice", {})
        sync_token = existing_invoice.get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        # Build update object (same as create but with Id and SyncToken)
        qb_invoice = {
            "Id": invoice_id,
            "SyncToken": sync_token,
            "CustomerRef": {
                "value": invoice.customer_id
            },
            "TxnDate": invoice.invoice_date,
            "DueDate": invoice.due_date,
            "Line": []
        }

        if invoice.invoice_number:
            qb_invoice["DocNumber"] = invoice.invoice_number

        # Add line items
        line_num = 1
        for item in invoice.line_items:
            amount = item.amount if item.amount is not None else (item.quantity * item.rate)
            qb_invoice["Line"].append({
                "DetailType": "SalesItemLineDetail",
                "Amount": amount,
                "Description": item.description,
                "SalesItemLineDetail": {
                    "Qty": item.quantity,
                    "UnitPrice": item.rate
                },
                "LineNum": line_num
            })
            line_num += 1

        if invoice.notes:
            qb_invoice["CustomerMemo"] = {
                "value": invoice.notes
            }

        # Make API call
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="invoice",
            data=qb_invoice
        )

        return {
            "success": True,
            "message": "Invoice updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/invoices/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    wallet_address: str = Query(...)
):
    """Delete an invoice from QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # First retrieve to get SyncToken
        existing = await make_qb_request(
            credentials=credentials,
            method="GET",
            endpoint=f"invoice/{invoice_id}"
        )

        sync_token = existing.get("Invoice", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        # QuickBooks uses POST with operation=delete
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="invoice",
            data={
                "Id": invoice_id,
                "SyncToken": sync_token
            }
        )

        return {
            "success": True,
            "message": "Invoice deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    wallet_address: str = Query(...),
    email: Optional[str] = Query(None)
):
    """Send invoice via email"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # QuickBooks has a separate send endpoint
        access_token = credentials.get("access_token")
        realm_id = credentials.get("realm_id")

        url = f"https://quickbooks.api.intuit.com/v3/company/{realm_id}/invoice/{invoice_id}/send"
        if email:
            url += f"?sendTo={email}"

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()

        return {
            "success": True,
            "message": "Invoice sent successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# CUSTOMER ENDPOINTS
@router.post("/customers")
async def create_customer(
    wallet_address: str = Query(...),
    customer: CustomerCreate = Body(...)
):
    """Create a new customer in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Build QuickBooks Customer object
        qb_customer = {
            "DisplayName": customer.display_name
        }

        if customer.company_name:
            qb_customer["CompanyName"] = customer.company_name
        if customer.first_name:
            qb_customer["GivenName"] = customer.first_name
        if customer.last_name:
            qb_customer["FamilyName"] = customer.last_name

        if customer.email:
            qb_customer["PrimaryEmailAddr"] = {
                "Address": customer.email
            }

        if customer.phone:
            qb_customer["PrimaryPhone"] = {
                "FreeFormNumber": customer.phone
            }

        if customer.mobile:
            qb_customer["Mobile"] = {
                "FreeFormNumber": customer.mobile
            }

        if customer.website:
            qb_customer["WebAddr"] = {
                "URI": customer.website
            }

        # Billing address
        if any([customer.billing_street, customer.billing_city, customer.billing_state]):
            qb_customer["BillAddr"] = {}
            if customer.billing_street:
                qb_customer["BillAddr"]["Line1"] = customer.billing_street
            if customer.billing_city:
                qb_customer["BillAddr"]["City"] = customer.billing_city
            if customer.billing_state:
                qb_customer["BillAddr"]["CountrySubDivisionCode"] = customer.billing_state
            if customer.billing_postal_code:
                qb_customer["BillAddr"]["PostalCode"] = customer.billing_postal_code
            if customer.billing_country:
                qb_customer["BillAddr"]["Country"] = customer.billing_country

        if customer.notes:
            qb_customer["Notes"] = customer.notes

        if customer.tax_exempt:
            qb_customer["TaxExemptionReasonId"] = 1

        # Make API call
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="customer",
            data=qb_customer
        )

        customer_data = result.get("Customer", {})

        return {
            "success": True,
            "id": customer_data.get("Id"),
            "display_name": customer_data.get("DisplayName"),
            "message": "Customer created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/customers/{customer_id}")
async def update_customer(
    customer_id: str,
    wallet_address: str = Query(...),
    customer: CustomerCreate = Body(...)
):
    """Update an existing customer in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Get existing customer for SyncToken
        existing = await make_qb_request(
            credentials=credentials,
            method="GET",
            endpoint=f"customer/{customer_id}"
        )

        sync_token = existing.get("Customer", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # Build update object
        qb_customer = {
            "Id": customer_id,
            "SyncToken": sync_token,
            "DisplayName": customer.display_name
        }

        # Add optional fields (same as create)
        if customer.company_name:
            qb_customer["CompanyName"] = customer.company_name
        if customer.first_name:
            qb_customer["GivenName"] = customer.first_name
        if customer.last_name:
            qb_customer["FamilyName"] = customer.last_name

        if customer.email:
            qb_customer["PrimaryEmailAddr"] = {"Address": customer.email}
        if customer.phone:
            qb_customer["PrimaryPhone"] = {"FreeFormNumber": customer.phone}
        if customer.mobile:
            qb_customer["Mobile"] = {"FreeFormNumber": customer.mobile}
        if customer.website:
            qb_customer["WebAddr"] = {"URI": customer.website}

        if any([customer.billing_street, customer.billing_city, customer.billing_state]):
            qb_customer["BillAddr"] = {}
            if customer.billing_street:
                qb_customer["BillAddr"]["Line1"] = customer.billing_street
            if customer.billing_city:
                qb_customer["BillAddr"]["City"] = customer.billing_city
            if customer.billing_state:
                qb_customer["BillAddr"]["CountrySubDivisionCode"] = customer.billing_state
            if customer.billing_postal_code:
                qb_customer["BillAddr"]["PostalCode"] = customer.billing_postal_code

        if customer.notes:
            qb_customer["Notes"] = customer.notes

        # Make API call
        await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="customer",
            data=qb_customer
        )

        return {
            "success": True,
            "message": "Customer updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/customers/{customer_id}")
async def delete_customer(
    customer_id: str,
    wallet_address: str = Query(...)
):
    """Delete a customer from QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Get SyncToken
        existing = await make_qb_request(
            credentials=credentials,
            method="GET",
            endpoint=f"customer/{customer_id}"
        )

        sync_token = existing.get("Customer", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        # Delete
        await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="customer",
            data={
                "Id": customer_id,
                "SyncToken": sync_token
            }
        )

        return {
            "success": True,
            "message": "Customer deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# EXPENSE ENDPOINTS
@router.post("/expenses")
async def create_expense(
    wallet_address: str = Query(...),
    expense: ExpenseCreate = Body(...)
):
    """Create a new expense in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Build QuickBooks Purchase (Expense) object
        qb_expense = {
            "PaymentType": expense.payment_method,
            "TxnDate": expense.date,
            "TotalAmt": expense.amount,
            "Line": [
                {
                    "DetailType": "AccountBasedExpenseLineDetail",
                    "Amount": expense.amount,
                    "Description": expense.memo or expense.category,
                    "AccountBasedExpenseLineDetail": {
                        # You would need to map category to account
                        # For now using a default expense account
                        "AccountRef": {
                            "name": expense.category
                        }
                    }
                }
            ]
        }

        if expense.vendor_id:
            qb_expense["EntityRef"] = {
                "value": expense.vendor_id
            }

        if expense.reference_number:
            qb_expense["DocNumber"] = expense.reference_number

        if expense.payment_account:
            qb_expense["AccountRef"] = {
                "name": expense.payment_account
            }

        if expense.billable and expense.customer_id:
            qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["BillableStatus"] = "Billable"
            qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["CustomerRef"] = {
                "value": expense.customer_id
            }

        # Make API call
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="purchase",
            data=qb_expense
        )

        expense_data = result.get("Purchase", {})

        return {
            "success": True,
            "id": expense_data.get("Id"),
            "total": expense_data.get("TotalAmt"),
            "message": "Expense created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/expenses/{expense_id}")
async def update_expense(
    expense_id: str,
    wallet_address: str = Query(...),
    expense: ExpenseCreate = Body(...)
):
    """Update an existing expense in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Get existing for SyncToken
        existing = await make_qb_request(
            credentials=credentials,
            method="GET",
            endpoint=f"purchase/{expense_id}"
        )

        sync_token = existing.get("Purchase", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Expense not found"
            )

        # Build update object (similar to create)
        qb_expense = {
            "Id": expense_id,
            "SyncToken": sync_token,
            "PaymentType": expense.payment_method,
            "TxnDate": expense.date,
            "TotalAmt": expense.amount,
            "Line": [
                {
                    "DetailType": "AccountBasedExpenseLineDetail",
                    "Amount": expense.amount,
                    "Description": expense.memo or expense.category,
                    "AccountBasedExpenseLineDetail": {
                        "AccountRef": {
                            "name": expense.category
                        }
                    }
                }
            ]
        }

        if expense.vendor_id:
            qb_expense["EntityRef"] = {"value": expense.vendor_id}
        if expense.reference_number:
            qb_expense["DocNumber"] = expense.reference_number

        # Make API call
        await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="purchase",
            data=qb_expense
        )

        return {
            "success": True,
            "message": "Expense updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# VENDOR ENDPOINTS
@router.post("/vendors")
async def create_vendor(
    wallet_address: str = Query(...),
    vendor: VendorCreate = Body(...)
):
    """Create a new vendor in QuickBooks"""
    try:
        credentials = await get_quickbooks_credentials(wallet_address)

        # Build QuickBooks Vendor object
        qb_vendor = {
            "DisplayName": vendor.display_name
        }

        if vendor.company_name:
            qb_vendor["CompanyName"] = vendor.company_name

        if vendor.email:
            qb_vendor["PrimaryEmailAddr"] = {
                "Address": vendor.email
            }

        if vendor.phone:
            qb_vendor["PrimaryPhone"] = {
                "FreeFormNumber": vendor.phone
            }

        if vendor.website:
            qb_vendor["WebAddr"] = {
                "URI": vendor.website
            }

        # Billing address
        if any([vendor.billing_street, vendor.billing_city, vendor.billing_state]):
            qb_vendor["BillAddr"] = {}
            if vendor.billing_street:
                qb_vendor["BillAddr"]["Line1"] = vendor.billing_street
            if vendor.billing_city:
                qb_vendor["BillAddr"]["City"] = vendor.billing_city
            if vendor.billing_state:
                qb_vendor["BillAddr"]["CountrySubDivisionCode"] = vendor.billing_state
            if vendor.billing_postal_code:
                qb_vendor["BillAddr"]["PostalCode"] = vendor.billing_postal_code

        # Make API call
        result = await make_qb_request(
            credentials=credentials,
            method="POST",
            endpoint="vendor",
            data=qb_vendor
        )

        vendor_data = result.get("Vendor", {})

        return {
            "success": True,
            "id": vendor_data.get("Id"),
            "display_name": vendor_data.get("DisplayName"),
            "message": "Vendor created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))
