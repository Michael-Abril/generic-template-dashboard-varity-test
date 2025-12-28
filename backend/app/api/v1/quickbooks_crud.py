"""
QuickBooks CRUD API Endpoints
Provides full Create, Read, Update, Delete operations for QuickBooks objects

Completed December 28, 2025:
- Refactored to use Database OAuthToken model (same pattern as google.py, salesforce_crud.py)
- Added GET endpoints for synced data retrieval from Filecoin storage
- Completed all CRUD operations for Invoices, Customers, Expenses, Vendors, Payments
- Added pagination support for large datasets
- Added comprehensive error handling for QuickBooks API responses
- Added SyncToken handling for optimistic locking
"""
from fastapi import APIRouter, HTTPException, Query, Body, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Tuple
import httpx
import logging
from datetime import datetime
import json

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.database import get_db
from app.models.purchase import OAuthToken
from app.api.v1.integrations import refresh_oauth_token
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.adapters.quickbooks.sync import QuickBooksSync

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()


# =============================================================================
# Error Handling Utilities
# =============================================================================

def sanitize_quickbooks_error(response_text: str) -> str:
    """
    Remove sensitive data from QuickBooks API error responses.
    Only returns safe error fields, never exposes tokens or internal details.
    """
    try:
        error_data = json.loads(response_text)

        # QuickBooks returns errors in a Fault structure
        if isinstance(error_data, dict):
            fault = error_data.get("Fault", {})
            if fault:
                errors = fault.get("Error", [])
                safe_errors = []
                for err in errors:
                    if isinstance(err, dict):
                        safe_err = {}
                        if "code" in err:
                            safe_err["code"] = err["code"]
                        if "Message" in err:
                            safe_err["message"] = err["Message"]
                        if "Detail" in err:
                            safe_err["detail"] = err["Detail"]
                        if "element" in err:
                            safe_err["element"] = err["element"]
                        safe_errors.append(safe_err)
                return json.dumps(safe_errors) if safe_errors else "QuickBooks API error"

            # Handle other error formats
            safe_fields = ["error", "error_description", "message", "code"]
            sanitized = {k: v for k, v in error_data.items() if k in safe_fields}
            return json.dumps(sanitized) if sanitized else "QuickBooks API error"

        return "QuickBooks API error"
    except json.JSONDecodeError:
        return "QuickBooks API error"


class QuickBooksAPIError(Exception):
    """Custom exception for QuickBooks API errors with categorization"""

    def __init__(self, status_code: int, message: str, error_code: Optional[str] = None):
        self.status_code = status_code
        self.message = message
        self.error_code = error_code
        super().__init__(message)


def handle_quickbooks_response(response: httpx.Response, operation: str) -> None:
    """
    Handle QuickBooks API response and raise appropriate exceptions.

    Args:
        response: The httpx response object
        operation: Description of the operation for error messages

    Raises:
        HTTPException with appropriate status code and message
    """
    if response.status_code in (200, 201, 204):
        return  # Success

    error_message = sanitize_quickbooks_error(response.text)

    if response.status_code == 400:
        # Bad Request - usually validation errors or stale SyncToken
        try:
            error_data = json.loads(response.text)
            fault = error_data.get("Fault", {})
            errors = fault.get("Error", [])
            if errors:
                code = errors[0].get("code", "")
                if code == "5010":  # Stale Object
                    raise HTTPException(
                        status_code=409,
                        detail="Data has been modified by another user. Please refresh and try again. (SyncToken conflict)"
                    )
        except json.JSONDecodeError:
            pass
        raise HTTPException(
            status_code=400,
            detail=f"Invalid request for {operation}: {error_message}"
        )

    elif response.status_code == 401:
        raise HTTPException(
            status_code=401,
            detail="QuickBooks authentication failed. Token may have expired. Please reconnect."
        )

    elif response.status_code == 403:
        raise HTTPException(
            status_code=403,
            detail="QuickBooks access denied. Your app may not have production approval or required permissions."
        )

    elif response.status_code == 404:
        raise HTTPException(
            status_code=404,
            detail=f"QuickBooks resource not found for {operation}"
        )

    elif response.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="QuickBooks rate limit exceeded. Please wait and try again."
        )

    elif response.status_code >= 500:
        raise HTTPException(
            status_code=502,
            detail="QuickBooks service temporarily unavailable. Please try again later."
        )

    else:
        logger.error(f"QuickBooks API error ({response.status_code}): {response.text}")
        raise HTTPException(
            status_code=response.status_code,
            detail=f"QuickBooks API error for {operation}: {error_message}"
        )


# =============================================================================
# Pydantic Models for Request/Response
# =============================================================================

class InvoiceLineItem(BaseModel):
    """Invoice line item"""
    description: str
    quantity: float = Field(ge=0)
    rate: float = Field(ge=0)
    amount: Optional[float] = None
    item_id: Optional[str] = None  # QuickBooks ItemRef


class InvoiceCreate(BaseModel):
    """Invoice creation request"""
    customer_id: str
    customer_name: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: str
    due_date: str
    terms: Optional[str] = "Net 30"
    line_items: List[InvoiceLineItem]
    discount: Optional[float] = Field(default=0, ge=0)
    tax: Optional[float] = Field(default=0, ge=0)
    notes: Optional[str] = None
    private_note: Optional[str] = None


class InvoiceUpdate(BaseModel):
    """Invoice update request (partial update supported)"""
    customer_id: Optional[str] = None
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    terms: Optional[str] = None
    line_items: Optional[List[InvoiceLineItem]] = None
    discount: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None
    private_note: Optional[str] = None


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


class CustomerUpdate(BaseModel):
    """Customer update request"""
    display_name: Optional[str] = None
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
    billing_country: Optional[str] = None
    notes: Optional[str] = None
    tax_exempt: Optional[bool] = None
    is_active: Optional[bool] = None


class ExpenseCreate(BaseModel):
    """Expense creation request"""
    vendor_id: Optional[str] = None
    vendor_name: Optional[str] = None
    account_id: str  # Payment account (bank/credit card)
    category_id: Optional[str] = None  # Expense category account
    date: str
    amount: float = Field(gt=0)
    payment_type: str = Field(default="Cash")  # Cash, Check, CreditCard
    reference_number: Optional[str] = None
    memo: Optional[str] = None
    billable: Optional[bool] = False
    customer_id: Optional[str] = None  # For billable expenses


class ExpenseUpdate(BaseModel):
    """Expense update request"""
    vendor_id: Optional[str] = None
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    date: Optional[str] = None
    amount: Optional[float] = Field(default=None, gt=0)
    payment_type: Optional[str] = None
    reference_number: Optional[str] = None
    memo: Optional[str] = None
    billable: Optional[bool] = None
    customer_id: Optional[str] = None


class VendorCreate(BaseModel):
    """Vendor creation request"""
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
    account_number: Optional[str] = None
    tax_id: Optional[str] = None
    terms: Optional[str] = None


class VendorUpdate(BaseModel):
    """Vendor update request"""
    display_name: Optional[str] = None
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
    billing_country: Optional[str] = None
    account_number: Optional[str] = None
    terms: Optional[str] = None
    is_active: Optional[bool] = None


class PaymentCreate(BaseModel):
    """Payment creation request"""
    customer_id: str
    amount: float = Field(gt=0)
    payment_date: str
    payment_method_id: Optional[str] = None  # QuickBooks PaymentMethod
    deposit_to_account_id: Optional[str] = None  # Undeposited Funds by default
    invoice_ids: Optional[List[str]] = None  # Invoices to apply payment to
    reference_number: Optional[str] = None
    memo: Optional[str] = None


class PaginationParams(BaseModel):
    """Pagination parameters"""
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=100, ge=1, le=1000)


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    success: bool
    data: List[Dict[str, Any]]
    pagination: Dict[str, Any]


# =============================================================================
# OAuth Token Helper
# =============================================================================

async def get_quickbooks_access_token(
    wallet_address: str,
    db: AsyncSession
) -> Tuple[str, str]:
    """
    Get active QuickBooks OAuth access token and realm_id.

    Uses Database OAuthToken model (same pattern as google.py, salesforce_crud.py).
    Automatically refreshes token if expired.

    Returns:
        Tuple of (access_token, realm_id)
    """
    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == wallet_address.lower(),
                OAuthToken.provider == "quickbooks",
                OAuthToken.is_active == True  # noqa: E712
            )
        )
    )
    token = result.scalar_one_or_none()

    if not token:
        raise HTTPException(
            status_code=404,
            detail="QuickBooks not connected. Please connect via OAuth first."
        )

    # Check if token needs refresh
    if token.expires_at and token.expires_at < datetime.utcnow():
        logger.info(f"QuickBooks token expired for {wallet_address[:10]}..., attempting refresh")
        refresh_success = await refresh_oauth_token(token, "quickbooks", db)
        if not refresh_success:
            raise HTTPException(
                status_code=401,
                detail="QuickBooks token expired and refresh failed. Please reconnect."
            )
        logger.info(f"QuickBooks token refreshed successfully for {wallet_address[:10]}...")

    # Get realm_id from provider_data
    provider_data = token.provider_data or {}
    realm_id = provider_data.get("realm_id") or provider_data.get("realmId")

    if not realm_id:
        raise HTTPException(
            status_code=400,
            detail="QuickBooks realm_id not found. Please reconnect your QuickBooks account."
        )

    return token.access_token, realm_id


async def make_qb_request(
    access_token: str,
    realm_id: str,
    method: str,
    endpoint: str,
    data: Optional[dict] = None,
    params: Optional[dict] = None,
    operation: str = "QuickBooks API request"
) -> dict:
    """
    Make API request to QuickBooks with proper error handling.

    Args:
        access_token: OAuth access token
        realm_id: QuickBooks company ID
        method: HTTP method (GET, POST, DELETE)
        endpoint: API endpoint (e.g., "invoice", "customer/123")
        data: Request body for POST requests
        params: Query parameters
        operation: Description of the operation for error messages

    Returns:
        Response JSON or empty dict for DELETE
    """
    base_url = "https://quickbooks.api.intuit.com/v3/company"
    url = f"{base_url}/{realm_id}/{endpoint}"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }

    # Add minorversion parameter for latest API features
    if params is None:
        params = {}
    params["minorversion"] = "65"

    async with httpx.AsyncClient() as client:
        try:
            if method == "GET":
                response = await client.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=30.0
                )
            elif method == "POST":
                response = await client.post(
                    url,
                    headers=headers,
                    json=data,
                    params=params,
                    timeout=30.0
                )
            elif method == "DELETE":
                # QuickBooks uses POST with operation=delete for soft deletes
                if data:
                    response = await client.post(
                        url,
                        headers=headers,
                        json=data,
                        params={**params, "operation": "delete"},
                        timeout=30.0
                    )
                else:
                    response = await client.delete(
                        url,
                        headers=headers,
                        params=params,
                        timeout=30.0
                    )
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")

            # Handle response
            handle_quickbooks_response(response, operation)

            # Return empty dict for DELETE with no content
            if response.status_code == 204 or method == "DELETE":
                return {"success": True}

            return response.json()

        except HTTPException:
            raise
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail=f"QuickBooks API timeout during {operation}"
            )
        except Exception as e:
            logger.error(f"QuickBooks API error during {operation}: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Internal error during {operation}: {str(e)}"
            )


# =============================================================================
# GET Endpoints for Synced Data from Filecoin Storage
# =============================================================================

@router.get("/invoices")
async def list_invoices(
    wallet_address: str = Query(..., description="User's wallet address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List synced invoices from Filecoin storage.

    Returns invoices that have been synced from QuickBooks to decentralized storage.
    Use the sync endpoint to refresh data from QuickBooks.
    """
    return await _get_synced_data(wallet_address, "invoices", page, page_size)


@router.get("/expenses")
async def list_expenses(
    wallet_address: str = Query(..., description="User's wallet address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List synced expenses from Filecoin storage.
    """
    return await _get_synced_data(wallet_address, "expenses", page, page_size)


@router.get("/customers")
async def list_customers(
    wallet_address: str = Query(..., description="User's wallet address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List synced customers from Filecoin storage.
    """
    return await _get_synced_data(wallet_address, "customers", page, page_size)


@router.get("/vendors")
async def list_vendors(
    wallet_address: str = Query(..., description="User's wallet address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List synced vendors from Filecoin storage.
    """
    return await _get_synced_data(wallet_address, "vendors", page, page_size)


@router.get("/payments")
async def list_payments(
    wallet_address: str = Query(..., description="User's wallet address"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, ge=1, le=1000, description="Items per page"),
    db: AsyncSession = Depends(get_db)
) -> PaginatedResponse:
    """
    List synced payments from Filecoin storage.
    """
    return await _get_synced_data(wallet_address, "payments", page, page_size)


async def _get_synced_data(
    wallet_address: str,
    data_type: str,
    page: int,
    page_size: int
) -> PaginatedResponse:
    """
    Internal helper to retrieve synced data from Filecoin storage with pagination.
    """
    try:
        # List files for this wallet and data type
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration="quickbooks",
            data_type=data_type
        )

        if not files:
            return PaginatedResponse(
                success=True,
                data=[],
                pagination={
                    "page": page,
                    "page_size": page_size,
                    "total_items": 0,
                    "total_pages": 0,
                    "has_next": False,
                    "has_prev": False
                }
            )

        # Get the most recent file (sorted by timestamp)
        latest_file = max(files, key=lambda x: x.get("timestamp", ""))
        cid = latest_file.get("cid")

        if not cid:
            raise HTTPException(
                status_code=500,
                detail=f"No CID found for {data_type} data"
            )

        # Retrieve and decrypt the data
        encrypted_data = await filecoin_service.retrieve_data(cid)
        decrypted_data = await encryption_service.decrypt_for_customer(
            encrypted_data=encrypted_data,
            customer_wallet=wallet_address
        )

        # Extract records
        records = decrypted_data.get("records", [])
        total_items = len(records)
        total_pages = (total_items + page_size - 1) // page_size

        # Apply pagination
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_records = records[start_idx:end_idx]

        return PaginatedResponse(
            success=True,
            data=paginated_records,
            pagination={
                "page": page,
                "page_size": page_size,
                "total_items": total_items,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1,
                "synced_at": decrypted_data.get("synced_at"),
                "cid": cid
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve {data_type} from Filecoin: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve {data_type}: {str(e)}"
        )


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get a single invoice directly from QuickBooks API"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"invoice/{invoice_id}",
            operation=f"get invoice {invoice_id}"
        )

        return {
            "success": True,
            "invoice": result.get("Invoice", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get invoice {invoice_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customers/{customer_id}")
async def get_customer(
    customer_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get a single customer directly from QuickBooks API"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"customer/{customer_id}",
            operation=f"get customer {customer_id}"
        )

        return {
            "success": True,
            "customer": result.get("Customer", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get customer {customer_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vendors/{vendor_id}")
async def get_vendor(
    vendor_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get a single vendor directly from QuickBooks API"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"vendor/{vendor_id}",
            operation=f"get vendor {vendor_id}"
        )

        return {
            "success": True,
            "vendor": result.get("Vendor", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get vendor {vendor_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/expenses/{expense_id}")
async def get_expense(
    expense_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Get a single expense (purchase) directly from QuickBooks API"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"purchase/{expense_id}",
            operation=f"get expense {expense_id}"
        )

        return {
            "success": True,
            "expense": result.get("Purchase", {})
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get expense {expense_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# INVOICE CRUD Endpoints
# =============================================================================

@router.post("/invoices")
async def create_invoice(
    wallet_address: str = Query(...),
    invoice: InvoiceCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new invoice in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

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

        # Add terms if provided
        if invoice.terms:
            qb_invoice["SalesTermRef"] = {"name": invoice.terms}

        # Add line items
        line_num = 1
        for item in invoice.line_items:
            amount = item.amount if item.amount is not None else (item.quantity * item.rate)
            line_detail = {
                "DetailType": "SalesItemLineDetail",
                "Amount": amount,
                "Description": item.description,
                "SalesItemLineDetail": {
                    "Qty": item.quantity,
                    "UnitPrice": item.rate
                },
                "LineNum": line_num
            }

            # Add ItemRef if provided
            if item.item_id:
                line_detail["SalesItemLineDetail"]["ItemRef"] = {"value": item.item_id}

            qb_invoice["Line"].append(line_detail)
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

        # Add customer memo if provided
        if invoice.notes:
            qb_invoice["CustomerMemo"] = {"value": invoice.notes}

        # Add private note if provided
        if invoice.private_note:
            qb_invoice["PrivateNote"] = invoice.private_note

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="invoice",
            data=qb_invoice,
            operation="create invoice"
        )

        invoice_data = result.get("Invoice", {})

        return {
            "success": True,
            "id": invoice_data.get("Id"),
            "doc_number": invoice_data.get("DocNumber"),
            "total": invoice_data.get("TotalAmt"),
            "sync_token": invoice_data.get("SyncToken"),
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
    invoice: InvoiceUpdate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing invoice in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # First, retrieve the existing invoice to get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"invoice/{invoice_id}",
            operation=f"get invoice {invoice_id} for update"
        )

        existing_invoice = existing.get("Invoice", {})
        sync_token = existing_invoice.get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        # Build update object with required fields
        qb_invoice = {
            "Id": invoice_id,
            "SyncToken": sync_token,
            "sparse": True  # Use sparse update to only change provided fields
        }

        # Add optional fields if provided
        if invoice.customer_id:
            qb_invoice["CustomerRef"] = {"value": invoice.customer_id}
        if invoice.invoice_number:
            qb_invoice["DocNumber"] = invoice.invoice_number
        if invoice.invoice_date:
            qb_invoice["TxnDate"] = invoice.invoice_date
        if invoice.due_date:
            qb_invoice["DueDate"] = invoice.due_date
        if invoice.terms:
            qb_invoice["SalesTermRef"] = {"name": invoice.terms}
        if invoice.notes:
            qb_invoice["CustomerMemo"] = {"value": invoice.notes}
        if invoice.private_note:
            qb_invoice["PrivateNote"] = invoice.private_note

        # Handle line items update (requires full replacement)
        if invoice.line_items:
            qb_invoice["Line"] = []
            qb_invoice["sparse"] = False  # Full update needed for line items

            line_num = 1
            for item in invoice.line_items:
                amount = item.amount if item.amount is not None else (item.quantity * item.rate)
                line_detail = {
                    "DetailType": "SalesItemLineDetail",
                    "Amount": amount,
                    "Description": item.description,
                    "SalesItemLineDetail": {
                        "Qty": item.quantity,
                        "UnitPrice": item.rate
                    },
                    "LineNum": line_num
                }
                if item.item_id:
                    line_detail["SalesItemLineDetail"]["ItemRef"] = {"value": item.item_id}
                qb_invoice["Line"].append(line_detail)
                line_num += 1

            # Add discount if provided
            if invoice.discount and invoice.discount > 0:
                qb_invoice["Line"].append({
                    "DetailType": "DiscountLineDetail",
                    "Amount": invoice.discount,
                    "DiscountLineDetail": {"PercentBased": False}
                })

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="invoice",
            data=qb_invoice,
            operation=f"update invoice {invoice_id}"
        )

        updated_invoice = result.get("Invoice", {})

        return {
            "success": True,
            "id": updated_invoice.get("Id"),
            "sync_token": updated_invoice.get("SyncToken"),
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
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete (void) an invoice from QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # First retrieve to get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"invoice/{invoice_id}",
            operation=f"get invoice {invoice_id} for deletion"
        )

        sync_token = existing.get("Invoice", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(
                status_code=404,
                detail="Invoice not found"
            )

        # QuickBooks uses POST with operation=delete
        await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="DELETE",
            endpoint="invoice",
            data={
                "Id": invoice_id,
                "SyncToken": sync_token
            },
            operation=f"delete invoice {invoice_id}"
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
    email: Optional[str] = Query(None, description="Override recipient email"),
    db: AsyncSession = Depends(get_db)
):
    """Send invoice via email"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Build URL with optional email override
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
                params={"minorversion": "65"},
                timeout=30.0
            )
            handle_quickbooks_response(response, f"send invoice {invoice_id}")

        return {
            "success": True,
            "message": "Invoice sent successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoices/{invoice_id}/void")
async def void_invoice(
    invoice_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Void an invoice (mark as void without deleting)"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # First retrieve to get current data
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"invoice/{invoice_id}",
            operation=f"get invoice {invoice_id} for voiding"
        )

        existing_invoice = existing.get("Invoice", {})
        sync_token = existing_invoice.get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Invoice not found")

        # Void using POST with operation=void
        url = f"https://quickbooks.api.intuit.com/v3/company/{realm_id}/invoice"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                params={"operation": "void", "minorversion": "65"},
                json={"Id": invoice_id, "SyncToken": sync_token},
                timeout=30.0
            )
            handle_quickbooks_response(response, f"void invoice {invoice_id}")

        return {
            "success": True,
            "message": "Invoice voided successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to void invoice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# CUSTOMER CRUD Endpoints
# =============================================================================

@router.post("/customers")
async def create_customer(
    wallet_address: str = Query(...),
    customer: CustomerCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new customer in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

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
            qb_customer["PrimaryEmailAddr"] = {"Address": customer.email}

        if customer.phone:
            qb_customer["PrimaryPhone"] = {"FreeFormNumber": customer.phone}

        if customer.mobile:
            qb_customer["Mobile"] = {"FreeFormNumber": customer.mobile}

        if customer.website:
            qb_customer["WebAddr"] = {"URI": customer.website}

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
            qb_customer["TaxExemptionReasonId"] = "1"  # Federal government

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="customer",
            data=qb_customer,
            operation="create customer"
        )

        customer_data = result.get("Customer", {})

        return {
            "success": True,
            "id": customer_data.get("Id"),
            "display_name": customer_data.get("DisplayName"),
            "sync_token": customer_data.get("SyncToken"),
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
    customer: CustomerUpdate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing customer in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get existing customer for SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"customer/{customer_id}",
            operation=f"get customer {customer_id} for update"
        )

        sync_token = existing.get("Customer", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Build update object with sparse update
        qb_customer = {
            "Id": customer_id,
            "SyncToken": sync_token,
            "sparse": True
        }

        # Add optional fields
        if customer.display_name:
            qb_customer["DisplayName"] = customer.display_name
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
            if customer.billing_country:
                qb_customer["BillAddr"]["Country"] = customer.billing_country

        if customer.notes:
            qb_customer["Notes"] = customer.notes

        if customer.is_active is not None:
            qb_customer["Active"] = customer.is_active

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="customer",
            data=qb_customer,
            operation=f"update customer {customer_id}"
        )

        updated = result.get("Customer", {})

        return {
            "success": True,
            "id": updated.get("Id"),
            "sync_token": updated.get("SyncToken"),
            "message": "Customer updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/customers/{customer_id}")
async def deactivate_customer(
    customer_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a customer in QuickBooks (QuickBooks doesn't allow hard delete)"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"customer/{customer_id}",
            operation=f"get customer {customer_id} for deactivation"
        )

        sync_token = existing.get("Customer", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Customer not found")

        # Deactivate by setting Active to false
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="customer",
            data={
                "Id": customer_id,
                "SyncToken": sync_token,
                "Active": False,
                "sparse": True
            },
            operation=f"deactivate customer {customer_id}"
        )

        return {
            "success": True,
            "message": "Customer deactivated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to deactivate customer: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# EXPENSE (Purchase) CRUD Endpoints
# =============================================================================

@router.post("/expenses")
async def create_expense(
    wallet_address: str = Query(...),
    expense: ExpenseCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new expense (purchase) in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Build QuickBooks Purchase (Expense) object
        qb_expense = {
            "PaymentType": expense.payment_type,
            "TxnDate": expense.date,
            "TotalAmt": expense.amount,
            "AccountRef": {"value": expense.account_id},  # Payment account
            "Line": [
                {
                    "DetailType": "AccountBasedExpenseLineDetail",
                    "Amount": expense.amount,
                    "AccountBasedExpenseLineDetail": {}
                }
            ]
        }

        # Add expense category if provided
        if expense.category_id:
            qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["AccountRef"] = {
                "value": expense.category_id
            }

        # Add memo/description
        if expense.memo:
            qb_expense["Line"][0]["Description"] = expense.memo

        # Add vendor if provided
        if expense.vendor_id:
            qb_expense["EntityRef"] = {"value": expense.vendor_id, "type": "Vendor"}

        # Add reference number
        if expense.reference_number:
            qb_expense["DocNumber"] = expense.reference_number

        # Add memo at transaction level
        if expense.memo:
            qb_expense["PrivateNote"] = expense.memo

        # Handle billable expenses
        if expense.billable and expense.customer_id:
            qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["BillableStatus"] = "Billable"
            qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["CustomerRef"] = {
                "value": expense.customer_id
            }

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="purchase",
            data=qb_expense,
            operation="create expense"
        )

        expense_data = result.get("Purchase", {})

        return {
            "success": True,
            "id": expense_data.get("Id"),
            "total": expense_data.get("TotalAmt"),
            "sync_token": expense_data.get("SyncToken"),
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
    expense: ExpenseUpdate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing expense in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get existing for SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"purchase/{expense_id}",
            operation=f"get expense {expense_id} for update"
        )

        existing_expense = existing.get("Purchase", {})
        sync_token = existing_expense.get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Build update object
        qb_expense = {
            "Id": expense_id,
            "SyncToken": sync_token,
            "sparse": True
        }

        if expense.payment_type:
            qb_expense["PaymentType"] = expense.payment_type
        if expense.date:
            qb_expense["TxnDate"] = expense.date
        if expense.account_id:
            qb_expense["AccountRef"] = {"value": expense.account_id}
        if expense.vendor_id:
            qb_expense["EntityRef"] = {"value": expense.vendor_id, "type": "Vendor"}
        if expense.reference_number:
            qb_expense["DocNumber"] = expense.reference_number
        if expense.memo:
            qb_expense["PrivateNote"] = expense.memo

        # If amount or category changes, need to update line items
        if expense.amount or expense.category_id:
            qb_expense["sparse"] = False  # Full update for line items
            qb_expense["Line"] = [{
                "DetailType": "AccountBasedExpenseLineDetail",
                "Amount": expense.amount or existing_expense.get("TotalAmt"),
                "AccountBasedExpenseLineDetail": {}
            }]

            if expense.category_id:
                qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["AccountRef"] = {
                    "value": expense.category_id
                }

            if expense.billable is not None and expense.customer_id:
                qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["BillableStatus"] = (
                    "Billable" if expense.billable else "NotBillable"
                )
                qb_expense["Line"][0]["AccountBasedExpenseLineDetail"]["CustomerRef"] = {
                    "value": expense.customer_id
                }

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="purchase",
            data=qb_expense,
            operation=f"update expense {expense_id}"
        )

        updated = result.get("Purchase", {})

        return {
            "success": True,
            "id": updated.get("Id"),
            "sync_token": updated.get("SyncToken"),
            "message": "Expense updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Delete an expense from QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"purchase/{expense_id}",
            operation=f"get expense {expense_id} for deletion"
        )

        sync_token = existing.get("Purchase", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Expense not found")

        # Delete using operation=delete
        await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="DELETE",
            endpoint="purchase",
            data={
                "Id": expense_id,
                "SyncToken": sync_token
            },
            operation=f"delete expense {expense_id}"
        )

        return {
            "success": True,
            "message": "Expense deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete expense: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# VENDOR CRUD Endpoints
# =============================================================================

@router.post("/vendors")
async def create_vendor(
    wallet_address: str = Query(...),
    vendor: VendorCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new vendor in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Build QuickBooks Vendor object
        qb_vendor = {
            "DisplayName": vendor.display_name
        }

        if vendor.company_name:
            qb_vendor["CompanyName"] = vendor.company_name
        if vendor.first_name:
            qb_vendor["GivenName"] = vendor.first_name
        if vendor.last_name:
            qb_vendor["FamilyName"] = vendor.last_name
        if vendor.email:
            qb_vendor["PrimaryEmailAddr"] = {"Address": vendor.email}
        if vendor.phone:
            qb_vendor["PrimaryPhone"] = {"FreeFormNumber": vendor.phone}
        if vendor.mobile:
            qb_vendor["Mobile"] = {"FreeFormNumber": vendor.mobile}
        if vendor.website:
            qb_vendor["WebAddr"] = {"URI": vendor.website}

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
            if vendor.billing_country:
                qb_vendor["BillAddr"]["Country"] = vendor.billing_country

        if vendor.account_number:
            qb_vendor["AcctNum"] = vendor.account_number
        if vendor.tax_id:
            qb_vendor["TaxIdentifier"] = vendor.tax_id
        if vendor.terms:
            qb_vendor["TermRef"] = {"name": vendor.terms}

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="vendor",
            data=qb_vendor,
            operation="create vendor"
        )

        vendor_data = result.get("Vendor", {})

        return {
            "success": True,
            "id": vendor_data.get("Id"),
            "display_name": vendor_data.get("DisplayName"),
            "sync_token": vendor_data.get("SyncToken"),
            "message": "Vendor created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/vendors/{vendor_id}")
async def update_vendor(
    vendor_id: str,
    wallet_address: str = Query(...),
    vendor: VendorUpdate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Update an existing vendor in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"vendor/{vendor_id}",
            operation=f"get vendor {vendor_id} for update"
        )

        sync_token = existing.get("Vendor", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Vendor not found")

        # Build update object
        qb_vendor = {
            "Id": vendor_id,
            "SyncToken": sync_token,
            "sparse": True
        }

        if vendor.display_name:
            qb_vendor["DisplayName"] = vendor.display_name
        if vendor.company_name:
            qb_vendor["CompanyName"] = vendor.company_name
        if vendor.first_name:
            qb_vendor["GivenName"] = vendor.first_name
        if vendor.last_name:
            qb_vendor["FamilyName"] = vendor.last_name
        if vendor.email:
            qb_vendor["PrimaryEmailAddr"] = {"Address": vendor.email}
        if vendor.phone:
            qb_vendor["PrimaryPhone"] = {"FreeFormNumber": vendor.phone}
        if vendor.mobile:
            qb_vendor["Mobile"] = {"FreeFormNumber": vendor.mobile}
        if vendor.website:
            qb_vendor["WebAddr"] = {"URI": vendor.website}

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
            if vendor.billing_country:
                qb_vendor["BillAddr"]["Country"] = vendor.billing_country

        if vendor.account_number:
            qb_vendor["AcctNum"] = vendor.account_number
        if vendor.terms:
            qb_vendor["TermRef"] = {"name": vendor.terms}
        if vendor.is_active is not None:
            qb_vendor["Active"] = vendor.is_active

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="vendor",
            data=qb_vendor,
            operation=f"update vendor {vendor_id}"
        )

        updated = result.get("Vendor", {})

        return {
            "success": True,
            "id": updated.get("Id"),
            "sync_token": updated.get("SyncToken"),
            "message": "Vendor updated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/vendors/{vendor_id}")
async def deactivate_vendor(
    vendor_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate a vendor in QuickBooks (QuickBooks doesn't allow hard delete)"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"vendor/{vendor_id}",
            operation=f"get vendor {vendor_id} for deactivation"
        )

        sync_token = existing.get("Vendor", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Vendor not found")

        # Deactivate by setting Active to false
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="vendor",
            data={
                "Id": vendor_id,
                "SyncToken": sync_token,
                "Active": False,
                "sparse": True
            },
            operation=f"deactivate vendor {vendor_id}"
        )

        return {
            "success": True,
            "message": "Vendor deactivated successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to deactivate vendor: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# PAYMENT CRUD Endpoints
# =============================================================================

@router.post("/payments")
async def create_payment(
    wallet_address: str = Query(...),
    payment: PaymentCreate = Body(...),
    db: AsyncSession = Depends(get_db)
):
    """Create a new payment in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Build QuickBooks Payment object
        qb_payment = {
            "CustomerRef": {"value": payment.customer_id},
            "TotalAmt": payment.amount,
            "TxnDate": payment.payment_date
        }

        if payment.payment_method_id:
            qb_payment["PaymentMethodRef"] = {"value": payment.payment_method_id}

        if payment.deposit_to_account_id:
            qb_payment["DepositToAccountRef"] = {"value": payment.deposit_to_account_id}

        if payment.reference_number:
            qb_payment["PaymentRefNum"] = payment.reference_number

        if payment.memo:
            qb_payment["PrivateNote"] = payment.memo

        # Link to invoices if provided
        if payment.invoice_ids:
            qb_payment["Line"] = []
            remaining_amount = payment.amount

            for invoice_id in payment.invoice_ids:
                if remaining_amount <= 0:
                    break

                # Get invoice to determine amount
                invoice = await make_qb_request(
                    access_token=access_token,
                    realm_id=realm_id,
                    method="GET",
                    endpoint=f"invoice/{invoice_id}",
                    operation=f"get invoice {invoice_id} for payment"
                )

                invoice_balance = invoice.get("Invoice", {}).get("Balance", 0)
                payment_amount = min(remaining_amount, invoice_balance)

                qb_payment["Line"].append({
                    "Amount": payment_amount,
                    "LinkedTxn": [{
                        "TxnId": invoice_id,
                        "TxnType": "Invoice"
                    }]
                })

                remaining_amount -= payment_amount

        # Make API call
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="POST",
            endpoint="payment",
            data=qb_payment,
            operation="create payment"
        )

        payment_data = result.get("Payment", {})

        return {
            "success": True,
            "id": payment_data.get("Id"),
            "total": payment_data.get("TotalAmt"),
            "sync_token": payment_data.get("SyncToken"),
            "message": "Payment created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/payments/{payment_id}")
async def void_payment(
    payment_id: str,
    wallet_address: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Void a payment in QuickBooks"""
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Get SyncToken
        existing = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint=f"payment/{payment_id}",
            operation=f"get payment {payment_id} for voiding"
        )

        sync_token = existing.get("Payment", {}).get("SyncToken")

        if not sync_token:
            raise HTTPException(status_code=404, detail="Payment not found")

        # Void using operation=void
        url = f"https://quickbooks.api.intuit.com/v3/company/{realm_id}/payment"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                url,
                headers=headers,
                params={"operation": "void", "minorversion": "65"},
                json={"Id": payment_id, "SyncToken": sync_token},
                timeout=30.0
            )
            handle_quickbooks_response(response, f"void payment {payment_id}")

        return {
            "success": True,
            "message": "Payment voided successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to void payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Query Endpoints for Live Data from QuickBooks API
# =============================================================================

@router.get("/query")
async def query_quickbooks(
    wallet_address: str = Query(..., description="User's wallet address"),
    entity: str = Query(..., description="Entity to query (Invoice, Customer, Vendor, Purchase, Payment)"),
    where_clause: Optional[str] = Query(None, description="SQL-like WHERE clause"),
    order_by: Optional[str] = Query(None, description="ORDER BY clause"),
    start_position: int = Query(1, ge=1, description="Start position for pagination"),
    max_results: int = Query(100, ge=1, le=1000, description="Maximum results to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute a query directly against QuickBooks API.

    This provides live data from QuickBooks, not cached data from Filecoin.

    Example queries:
    - entity=Invoice&where_clause=Balance > 0
    - entity=Customer&order_by=DisplayName
    - entity=Purchase&where_clause=TxnDate > '2024-01-01'
    """
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        # Build query string
        query = f"SELECT * FROM {entity}"

        if where_clause:
            query += f" WHERE {where_clause}"

        if order_by:
            query += f" ORDERBY {order_by}"

        query += f" STARTPOSITION {start_position} MAXRESULTS {max_results}"

        # Make query request
        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint="query",
            params={"query": query},
            operation=f"query {entity}"
        )

        query_response = result.get("QueryResponse", {})

        # Get the entity list (QuickBooks returns entity name as key)
        records = query_response.get(entity, [])
        total_count = query_response.get("totalCount", len(records))

        return {
            "success": True,
            "entity": entity,
            "records": records,
            "count": len(records),
            "total_count": total_count,
            "start_position": start_position,
            "max_results": max_results,
            "has_more": start_position + len(records) - 1 < total_count
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to query QuickBooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/accounts")
async def list_accounts(
    wallet_address: str = Query(..., description="User's wallet address"),
    account_type: Optional[str] = Query(None, description="Filter by account type (Bank, Expense, Income, etc.)"),
    db: AsyncSession = Depends(get_db)
):
    """
    List accounts from QuickBooks (useful for expense categories, payment accounts).
    """
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        query = "SELECT * FROM Account"
        if account_type:
            query += f" WHERE AccountType = '{account_type}'"
        query += " MAXRESULTS 1000"

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint="query",
            params={"query": query},
            operation="list accounts"
        )

        accounts = result.get("QueryResponse", {}).get("Account", [])

        return {
            "success": True,
            "accounts": accounts,
            "count": len(accounts)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list accounts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/payment-methods")
async def list_payment_methods(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    List payment methods from QuickBooks.
    """
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint="query",
            params={"query": "SELECT * FROM PaymentMethod MAXRESULTS 100"},
            operation="list payment methods"
        )

        methods = result.get("QueryResponse", {}).get("PaymentMethod", [])

        return {
            "success": True,
            "payment_methods": methods,
            "count": len(methods)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list payment methods: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/terms")
async def list_terms(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    List payment terms from QuickBooks (Net 30, Net 15, etc.).
    """
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint="query",
            params={"query": "SELECT * FROM Term MAXRESULTS 100"},
            operation="list terms"
        )

        terms = result.get("QueryResponse", {}).get("Term", [])

        return {
            "success": True,
            "terms": terms,
            "count": len(terms)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list terms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/items")
async def list_items(
    wallet_address: str = Query(..., description="User's wallet address"),
    item_type: Optional[str] = Query(None, description="Filter by item type (Service, NonInventory, Inventory)"),
    db: AsyncSession = Depends(get_db)
):
    """
    List items/products from QuickBooks (for invoice line items).
    """
    try:
        access_token, realm_id = await get_quickbooks_access_token(wallet_address, db)

        query = "SELECT * FROM Item"
        if item_type:
            query += f" WHERE Type = '{item_type}'"
        query += " MAXRESULTS 1000"

        result = await make_qb_request(
            access_token=access_token,
            realm_id=realm_id,
            method="GET",
            endpoint="query",
            params={"query": query},
            operation="list items"
        )

        items = result.get("QueryResponse", {}).get("Item", [])

        return {
            "success": True,
            "items": items,
            "count": len(items)
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list items: {e}")
        raise HTTPException(status_code=500, detail=str(e))
