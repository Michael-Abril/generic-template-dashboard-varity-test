"""
Dashboard API Endpoints - KPI Metrics and Business Intelligence

This module provides endpoints for the main dashboard page with real-time
business metrics aggregated from ALL 6 integrated tools:
- QuickBooks (financial)
- Google Workspace (productivity)
- Microsoft 365 (productivity)
- Slack (communication)
- Salesforce (CRM)
- HubSpot (CRM/marketing)
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging
import asyncio

import httpx
import os

from app.core.database import get_db
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService, normalize_wallet_address
from app.models.purchase import OAuthToken

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# All 6 supported integrations
SUPPORTED_INTEGRATIONS = ["quickbooks", "google", "microsoft", "slack", "salesforce", "hubspot"]

# =====================================================================
# TOKEN REFRESH HELPER
# =====================================================================

async def ensure_valid_token(wallet_address: str, provider: str, db: AsyncSession) -> Optional[str]:
    """
    Check token expiry and refresh if needed. Returns valid access_token or None.

    Args:
        wallet_address: User's wallet address (will be normalized)
        provider: Integration provider name (google, microsoft, slack, etc.)
        db: Database session

    Returns:
        Valid access token string, or None if token missing/refresh failed
    """
    normalized_wallet = normalize_wallet_address(wallet_address)

    # Query for active OAuth token
    result = await db.execute(
        select(OAuthToken).where(
            and_(
                OAuthToken.user_address == normalized_wallet,
                OAuthToken.provider == provider,
                OAuthToken.is_active == True
            )
        )
    )
    oauth_token = result.scalar_one_or_none()

    if not oauth_token:
        logger.warning(f"No OAuth token found for {provider}, wallet={normalized_wallet[:15]}...")
        return None

    # Check if token is expired and needs refresh
    if oauth_token.expires_at and oauth_token.expires_at < datetime.utcnow():
        logger.info(f"Token expired for {provider}, attempting refresh...")
        try:
            from app.api.v1.integrations import refresh_oauth_token
            success = await refresh_oauth_token(oauth_token, provider, db)
            if not success:
                logger.error(f"Token refresh failed for {provider}")
                return None
            # Re-fetch the token after refresh
            await db.refresh(oauth_token)
        except Exception as e:
            logger.error(f"Token refresh exception for {provider}: {e}")
            return None

    # Return decrypted access token using auth context
    with OAuthToken.auth_context(normalized_wallet):
        return oauth_token.access_token

# =====================================================================
# DATA ROUTING RULES
# Determines whether to fetch from LIVE API or RAG (Filecoin) storage
# Must match frontend mcp-data-fetcher.ts routing rules
# =====================================================================

# Routing types
LIVE_API = "live"
RAG_STORAGE = "rag"
HYBRID = "hybrid"

DATA_ROUTING_RULES = {
    "google": {
        "gmail": LIVE_API,        # Real-time email fetch
        "calendar": LIVE_API,     # Real-time calendar fetch
        "drive": RAG_STORAGE,     # Synced file data
        "drive_files": RAG_STORAGE,
        "contacts": RAG_STORAGE,
    },
    "slack": {
        "channels": LIVE_API,     # Real-time channel list
        "messages": HYBRID,       # Recent messages live, history synced
        "users": RAG_STORAGE,
        "files": RAG_STORAGE,
    },
    "microsoft": {
        "mail": LIVE_API,         # Real-time email fetch
        "calendar": LIVE_API,     # Real-time calendar fetch
        "onedrive": RAG_STORAGE,
        "files": RAG_STORAGE,
        "contacts": RAG_STORAGE,
    },
    "quickbooks": {
        "invoices": HYBRID,       # Recent live, history synced
        "payments": LIVE_API,
        "customers": RAG_STORAGE,
        "vendors": RAG_STORAGE,
    },
    "salesforce": {
        "opportunities": HYBRID,
        "leads": HYBRID,
        "contacts": RAG_STORAGE,
        "accounts": RAG_STORAGE,
        "tasks": RAG_STORAGE,
    },
    "hubspot": {
        "deals": HYBRID,
        "emails": LIVE_API,
        "contacts": RAG_STORAGE,
        "companies": RAG_STORAGE,
    },
}

# Live API endpoint mapping (internal backend endpoints)
LIVE_ENDPOINTS = {
    ("google", "gmail"): "/api/v1/integrations/google/emails",
    ("google", "calendar"): "/api/v1/integrations/google/events",
    ("slack", "channels"): "/api/v1/integrations/slack/channels",
    ("slack", "messages"): "/api/v1/integrations/slack/messages",
    ("slack", "users"): "/api/v1/integrations/slack/users",
    ("microsoft", "mail"): "/api/v1/integrations/microsoft/mail/messages",
    ("microsoft", "calendar"): "/api/v1/integrations/microsoft/calendar/events",
}


# =====================================================================
# RESPONSE MODELS
# =====================================================================

class DynamicKPI(BaseModel):
    """A single KPI metric"""
    id: str
    title: str
    value: str
    change_value: float
    change_period: str
    icon: str
    source: str
    trend: str  # 'up', 'down', 'neutral'
    color: str  # 'blue', 'green', 'orange', 'purple', 'red'

    class Config:
        from_attributes = True


class KPIMetricsResponse(BaseModel):
    """Dashboard KPI metrics - dynamic based on connected integrations"""
    kpis: List[DynamicKPI]
    data_sources: List[str]  # List of connected integrations with data
    has_data: bool  # True if any integration has data
    last_updated: str

    class Config:
        from_attributes = True


class RevenueTrendPoint(BaseModel):
    """Revenue trend data point"""
    month: str
    revenue: float

    class Config:
        from_attributes = True


class RevenueTrendResponse(BaseModel):
    """6-month revenue trend"""
    trend_data: List[RevenueTrendPoint]
    data_source: str  # Which integration provided the data
    last_updated: str

    class Config:
        from_attributes = True


class ActivityItem(BaseModel):
    """Recent activity item"""
    id: str
    type: str  # 'invoice', 'order', 'payment', 'lead', etc.
    title: str
    description: str
    amount: Optional[float] = None
    timestamp: str
    source: str  # Integration that provided this activity

    class Config:
        from_attributes = True


class RecentActivityResponse(BaseModel):
    """Recent business activities"""
    activities: List[ActivityItem]
    total_count: int
    last_updated: str

    class Config:
        from_attributes = True


class CustomerRevenue(BaseModel):
    """Top customer revenue data"""
    customer_name: str
    revenue: float
    percentage: float

    class Config:
        from_attributes = True


class TopCustomersResponse(BaseModel):
    """Top customers by revenue"""
    customers: List[CustomerRevenue]
    total_revenue: float
    data_source: str
    last_updated: str

    class Config:
        from_attributes = True


# =====================================================================
# HELPER FUNCTIONS
# =====================================================================

async def get_integration_data(
    wallet_address: str,
    integration: str,
    data_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Retrieve and decrypt integration data from Filecoin storage

    Args:
        wallet_address: User's wallet address
        integration: Integration name (quickbooks, salesforce, shopify)
        data_type: Optional filter for specific data type

    Returns:
        List of decrypted data records
    """
    # CRITICAL: Normalize wallet address for consistent queries
    normalized_wallet = normalize_wallet_address(wallet_address)

    try:
        # List files for this integration - use latest_only for faster loading
        files = await filecoin_service.list_customer_files(
            customer_wallet=normalized_wallet,
            integration=integration,
            data_type=data_type,
            limit=100  # Reduced from 1000 since we use latest_only pattern
        )

        if not files:
            logger.info(
                f"No data found for {integration} integration, "
                f"wallet={normalized_wallet[:15]}..."
            )
            return []

        # Filter to keep only the most recent file per data_type (latest_only pattern)
        files_by_type: Dict[str, Any] = {}
        for file in files:
            file_data_type = file.get("metadata", {}).get("data_type", "unknown")
            file_timestamp = file.get("timestamp", "")

            if file_data_type not in files_by_type:
                files_by_type[file_data_type] = file
            else:
                existing_timestamp = files_by_type[file_data_type].get("timestamp", "")
                if file_timestamp > existing_timestamp:
                    files_by_type[file_data_type] = file

        files = list(files_by_type.values())
        logger.info(f"Using {len(files)} latest files for {integration}")

        # Retrieve and decrypt each file
        all_data = []
        decryption_errors = 0

        for file in files:
            try:
                # Retrieve encrypted data
                encrypted = await filecoin_service.retrieve_data(file["cid"])

                # Decrypt with wallet
                decrypted = await encryption_service.decrypt_with_wallet(
                    encrypted_data=encrypted,
                    customer_wallet=normalized_wallet
                )

                # Handle different data formats:
                # 1. List of records (old format)
                # 2. Dict with "records" key (new chunked format)
                # 3. Dict with data_type-specific key (e.g., "messages", "files", "contacts")
                if isinstance(decrypted, list):
                    all_data.extend(decrypted)
                elif isinstance(decrypted, dict):
                    # Check for "records" key first (standard format)
                    if "records" in decrypted and isinstance(decrypted["records"], list):
                        all_data.extend(decrypted["records"])
                    # Check for data_type-specific keys (gmail, calendar, drive, etc.)
                    elif "messages" in decrypted and isinstance(decrypted["messages"], list):
                        all_data.extend(decrypted["messages"])
                    elif "files" in decrypted and isinstance(decrypted["files"], list):
                        all_data.extend(decrypted["files"])
                    elif "events" in decrypted and isinstance(decrypted["events"], list):
                        all_data.extend(decrypted["events"])
                    elif "contacts" in decrypted and isinstance(decrypted["contacts"], list):
                        all_data.extend(decrypted["contacts"])
                    elif "channels" in decrypted and isinstance(decrypted["channels"], list):
                        all_data.extend(decrypted["channels"])
                    elif "users" in decrypted and isinstance(decrypted["users"], list):
                        all_data.extend(decrypted["users"])
                    else:
                        # Fallback: append the dict itself as a single record
                        all_data.append(decrypted)

            except Exception as e:
                decryption_errors += 1
                logger.error(
                    f"DECRYPTION FAILED for {integration} file CID={file.get('cid')}: {str(e)}. "
                    f"Wallet={normalized_wallet[:15]}..., Exception type={type(e).__name__}"
                )
                continue

        if decryption_errors > 0:
            logger.warning(
                f"Dashboard data retrieval: {decryption_errors}/{len(files)} files failed to decrypt "
                f"for {integration}"
            )

        logger.info(f"Retrieved {len(all_data)} records from {integration}")
        return all_data

    except Exception as e:
        logger.error(
            f"FAILED to get {integration} data for wallet={normalized_wallet[:15]}...: {str(e)}. "
            f"Exception type={type(e).__name__}"
        )
        return []


def calculate_percentage_change(current: float, previous: float) -> float:
    """Calculate percentage change between two values"""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(((current - previous) / previous) * 100, 1)


async def fetch_live_data(
    wallet_address: str,
    integration: str,
    data_type: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Fetch data from live API endpoints with proper token refresh and error propagation.

    Args:
        wallet_address: User's wallet address
        integration: Integration name (google, slack, etc.)
        data_type: Type of data (gmail, calendar, channels, etc.)
        db: Database session for token refresh

    Returns:
        Dict with 'error' (str or None) and 'data' (list) keys
    """
    endpoint_key = (integration, data_type)
    endpoint = LIVE_ENDPOINTS.get(endpoint_key)

    if not endpoint:
        return {
            "error": f"No live endpoint configured for {integration}/{data_type}",
            "data": []
        }

    # Ensure valid OAuth token with auto-refresh
    access_token = await ensure_valid_token(wallet_address, integration, db)
    if not access_token:
        return {
            "error": f"{integration} token expired or missing - user must reconnect",
            "data": []
        }

    # Get the API base URL
    api_base = os.getenv("API_BASE_URL", "http://localhost:8000")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{api_base}{endpoint}",
                params={"wallet_address": wallet_address}
            )

            if response.status_code != 200:
                error_detail = f"HTTP {response.status_code}"
                try:
                    error_body = response.json()
                    if "detail" in error_body:
                        error_detail = f"{error_detail}: {error_body['detail']}"
                except:
                    pass
                return {"error": error_detail, "data": []}

            data = response.json()

            # Handle different response formats from live endpoints
            if isinstance(data, list):
                return {"error": None, "data": data}
            elif isinstance(data, dict):
                # Check for common response keys
                for key in ["emails", "events", "channels", "messages", "users", "data", "items"]:
                    if key in data and isinstance(data[key], list):
                        return {"error": None, "data": data[key]}
                # If it's a dict with success status, look for data
                if "data" in data:
                    result = data["data"] if isinstance(data["data"], list) else [data["data"]]
                    return {"error": None, "data": result}
                return {"error": None, "data": [data]}
            return {"error": None, "data": []}

    except httpx.TimeoutException:
        return {"error": f"Timeout fetching from {endpoint}", "data": []}
    except Exception as e:
        return {"error": f"Exception: {str(e)}", "data": []}


async def get_kpi_data(
    wallet_address: str,
    integration: str,
    data_type: str,
    db: AsyncSession
) -> Dict[str, Any]:
    """
    Get KPI data respecting routing rules.

    For LIVE data types (gmail, calendar, slack channels):
        - Calls live API endpoints for real-time data
    For RAG data types (drive, contacts, etc.):
        - Uses synced Filecoin storage
    For HYBRID data types:
        - Tries live API first, falls back to RAG if empty

    Args:
        wallet_address: User's wallet address
        integration: Integration name
        data_type: Type of data
        db: Database session for token refresh

    Returns:
        Dict with 'error' (str or None) and 'data' (list) keys
    """
    routing = DATA_ROUTING_RULES.get(integration, {}).get(data_type, RAG_STORAGE)

    if routing == LIVE_API:
        # Always use live API for real-time data types
        result = await fetch_live_data(wallet_address, integration, data_type, db)
        if result["data"]:
            logger.info(f"KPI: Got {len(result['data'])} records from live API for {integration}/{data_type}")
            return result
        # Fall back to synced data if live API fails
        if result["error"]:
            logger.warning(f"KPI: Live API error for {integration}/{data_type}: {result['error']}, falling back to RAG")
        rag_data = await get_integration_data(wallet_address, integration, data_type)
        return {"error": result["error"], "data": rag_data}

    elif routing == HYBRID:
        # Try live first for recent data, merge with synced data
        live_result = await fetch_live_data(wallet_address, integration, data_type, db)
        rag_data = await get_integration_data(wallet_address, integration, data_type)

        if live_result["data"] and rag_data:
            # Dedupe by id if possible, prefer live data
            live_ids = {item.get("id") for item in live_result["data"] if item.get("id")}
            merged = list(live_result["data"])
            for item in rag_data:
                if item.get("id") not in live_ids:
                    merged.append(item)
            logger.info(f"KPI: Merged {len(live_result['data'])} live + {len(rag_data)} RAG for {integration}/{data_type}")
            return {"error": live_result["error"], "data": merged}
        return {"error": live_result["error"], "data": live_result["data"] or rag_data}

    else:  # RAG_STORAGE
        # Use synced Filecoin storage
        rag_data = await get_integration_data(wallet_address, integration, data_type)
        return {"error": None, "data": rag_data}


# =====================================================================
# INTEGRATION-SPECIFIC KPI FETCHERS (for parallel execution)
# =====================================================================

async def fetch_quickbooks_kpis(wallet_address: str, db: AsyncSession) -> Dict[str, Any]:
    """Fetch QuickBooks KPIs (revenue, unpaid invoices)."""
    kpis = []
    error = None

    try:
        result = await get_kpi_data(wallet_address, "quickbooks", "invoices", db)
        qb_invoices = result["data"]
        error = result["error"]

        if qb_invoices:
            # Total Revenue
            total_revenue = sum(
                float(inv.get("total_amount", 0))
                for inv in qb_invoices
                if inv.get("status") == "paid"
            )
            kpis.append(DynamicKPI(
                id="qb_revenue",
                title="Total Revenue",
                value=f"${total_revenue:,.2f}",
                change_value=0.0,
                change_period="vs last month",
                icon="DollarSign",
                source="QuickBooks",
                trend="neutral",
                color="green"
            ))

            # Unpaid Invoices
            unpaid = sum(
                float(inv.get("balance", 0))
                for inv in qb_invoices
                if inv.get("status") == "outstanding"
            )
            kpis.append(DynamicKPI(
                id="qb_unpaid",
                title="Unpaid Invoices",
                value=f"${unpaid:,.2f}",
                change_value=0.0,
                change_period="vs last month",
                icon="FileText",
                source="QuickBooks",
                trend="neutral",
                color="orange"
            ))

            logger.info(f"QuickBooks: ${total_revenue} revenue, ${unpaid} unpaid")

    except Exception as e:
        error = str(e)
        logger.warning(f"QuickBooks KPI fetch failed: {e}")

    return {"kpis": kpis, "error": error}


async def fetch_google_kpis(wallet_address: str, db: AsyncSession) -> Dict[str, Any]:
    """Fetch Google Workspace KPIs (emails, calendar, drive, contacts)."""
    kpis = []
    errors = []

    try:
        # Gmail - LIVE API
        gmail_result = await get_kpi_data(wallet_address, "google", "gmail", db)
        if gmail_result["error"]:
            errors.append(f"Gmail: {gmail_result['error']}")

        if gmail_result["data"]:
            messages = gmail_result["data"] if isinstance(gmail_result["data"], list) else gmail_result["data"].get("messages", [])
            email_count = len(messages)
            unread_count = len([m for m in messages if m.get("unread", False)])

            kpis.append(DynamicKPI(
                id="google_emails",
                title="Total Emails",
                value=str(email_count),
                change_value=0.0,
                change_period="synced",
                icon="Mail",
                source="Google",
                trend="neutral",
                color="blue"
            ))

            if unread_count > 0:
                kpis.append(DynamicKPI(
                    id="google_unread",
                    title="Unread Emails",
                    value=str(unread_count),
                    change_value=0.0,
                    change_period="need attention",
                    icon="Inbox",
                    source="Google",
                    trend="up" if unread_count > 10 else "neutral",
                    color="red" if unread_count > 10 else "blue"
                ))

        # Calendar - LIVE API
        calendar_result = await get_kpi_data(wallet_address, "google", "calendar", db)
        if calendar_result["error"]:
            errors.append(f"Calendar: {calendar_result['error']}")

        if calendar_result["data"]:
            events = calendar_result["data"] if isinstance(calendar_result["data"], list) else calendar_result["data"].get("events", [])
            kpis.append(DynamicKPI(
                id="google_events",
                title="Calendar Events",
                value=str(len(events)),
                change_value=0.0,
                change_period="upcoming",
                icon="Calendar",
                source="Google",
                trend="neutral",
                color="purple"
            ))

        # Drive - RAG
        drive_data = await get_integration_data(wallet_address, "google", "drive")
        if drive_data:
            files = drive_data if isinstance(drive_data, list) else drive_data.get("files", [])
            kpis.append(DynamicKPI(
                id="google_files",
                title="Drive Files",
                value=str(len(files)),
                change_value=0.0,
                change_period="synced",
                icon="FolderOpen",
                source="Google",
                trend="neutral",
                color="green"
            ))

    except Exception as e:
        errors.append(str(e))
        logger.warning(f"Google KPI fetch failed: {e}")

    return {"kpis": kpis, "error": "; ".join(errors) if errors else None}


async def fetch_slack_kpis(wallet_address: str, db: AsyncSession) -> Dict[str, Any]:
    """Fetch Slack KPIs (channels, messages)."""
    kpis = []
    errors = []

    try:
        # Channels - LIVE API
        channels_result = await get_kpi_data(wallet_address, "slack", "channels", db)
        if channels_result["error"]:
            errors.append(f"Channels: {channels_result['error']}")

        if channels_result["data"]:
            channels = channels_result["data"] if isinstance(channels_result["data"], list) else channels_result["data"].get("channels", [])
            kpis.append(DynamicKPI(
                id="slack_channels",
                title="Slack Channels",
                value=str(len(channels)),
                change_value=0.0,
                change_period="active",
                icon="Hash",
                source="Slack",
                trend="neutral",
                color="purple"
            ))

        # Messages - HYBRID
        messages_result = await get_kpi_data(wallet_address, "slack", "messages", db)
        if messages_result["error"]:
            errors.append(f"Messages: {messages_result['error']}")

        if messages_result["data"]:
            messages = messages_result["data"] if isinstance(messages_result["data"], list) else messages_result["data"].get("messages", [])
            kpis.append(DynamicKPI(
                id="slack_messages",
                title="Slack Messages",
                value=str(len(messages)),
                change_value=0.0,
                change_period="synced",
                icon="MessageSquare",
                source="Slack",
                trend="neutral",
                color="purple"
            ))

    except Exception as e:
        errors.append(str(e))
        logger.warning(f"Slack KPI fetch failed: {e}")

    return {"kpis": kpis, "error": "; ".join(errors) if errors else None}


async def fetch_microsoft_kpis(wallet_address: str, db: AsyncSession) -> Dict[str, Any]:
    """Fetch Microsoft 365 KPIs (outlook, onedrive)."""
    kpis = []
    errors = []

    try:
        # Outlook Mail - LIVE API
        outlook_result = await get_kpi_data(wallet_address, "microsoft", "mail", db)
        if outlook_result["error"]:
            errors.append(f"Outlook: {outlook_result['error']}")

        if outlook_result["data"]:
            messages = outlook_result["data"] if isinstance(outlook_result["data"], list) else outlook_result["data"].get("messages", [])
            kpis.append(DynamicKPI(
                id="ms_emails",
                title="Outlook Emails",
                value=str(len(messages)),
                change_value=0.0,
                change_period="synced",
                icon="Mail",
                source="Microsoft",
                trend="neutral",
                color="blue"
            ))

        # OneDrive - RAG
        onedrive_data = await get_integration_data(wallet_address, "microsoft", "files")
        if onedrive_data:
            files = onedrive_data if isinstance(onedrive_data, list) else onedrive_data.get("files", [])
            kpis.append(DynamicKPI(
                id="ms_files",
                title="OneDrive Files",
                value=str(len(files)),
                change_value=0.0,
                change_period="synced",
                icon="FolderOpen",
                source="Microsoft",
                trend="neutral",
                color="blue"
            ))

    except Exception as e:
        errors.append(str(e))
        logger.warning(f"Microsoft KPI fetch failed: {e}")

    return {"kpis": kpis, "error": "; ".join(errors) if errors else None}


# =====================================================================
# ENDPOINTS
# =====================================================================

@router.get("/kpis", response_model=KPIMetricsResponse)
async def get_dashboard_kpis(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get KPI metrics for the dashboard from ALL 6 integrations (parallel execution).

    Aggregates data from whichever integrations the user has connected:
    - QuickBooks: Revenue, invoices
    - Google Workspace: Emails, calendar events, drive files, contacts
    - Microsoft 365: Emails, calendar events, files
    - Slack: Messages, channels
    - Salesforce: Accounts, opportunities, leads
    - HubSpot: Contacts, deals, companies

    Returns dynamic KPIs based on connected integrations.
    """
    try:
        logger.info(f"Fetching KPI metrics for wallet {wallet_address}")

        kpis = []
        data_sources = []
        errors = []

        # Fetch from all integrations in parallel
        results = await asyncio.gather(
            fetch_quickbooks_kpis(wallet_address, db),
            fetch_google_kpis(wallet_address, db),
            fetch_slack_kpis(wallet_address, db),
            fetch_microsoft_kpis(wallet_address, db),
            return_exceptions=True
        )

        # Process results
        for result in results:
            if isinstance(result, Exception):
                errors.append(str(result))
                logger.error(f"KPI fetch exception: {result}")
            elif isinstance(result, dict):
                if result.get("kpis"):
                    kpis.extend(result["kpis"])
                    # Extract data source from first KPI
                    if result["kpis"]:
                        source = result["kpis"][0].source
                        if source not in data_sources:
                            data_sources.append(source)
                if result.get("error"):
                    errors.append(result["error"])

        # Salesforce and HubSpot KPIs (keeping simple - they rarely have data)
        try:
            sf_accounts = await get_integration_data(wallet_address, "salesforce", "accounts")
            if sf_accounts:
                data_sources.append("Salesforce") if "Salesforce" not in data_sources else None
                account_count = len(sf_accounts) if isinstance(sf_accounts, list) else 0
                kpis.append(DynamicKPI(
                    id="sf_accounts",
                    title="Accounts",
                    value=str(account_count),
                    change_value=0.0,
                    change_period="total",
                    icon="Building",
                    source="Salesforce",
                    trend="neutral",
                    color="blue"
                ))
        except Exception as e:
            errors.append(f"Salesforce: {e}")

        try:
            hs_contacts = await get_integration_data(wallet_address, "hubspot", "contacts")
            if hs_contacts:
                data_sources.append("HubSpot") if "HubSpot" not in data_sources else None
                contact_count = len(hs_contacts) if isinstance(hs_contacts, list) else 0
                kpis.append(DynamicKPI(
                    id="hs_contacts",
                    title="HubSpot Contacts",
                    value=str(contact_count),
                    change_value=0.0,
                    change_period="total",
                    icon="Users",
                    source="HubSpot",
                    trend="neutral",
                    color="orange"
                ))
        except Exception as e:
            errors.append(f"HubSpot: {e}")

        # Determine if we have any data
        has_data = len(kpis) > 0

        logger.info(f"Dashboard KPIs: {len(kpis)} KPIs from {len(data_sources)} integrations")
        if errors:
            logger.warning(f"KPI errors: {'; '.join(errors)}")

        return KPIMetricsResponse(
            kpis=kpis,
            data_sources=data_sources,
            has_data=has_data,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching KPI metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch KPI metrics")


@router.get("/revenue-trend", response_model=RevenueTrendResponse)
async def get_revenue_trend(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get 6-month revenue trend data

    Aggregates monthly revenue from QuickBooks invoices.
    Returns monthly revenue for the past 6 months.
    """
    try:
        logger.info(f"Fetching revenue trend for wallet {wallet_address}")

        # Get QuickBooks invoice data
        qb_invoices = await get_integration_data(
            wallet_address=wallet_address,
            integration="quickbooks",
            data_type="invoices"
        )

        # Calculate 6-month trend
        trend_data = []
        data_source = "QuickBooks"

        if qb_invoices:
            # Group invoices by month
            monthly_revenue = {}
            for invoice in qb_invoices:
                if invoice.get("status") == "paid" and invoice.get("txn_date"):
                    month_key = invoice["txn_date"][:7]  # YYYY-MM
                    monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(invoice.get("total_amount", 0))

            # Generate last 6 months
            current_date = datetime.utcnow()
            for i in range(5, -1, -1):
                month_date = current_date - timedelta(days=30 * i)
                month_key = month_date.strftime("%Y-%m")
                month_label = month_date.strftime("%b")

                trend_data.append(RevenueTrendPoint(
                    month=month_label,
                    revenue=monthly_revenue.get(month_key, 0)
                ))

        return RevenueTrendResponse(
            trend_data=trend_data,
            data_source=data_source,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching revenue trend: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch revenue trend")


@router.get("/recent-activity", response_model=RecentActivityResponse)
async def get_recent_activity(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(10, description="Maximum number of activities to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent business activities from ALL 6 integrations

    Aggregates recent activities from all integrated tools:
    - QuickBooks: Invoices, payments
    - Google Workspace: Emails, calendar events
    - Microsoft 365: Emails, calendar events
    - Slack: Messages
    - Salesforce: Leads, opportunities
    - HubSpot: Contacts, deals

    Returns activities sorted by timestamp (most recent first).
    """
    try:
        logger.info(f"Fetching recent activity for wallet {wallet_address}")

        activities = []

        # ============================================
        # QUICKBOOKS ACTIVITIES
        # ============================================
        try:
            # QuickBooks invoices - HYBRID
            qb_invoices = await get_kpi_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            for invoice in qb_invoices[:5]:
                activities.append(ActivityItem(
                    id=f"qb-invoice-{invoice.get('id')}",
                    type="invoice",
                    title=f"Invoice #{invoice.get('doc_number')}",
                    description=f"New invoice for {invoice.get('customer_name')}",
                    amount=float(invoice.get('total_amount', 0)),
                    timestamp=invoice.get('txn_date', datetime.utcnow().isoformat()),
                    source="QuickBooks"
                ))

        except Exception as e:
            logger.warning(f"QuickBooks activities unavailable: {e}")

        # ============================================
        # GOOGLE WORKSPACE ACTIVITIES
        # ============================================
        try:
            # Gmail - LIVE API (recent emails)
            gmail_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="gmail"
            )

            if gmail_data:
                messages = gmail_data if isinstance(gmail_data, list) else gmail_data.get("messages", [])
                for email in messages[:5]:
                    activities.append(ActivityItem(
                        id=f"gmail-{email.get('id')}",
                        type="email",
                        title=email.get('subject', '(No Subject)')[:50],
                        description=f"From: {email.get('from', 'Unknown')[:40]}",
                        amount=None,
                        timestamp=email.get('date', datetime.utcnow().isoformat()),
                        source="Google"
                    ))

            # Calendar - LIVE API (upcoming events)
            calendar_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="calendar"
            )

            if calendar_data:
                events = calendar_data if isinstance(calendar_data, list) else calendar_data.get("events", [])
                for event in events[:3]:
                    activities.append(ActivityItem(
                        id=f"gcal-{event.get('id')}",
                        type="event",
                        title=event.get('summary', 'Untitled Event')[:50],
                        description=f"Calendar event",
                        amount=None,
                        timestamp=event.get('start', {}).get('dateTime', datetime.utcnow().isoformat()) if isinstance(event.get('start'), dict) else datetime.utcnow().isoformat(),
                        source="Google"
                    ))

        except Exception as e:
            logger.warning(f"Google activities unavailable: {e}")

        # ============================================
        # MICROSOFT 365 ACTIVITIES
        # ============================================
        try:
            # Outlook Mail - LIVE API
            outlook_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="microsoft",
                data_type="mail"
            )

            if outlook_data:
                messages = outlook_data if isinstance(outlook_data, list) else outlook_data.get("messages", [])
                for email in messages[:5]:
                    activities.append(ActivityItem(
                        id=f"outlook-{email.get('id')}",
                        type="email",
                        title=email.get('subject', '(No Subject)')[:50],
                        description=f"From: {email.get('from', {}).get('emailAddress', {}).get('name', 'Unknown')[:40]}",
                        amount=None,
                        timestamp=email.get('receivedDateTime', datetime.utcnow().isoformat()),
                        source="Microsoft"
                    ))

        except Exception as e:
            logger.warning(f"Microsoft activities unavailable: {e}")

        # ============================================
        # SLACK ACTIVITIES
        # ============================================
        try:
            # Slack messages - HYBRID
            slack_messages = await get_kpi_data(
                wallet_address=wallet_address,
                integration="slack",
                data_type="messages"
            )

            if slack_messages:
                messages = slack_messages if isinstance(slack_messages, list) else slack_messages.get("messages", [])
                for msg in messages[:5]:
                    activities.append(ActivityItem(
                        id=f"slack-{msg.get('ts', '')}",
                        type="message",
                        title=f"#{msg.get('channel', 'general')}",
                        description=msg.get('text', '')[:60],
                        amount=None,
                        timestamp=msg.get('ts', datetime.utcnow().isoformat()),
                        source="Slack"
                    ))

        except Exception as e:
            logger.warning(f"Slack activities unavailable: {e}")

        # ============================================
        # SALESFORCE ACTIVITIES
        # ============================================
        try:
            # Salesforce opportunities - HYBRID
            sf_opportunities = await get_kpi_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="opportunities"
            )

            for opp in sf_opportunities[:5]:
                activities.append(ActivityItem(
                    id=f"sf-opp-{opp.get('id')}",
                    type="opportunity",
                    title=opp.get('name', 'New Opportunity'),
                    description=f"Stage: {opp.get('stage')} - {opp.get('account_name')}",
                    amount=float(opp.get('amount', 0)) if opp.get('amount') else None,
                    timestamp=opp.get('close_date', datetime.utcnow().isoformat()),
                    source="Salesforce"
                ))

        except Exception as e:
            logger.warning(f"Salesforce activities unavailable: {e}")

        # ============================================
        # HUBSPOT ACTIVITIES
        # ============================================
        try:
            # HubSpot deals - HYBRID
            hs_deals = await get_kpi_data(
                wallet_address=wallet_address,
                integration="hubspot",
                data_type="deals"
            )

            if hs_deals:
                deals = hs_deals if isinstance(hs_deals, list) else []
                for deal in deals[:5]:
                    activities.append(ActivityItem(
                        id=f"hs-deal-{deal.get('id')}",
                        type="deal",
                        title=deal.get('dealname', 'New Deal'),
                        description=f"Stage: {deal.get('dealstage', 'Unknown')}",
                        amount=float(deal.get('amount', 0)) if deal.get('amount') else None,
                        timestamp=deal.get('createdate', datetime.utcnow().isoformat()),
                        source="HubSpot"
                    ))

        except Exception as e:
            logger.warning(f"HubSpot activities unavailable: {e}")

        # Sort by timestamp (most recent first)
        activities.sort(key=lambda x: x.timestamp, reverse=True)

        # Limit results
        activities = activities[:limit]

        return RecentActivityResponse(
            activities=activities,
            total_count=len(activities),
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching recent activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent activity")


@router.get("/top-customers", response_model=TopCustomersResponse)
async def get_top_customers(
    wallet_address: str = Query(..., description="User's wallet address"),
    limit: int = Query(5, description="Number of top customers to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get top customers by revenue

    Aggregates customer revenue from:
    - QuickBooks: Invoice totals by customer
    - Salesforce: Account revenue data

    Returns top customers ranked by total revenue.
    """
    try:
        logger.info(f"Fetching top customers for wallet {wallet_address}")

        customer_revenue = {}
        data_source = ""

        # ============================================
        # QUICKBOOKS CUSTOMER REVENUE
        # ============================================
        try:
            qb_invoices = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_source = "QuickBooks"

                # Aggregate revenue by customer
                for invoice in qb_invoices:
                    if invoice.get("status") == "paid":
                        customer_name = invoice.get("customer_name", "Unknown")
                        amount = float(invoice.get("total_amount", 0))
                        customer_revenue[customer_name] = customer_revenue.get(customer_name, 0) + amount

        except Exception as e:
            logger.warning(f"QuickBooks customer data unavailable: {e}")

        # ============================================
        # SALESFORCE CUSTOMER REVENUE
        # ============================================
        try:
            if not customer_revenue:  # Only if QuickBooks didn't provide data
                sf_accounts = await get_integration_data(
                    wallet_address=wallet_address,
                    integration="salesforce",
                    data_type="accounts"
                )

                if sf_accounts:
                    data_source = "Salesforce"

                    for account in sf_accounts:
                        customer_name = account.get("name", "Unknown")
                        revenue = float(account.get("annual_revenue", 0))
                        if revenue > 0:
                            customer_revenue[customer_name] = revenue

        except Exception as e:
            logger.warning(f"Salesforce customer data unavailable: {e}")

        # ============================================
        # CALCULATE TOP CUSTOMERS
        # ============================================
        total_revenue = sum(customer_revenue.values())

        # Initialize customers list (prevents "referenced before assignment" error)
        customers = []

        if customer_revenue:
            # Sort by revenue and get top N
            sorted_customers = sorted(
                customer_revenue.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]

            customers = [
                CustomerRevenue(
                    customer_name=name,
                    revenue=revenue,
                    percentage=round((revenue / total_revenue) * 100, 1) if total_revenue > 0 else 0
                )
                for name, revenue in sorted_customers
            ]

        return TopCustomersResponse(
            customers=customers,
            total_revenue=total_revenue,
            data_source=data_source,
            last_updated=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error fetching top customers: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch top customers")


@router.get("/analytics")
async def get_dashboard_analytics(
    wallet_address: str = Query(..., description="User's wallet address"),
    period: str = Query("mtd", description="Time period: mtd, qtd, ytd, custom"),
    start_date: Optional[str] = Query(None, description="Start date for custom period"),
    end_date: Optional[str] = Query(None, description="End date for custom period"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics data for the dashboard

    Supports different time periods:
    - mtd: Month to date
    - qtd: Quarter to date
    - ytd: Year to date
    - custom: Custom date range

    Returns aggregated metrics from all integrated tools.
    """
    try:
        logger.info(f"Fetching analytics for wallet {wallet_address}, period={period}")

        # Calculate date range based on period
        now = datetime.utcnow()
        if period == "mtd":
            start = datetime(now.year, now.month, 1)
            end = now
        elif period == "qtd":
            quarter = (now.month - 1) // 3
            start = datetime(now.year, quarter * 3 + 1, 1)
            end = now
        elif period == "ytd":
            start = datetime(now.year, 1, 1)
            end = now
        elif period == "custom" and start_date and end_date:
            start = datetime.fromisoformat(start_date)
            end = datetime.fromisoformat(end_date)
        else:
            start = datetime(now.year, now.month, 1)
            end = now

        # Fetch data from integrations
        analytics_data = {
            "period": period,
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "metrics": {},
            "charts": {},
            "data_sources": []
        }

        # QuickBooks Analytics
        try:
            qb_data = await get_integration_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_data:
                analytics_data["data_sources"].append("QuickBooks")
                # Calculate revenue metrics
                period_revenue = sum(
                    float(inv.get('total_amount', 0))
                    for inv in qb_data
                    if start <= datetime.fromisoformat(inv.get('txn_date', now.isoformat())) <= end
                )
                analytics_data["metrics"]["revenue"] = period_revenue

                # Calculate monthly breakdown for chart
                monthly_revenue = {}
                for inv in qb_data:
                    inv_date = datetime.fromisoformat(inv.get('txn_date', now.isoformat()))
                    if start <= inv_date <= end:
                        month_key = inv_date.strftime("%Y-%m")
                        monthly_revenue[month_key] = monthly_revenue.get(month_key, 0) + float(inv.get('total_amount', 0))

                analytics_data["charts"]["revenue_trend"] = [
                    {"month": month, "value": value}
                    for month, value in sorted(monthly_revenue.items())
                ]
        except Exception as e:
            logger.warning(f"QuickBooks analytics unavailable: {e}")

        analytics_data["last_updated"] = datetime.utcnow().isoformat()
        return analytics_data

    except Exception as e:
        logger.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics")


@router.get("/debug/data-pipeline")
async def debug_data_pipeline(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Debug endpoint to verify the data pipeline for a wallet.

    This endpoint checks:
    1. Wallet address normalization
    2. Pinata files for each integration
    3. Decryption status
    4. Data counts

    Use this to diagnose why dashboard shows no data.
    """
    try:
        normalized_wallet = normalize_wallet_address(wallet_address)

        logger.info(f"DEBUG: Checking data pipeline for wallet={normalized_wallet}")

        results = {
            "wallet_original": wallet_address,
            "wallet_normalized": normalized_wallet,
            "timestamp": datetime.utcnow().isoformat(),
            "integrations": {},
            "summary": {
                "total_files": 0,
                "successful_decryptions": 0,
                "failed_decryptions": 0,
                "integrations_with_data": []
            },
            "errors": []
        }

        for integration in SUPPORTED_INTEGRATIONS:
            integration_result = {
                "files_found": 0,
                "files_by_type": {},
                "decryption_success": 0,
                "decryption_failed": 0,
                "sample_data": None,
                "errors": []
            }

            try:
                # List files for this integration
                files = await filecoin_service.list_customer_files(
                    customer_wallet=normalized_wallet,
                    integration=integration,
                    limit=50
                )

                integration_result["files_found"] = len(files)
                results["summary"]["total_files"] += len(files)

                # Group by data_type
                for file in files:
                    data_type = file.get("metadata", {}).get("data_type", "unknown")
                    if data_type not in integration_result["files_by_type"]:
                        integration_result["files_by_type"][data_type] = 0
                    integration_result["files_by_type"][data_type] += 1

                # Try to decrypt the first file to verify decryption works
                if files:
                    try:
                        first_file = files[0]
                        encrypted = await filecoin_service.retrieve_data(first_file["cid"])
                        decrypted = await encryption_service.decrypt_with_wallet(
                            encrypted_data=encrypted,
                            customer_wallet=normalized_wallet
                        )
                        integration_result["decryption_success"] = 1
                        results["summary"]["successful_decryptions"] += 1

                        # Include sample data (truncated)
                        if isinstance(decrypted, dict):
                            integration_result["sample_data"] = {
                                "type": "dict",
                                "keys": list(decrypted.keys())[:10],
                                "record_count": len(decrypted.get("records", [])) if "records" in decrypted else "N/A"
                            }
                        elif isinstance(decrypted, list):
                            integration_result["sample_data"] = {
                                "type": "list",
                                "count": len(decrypted)
                            }

                        results["summary"]["integrations_with_data"].append(integration)

                    except Exception as e:
                        integration_result["decryption_failed"] = 1
                        integration_result["errors"].append(f"Decryption failed: {str(e)}")
                        results["summary"]["failed_decryptions"] += 1
                        results["errors"].append(f"{integration}: {str(e)}")

            except Exception as e:
                integration_result["errors"].append(f"Query failed: {str(e)}")
                results["errors"].append(f"{integration} query: {str(e)}")

            results["integrations"][integration] = integration_result

        logger.info(
            f"DEBUG complete: {results['summary']['total_files']} files, "
            f"{results['summary']['successful_decryptions']} decrypted, "
            f"{len(results['summary']['integrations_with_data'])} integrations with data"
        )

        return results

    except Exception as e:
        logger.error(f"Debug endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Debug failed: {str(e)}")
