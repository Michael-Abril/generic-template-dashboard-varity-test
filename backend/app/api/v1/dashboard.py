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
import logging
import json

import httpx
import os

from app.core.database import get_db
from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService, normalize_wallet_address

logger = logging.getLogger(__name__)

router = APIRouter(tags=["dashboard"])

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# All 6 supported integrations
SUPPORTED_INTEGRATIONS = ["quickbooks", "google", "microsoft", "slack", "salesforce", "hubspot"]

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
    data_type: str
) -> List[Dict[str, Any]]:
    """
    Fetch data from live API endpoints for LIVE data types.

    For gmail, calendar, slack channels etc - these should be fetched
    in real-time from the integration APIs, not from synced storage.

    Args:
        wallet_address: User's wallet address
        integration: Integration name (google, slack, etc.)
        data_type: Type of data (gmail, calendar, channels, etc.)

    Returns:
        List of records from live API
    """
    endpoint_key = (integration, data_type)
    endpoint = LIVE_ENDPOINTS.get(endpoint_key)

    if not endpoint:
        logger.warning(f"No live endpoint configured for {integration}/{data_type}")
        return []

    # Get the API base URL - use internal request for same-server endpoints
    api_base = os.getenv("API_BASE_URL", "http://localhost:8000")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{api_base}{endpoint}",
                params={"wallet_address": wallet_address}
            )

            if response.status_code == 200:
                data = response.json()

                # Handle different response formats from live endpoints
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    # Check for common response keys
                    for key in ["emails", "events", "channels", "messages", "users", "data", "items"]:
                        if key in data and isinstance(data[key], list):
                            return data[key]
                    # If it's a dict with success status, look for data
                    if "data" in data:
                        return data["data"] if isinstance(data["data"], list) else [data["data"]]
                    return [data]  # Return as single-item list
                return []
            else:
                logger.warning(
                    f"Live API {endpoint} returned status {response.status_code} "
                    f"for wallet {wallet_address[:15]}..."
                )
                return []

    except httpx.TimeoutException:
        logger.warning(f"Timeout fetching live data from {endpoint}")
        return []
    except Exception as e:
        logger.error(f"Error fetching live data from {endpoint}: {e}")
        return []


async def get_kpi_data(
    wallet_address: str,
    integration: str,
    data_type: str
) -> List[Dict[str, Any]]:
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

    Returns:
        List of data records
    """
    routing = DATA_ROUTING_RULES.get(integration, {}).get(data_type, RAG_STORAGE)

    if routing == LIVE_API:
        # Always use live API for real-time data types
        live_data = await fetch_live_data(wallet_address, integration, data_type)
        if live_data:
            logger.info(f"KPI: Got {len(live_data)} records from live API for {integration}/{data_type}")
            return live_data
        # Fall back to synced data if live API fails
        logger.info(f"KPI: Live API returned empty for {integration}/{data_type}, falling back to RAG")
        return await get_integration_data(wallet_address, integration, data_type)

    elif routing == HYBRID:
        # Try live first for recent data, merge with synced data
        live_data = await fetch_live_data(wallet_address, integration, data_type)
        rag_data = await get_integration_data(wallet_address, integration, data_type)

        if live_data and rag_data:
            # Dedupe by id if possible, prefer live data
            live_ids = {item.get("id") for item in live_data if item.get("id")}
            merged = list(live_data)
            for item in rag_data:
                if item.get("id") not in live_ids:
                    merged.append(item)
            logger.info(f"KPI: Merged {len(live_data)} live + {len(rag_data)} RAG for {integration}/{data_type}")
            return merged
        return live_data or rag_data

    else:  # RAG_STORAGE
        # Use synced Filecoin storage
        return await get_integration_data(wallet_address, integration, data_type)


# =====================================================================
# ENDPOINTS
# =====================================================================

@router.get("/kpis", response_model=KPIMetricsResponse)
async def get_dashboard_kpis(
    wallet_address: str = Query(..., description="User's wallet address"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get KPI metrics for the dashboard from ALL 6 integrations

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

        # ============================================
        # QUICKBOOKS DATA - Financial KPIs
        # ============================================
        try:
            # QuickBooks invoices - HYBRID (live + synced)
            qb_invoices = await get_kpi_data(
                wallet_address=wallet_address,
                integration="quickbooks",
                data_type="invoices"
            )

            if qb_invoices:
                data_sources.append("QuickBooks")

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
            logger.warning(f"QuickBooks data unavailable: {e}")

        # ============================================
        # GOOGLE WORKSPACE DATA - Productivity KPIs
        # ============================================
        try:
            # Gmail - LIVE API (real-time unread count)
            gmail_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="gmail"
            )

            if gmail_data:
                data_sources.append("Google") if "Google" not in data_sources else None

                # Handle both list of messages and dict with messages key
                if isinstance(gmail_data, list):
                    messages = gmail_data
                elif isinstance(gmail_data, dict):
                    messages = gmail_data.get("messages", [])
                else:
                    messages = []

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

                logger.info(f"Google Gmail: {email_count} emails, {unread_count} unread")

            # Calendar - LIVE API (real-time event count)
            calendar_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="calendar"
            )

            if calendar_data:
                data_sources.append("Google") if "Google" not in data_sources else None

                # Handle both list and dict formats
                if isinstance(calendar_data, list):
                    events = calendar_data
                elif isinstance(calendar_data, dict):
                    events = calendar_data.get("events", [])
                else:
                    events = []

                event_count = len(events)

                kpis.append(DynamicKPI(
                    id="google_events",
                    title="Calendar Events",
                    value=str(event_count),
                    change_value=0.0,
                    change_period="upcoming",
                    icon="Calendar",
                    source="Google",
                    trend="neutral",
                    color="purple"
                ))

                logger.info(f"Google Calendar: {event_count} events")

            # Drive
            drive_data = await get_integration_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="drive"
            )

            if drive_data:
                data_sources.append("Google") if "Google" not in data_sources else None

                # Handle both list and dict formats
                if isinstance(drive_data, list):
                    files = drive_data
                elif isinstance(drive_data, dict):
                    files = drive_data.get("files", [])
                else:
                    files = []

                file_count = len(files)

                kpis.append(DynamicKPI(
                    id="google_files",
                    title="Drive Files",
                    value=str(file_count),
                    change_value=0.0,
                    change_period="synced",
                    icon="FolderOpen",
                    source="Google",
                    trend="neutral",
                    color="green"
                ))

                logger.info(f"Google Drive: {file_count} files")

            # Contacts
            contacts_data = await get_integration_data(
                wallet_address=wallet_address,
                integration="google",
                data_type="contacts"
            )

            if contacts_data:
                data_sources.append("Google") if "Google" not in data_sources else None

                # Handle both list and dict formats
                if isinstance(contacts_data, list):
                    contacts = contacts_data
                elif isinstance(contacts_data, dict):
                    contacts = contacts_data.get("contacts", [])
                else:
                    contacts = []

                contact_count = len(contacts)

                kpis.append(DynamicKPI(
                    id="google_contacts",
                    title="Contacts",
                    value=str(contact_count),
                    change_value=0.0,
                    change_period="synced",
                    icon="Users",
                    source="Google",
                    trend="neutral",
                    color="blue"
                ))

                logger.info(f"Google Contacts: {contact_count} contacts")

        except Exception as e:
            logger.warning(f"Google Workspace data unavailable: {e}")

        # ============================================
        # MICROSOFT 365 DATA - Productivity KPIs
        # ============================================
        try:
            # Outlook Mail - LIVE API (real-time email count)
            outlook_data = await get_kpi_data(
                wallet_address=wallet_address,
                integration="microsoft",
                data_type="mail"
            )

            if outlook_data:
                data_sources.append("Microsoft") if "Microsoft" not in data_sources else None

                if isinstance(outlook_data, list):
                    messages = outlook_data
                elif isinstance(outlook_data, dict):
                    messages = outlook_data.get("messages", [])
                else:
                    messages = []

                email_count = len(messages)

                kpis.append(DynamicKPI(
                    id="ms_emails",
                    title="Outlook Emails",
                    value=str(email_count),
                    change_value=0.0,
                    change_period="synced",
                    icon="Mail",
                    source="Microsoft",
                    trend="neutral",
                    color="blue"
                ))

                logger.info(f"Microsoft Outlook: {email_count} emails")

            # OneDrive
            onedrive_data = await get_integration_data(
                wallet_address=wallet_address,
                integration="microsoft",
                data_type="files"
            )

            if onedrive_data:
                data_sources.append("Microsoft") if "Microsoft" not in data_sources else None

                if isinstance(onedrive_data, list):
                    files = onedrive_data
                elif isinstance(onedrive_data, dict):
                    files = onedrive_data.get("files", [])
                else:
                    files = []

                file_count = len(files)

                kpis.append(DynamicKPI(
                    id="ms_files",
                    title="OneDrive Files",
                    value=str(file_count),
                    change_value=0.0,
                    change_period="synced",
                    icon="FolderOpen",
                    source="Microsoft",
                    trend="neutral",
                    color="blue"
                ))

                logger.info(f"Microsoft OneDrive: {file_count} files")

        except Exception as e:
            logger.warning(f"Microsoft 365 data unavailable: {e}")

        # ============================================
        # SLACK DATA - Communication KPIs
        # ============================================
        try:
            # Slack messages - HYBRID (live + synced)
            slack_messages = await get_kpi_data(
                wallet_address=wallet_address,
                integration="slack",
                data_type="messages"
            )

            if slack_messages:
                data_sources.append("Slack") if "Slack" not in data_sources else None

                if isinstance(slack_messages, list):
                    messages = slack_messages
                elif isinstance(slack_messages, dict):
                    messages = slack_messages.get("messages", [])
                else:
                    messages = []

                msg_count = len(messages)

                kpis.append(DynamicKPI(
                    id="slack_messages",
                    title="Slack Messages",
                    value=str(msg_count),
                    change_value=0.0,
                    change_period="synced",
                    icon="MessageSquare",
                    source="Slack",
                    trend="neutral",
                    color="purple"
                ))

                logger.info(f"Slack: {msg_count} messages")

            # Slack channels - LIVE API (real-time channel count)
            slack_channels = await get_kpi_data(
                wallet_address=wallet_address,
                integration="slack",
                data_type="channels"
            )

            if slack_channels:
                data_sources.append("Slack") if "Slack" not in data_sources else None

                if isinstance(slack_channels, list):
                    channels = slack_channels
                elif isinstance(slack_channels, dict):
                    channels = slack_channels.get("channels", [])
                else:
                    channels = []

                channel_count = len(channels)

                kpis.append(DynamicKPI(
                    id="slack_channels",
                    title="Slack Channels",
                    value=str(channel_count),
                    change_value=0.0,
                    change_period="active",
                    icon="Hash",
                    source="Slack",
                    trend="neutral",
                    color="purple"
                ))

                logger.info(f"Slack: {channel_count} channels")

        except Exception as e:
            logger.warning(f"Slack data unavailable: {e}")

        # ============================================
        # SALESFORCE DATA - CRM KPIs
        # ============================================
        try:
            sf_accounts = await get_integration_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="accounts"
            )

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

                logger.info(f"Salesforce: {account_count} accounts")

            # Salesforce opportunities - HYBRID (live + synced)
            sf_opportunities = await get_kpi_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="opportunities"
            )

            if sf_opportunities:
                data_sources.append("Salesforce") if "Salesforce" not in data_sources else None

                opp_count = len(sf_opportunities) if isinstance(sf_opportunities, list) else 0
                opp_value = sum(
                    float(opp.get("amount", 0))
                    for opp in sf_opportunities
                ) if isinstance(sf_opportunities, list) else 0

                kpis.append(DynamicKPI(
                    id="sf_opportunities",
                    title="Opportunities",
                    value=str(opp_count),
                    change_value=0.0,
                    change_period=f"${opp_value:,.0f} pipeline",
                    icon="Target",
                    source="Salesforce",
                    trend="neutral",
                    color="green"
                ))

                logger.info(f"Salesforce: {opp_count} opportunities, ${opp_value} pipeline")

            # Salesforce leads - HYBRID (live + synced)
            sf_leads = await get_kpi_data(
                wallet_address=wallet_address,
                integration="salesforce",
                data_type="leads"
            )

            if sf_leads:
                data_sources.append("Salesforce") if "Salesforce" not in data_sources else None

                lead_count = len(sf_leads) if isinstance(sf_leads, list) else 0

                kpis.append(DynamicKPI(
                    id="sf_leads",
                    title="Leads",
                    value=str(lead_count),
                    change_value=0.0,
                    change_period="active",
                    icon="UserPlus",
                    source="Salesforce",
                    trend="neutral",
                    color="orange"
                ))

                logger.info(f"Salesforce: {lead_count} leads")

        except Exception as e:
            logger.warning(f"Salesforce data unavailable: {e}")

        # ============================================
        # HUBSPOT DATA - Marketing/CRM KPIs
        # ============================================
        try:
            hs_contacts = await get_integration_data(
                wallet_address=wallet_address,
                integration="hubspot",
                data_type="contacts"
            )

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

                logger.info(f"HubSpot: {contact_count} contacts")

            # HubSpot deals - HYBRID (live + synced)
            hs_deals = await get_kpi_data(
                wallet_address=wallet_address,
                integration="hubspot",
                data_type="deals"
            )

            if hs_deals:
                data_sources.append("HubSpot") if "HubSpot" not in data_sources else None

                deal_count = len(hs_deals) if isinstance(hs_deals, list) else 0
                deal_value = sum(
                    float(deal.get("amount", 0))
                    for deal in hs_deals
                ) if isinstance(hs_deals, list) else 0

                kpis.append(DynamicKPI(
                    id="hs_deals",
                    title="Deals",
                    value=str(deal_count),
                    change_value=0.0,
                    change_period=f"${deal_value:,.0f} pipeline",
                    icon="Handshake",
                    source="HubSpot",
                    trend="neutral",
                    color="green"
                ))

                logger.info(f"HubSpot: {deal_count} deals, ${deal_value} pipeline")

            hs_companies = await get_integration_data(
                wallet_address=wallet_address,
                integration="hubspot",
                data_type="companies"
            )

            if hs_companies:
                data_sources.append("HubSpot") if "HubSpot" not in data_sources else None

                company_count = len(hs_companies) if isinstance(hs_companies, list) else 0

                kpis.append(DynamicKPI(
                    id="hs_companies",
                    title="Companies",
                    value=str(company_count),
                    change_value=0.0,
                    change_period="total",
                    icon="Building",
                    source="HubSpot",
                    trend="neutral",
                    color="orange"
                ))

                logger.info(f"HubSpot: {company_count} companies")

        except Exception as e:
            logger.warning(f"HubSpot data unavailable: {e}")

        # Determine if we have any data
        has_data = len(kpis) > 0

        logger.info(f"Dashboard KPIs: {len(kpis)} KPIs from {len(data_sources)} integrations")

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
