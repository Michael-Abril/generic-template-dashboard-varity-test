"""
OAuth Integration API Endpoints
Handles OAuth flows for QuickBooks, Salesforce, Shopify, and other integrations
"""
from fastapi import APIRouter, HTTPException, Query, Request, Depends
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
import httpx
import secrets
import json
import base64
import hashlib
from urllib.parse import urlencode
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.core.config import settings
from app.core.database import get_db
from app.models.purchase import OAuthToken

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize services
filecoin_service = FilecoinService()
encryption_service = EncryptionService()

# OAuth state storage (in production, use Redis)
# NOTE: This is in-memory and will be lost on restart. We also encode data in state as backup.
oauth_states = {}

# Normalization mapping for provider names (must match integrations.py)
# This ensures OAuth tokens are stored with the same name used by sync/data endpoints
PROVIDER_NAME_MAPPING = {
    "google workspace": "google",
    "googleworkspace": "google",
    "google-workspace": "google",
    "google_workspace": "google",
    "gsuite": "google",
    "microsoft 365": "microsoft",
    "microsoft365": "microsoft",
    "microsoft-365": "microsoft",
    "ms365": "microsoft",
}


def normalize_provider_name(name: str) -> str:
    """Normalize provider name to match storage format used by adapters."""
    normalized = name.lower().strip()
    return PROVIDER_NAME_MAPPING.get(normalized, normalized)

# Secret key for state signing (should be in environment variables in production)
STATE_SECRET = settings.secret_key if hasattr(settings, 'secret_key') else "varity-oauth-state-secret-key-2024"


def generate_pkce_pair() -> tuple:
    """
    Generate PKCE code_verifier and code_challenge pair.
    Required by Salesforce, Google, Microsoft, and other OAuth providers.
    """
    # Generate code_verifier (43-128 characters, URL-safe)
    code_verifier = secrets.token_urlsafe(64)[:128]

    # Generate code_challenge = BASE64URL(SHA256(code_verifier))
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip('=')

    return code_verifier, code_challenge


def encode_oauth_state(integration: str, wallet_address: str, shop_domain: str = None, subdomain: str = None, redirect_uri: str = None, code_verifier: str = None) -> str:
    """
    Encode OAuth state data into a signed token.
    This allows state validation even if the in-memory oauth_states dict is lost (e.g., backend restart).
    CRITICAL: redirect_uri is stored in state to ensure consistency between START and CALLBACK phases.
    """
    data = {
        "i": integration,  # integration
        "w": wallet_address.lower(),  # wallet
        "t": int(datetime.utcnow().timestamp()),  # timestamp
        "r": secrets.token_urlsafe(8),  # random nonce
    }
    if shop_domain:
        data["s"] = shop_domain
    if subdomain:
        data["d"] = subdomain
    if redirect_uri:
        data["u"] = redirect_uri  # redirect_uri - CRITICAL for OAuth consistency
    if code_verifier:
        data["v"] = code_verifier  # PKCE code_verifier for token exchange

    # Encode data
    payload = base64.urlsafe_b64encode(json.dumps(data).encode()).decode()

    # Create signature
    signature = hashlib.sha256(f"{payload}{STATE_SECRET}".encode()).hexdigest()[:16]

    return f"{payload}.{signature}"


def decode_oauth_state(state: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate OAuth state token.
    Returns None if invalid or expired (older than 30 minutes).
    """
    try:
        parts = state.split(".")
        if len(parts) != 2:
            return None

        payload, signature = parts

        # Verify signature
        expected_sig = hashlib.sha256(f"{payload}{STATE_SECRET}".encode()).hexdigest()[:16]
        if signature != expected_sig:
            logger.warning("OAuth state signature mismatch")
            return None

        # Decode payload
        data = json.loads(base64.urlsafe_b64decode(payload.encode()).decode())

        # Check expiration (30 minutes)
        timestamp = data.get("t", 0)
        if datetime.utcnow().timestamp() - timestamp > 1800:  # 30 minutes
            logger.warning("OAuth state expired")
            return None

        return {
            "integration": data.get("i"),
            "wallet_address": data.get("w"),
            "shop_domain": data.get("s"),
            "subdomain": data.get("d"),
            "redirect_uri": data.get("u"),  # CRITICAL: Use same redirect_uri as START phase
            "code_verifier": data.get("v"),  # PKCE code_verifier for token exchange
        }
    except Exception as e:
        logger.error(f"Failed to decode OAuth state: {e}")
        return None

# Helper function to build redirect URI for each provider
# OAuth redirects go to FRONTEND, not backend. Frontend then sends code to backend.
def get_redirect_uri(provider: str) -> str:
    """
    Build the OAuth redirect URI for a provider.
    OAuth providers redirect to frontend, which then exchanges code via backend API.
    """
    frontend_url = settings.frontend_url.rstrip('/')
    return f"{frontend_url}/oauth/callback/{provider}"


# OAuth Configuration for different providers
OAUTH_CONFIGS = {
    "quickbooks": {
        "authorize_url": "https://appcenter.intuit.com/connect/oauth2",
        "token_url": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
        "client_id": settings.quickbooks_client_id if hasattr(settings, 'quickbooks_client_id') else "",
        "client_secret": settings.quickbooks_client_secret if hasattr(settings, 'quickbooks_client_secret') else "",
        "redirect_uri": get_redirect_uri("quickbooks"),
        "scope": "com.intuit.quickbooks.accounting"
    },
    "salesforce": {
        "authorize_url": "https://login.salesforce.com/services/oauth2/authorize",
        "token_url": "https://login.salesforce.com/services/oauth2/token",
        "client_id": settings.salesforce_client_id if hasattr(settings, 'salesforce_client_id') else "",
        "client_secret": settings.salesforce_client_secret if hasattr(settings, 'salesforce_client_secret') else "",
        "redirect_uri": get_redirect_uri("salesforce"),
        "scope": "api refresh_token full id"
    },
    "shopify": {
        "authorize_url": "https://{shop}.myshopify.com/admin/oauth/authorize",
        "token_url": "https://{shop}.myshopify.com/admin/oauth/access_token",
        "client_id": settings.shopify_client_id if hasattr(settings, 'shopify_client_id') else "",
        "client_secret": settings.shopify_client_secret if hasattr(settings, 'shopify_client_secret') else "",
        "redirect_uri": get_redirect_uri("shopify"),
        "scope": "read_products,read_orders,read_customers"
    },
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "client_id": settings.google_client_id if hasattr(settings, 'google_client_id') else "",
        "client_secret": settings.google_client_secret if hasattr(settings, 'google_client_secret') else "",
        "redirect_uri": get_redirect_uri("google"),
        "scope": "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/tasks"
    },
    "microsoft": {
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "client_id": settings.microsoft_client_id if hasattr(settings, 'microsoft_client_id') else "",
        "client_secret": settings.microsoft_client_secret if hasattr(settings, 'microsoft_client_secret') else "",
        "redirect_uri": get_redirect_uri("microsoft"),
        "scope": "openid email profile User.Read Mail.Read Calendars.Read Files.Read Contacts.Read offline_access"
    },
    "stripe": {
        "authorize_url": "https://connect.stripe.com/oauth/authorize",
        "token_url": "https://connect.stripe.com/oauth/token",
        "client_id": settings.stripe_client_id if hasattr(settings, 'stripe_client_id') else "",
        "client_secret": settings.stripe_client_secret if hasattr(settings, 'stripe_client_secret') else "",
        "redirect_uri": get_redirect_uri("stripe"),
        "scope": "read_write"
    },
    "slack": {
        "authorize_url": "https://slack.com/oauth/v2/authorize",
        "token_url": "https://slack.com/api/oauth.v2.access",
        "client_id": settings.slack_client_id if hasattr(settings, 'slack_client_id') else "",
        "client_secret": settings.slack_client_secret if hasattr(settings, 'slack_client_secret') else "",
        "redirect_uri": get_redirect_uri("slack"),
        "scope": "channels:read,channels:history,users:read,files:read,chat:write"
    },
    "monday": {
        "authorize_url": "https://auth.monday.com/oauth2/authorize",
        "token_url": "https://auth.monday.com/oauth2/token",
        "client_id": settings.monday_client_id if hasattr(settings, 'monday_client_id') else "",
        "client_secret": settings.monday_client_secret if hasattr(settings, 'monday_client_secret') else "",
        "redirect_uri": get_redirect_uri("monday"),
        "scope": "boards:read,updates:read,users:read"
    },
    "hubspot": {
        "authorize_url": "https://app.hubspot.com/oauth/authorize",
        "token_url": "https://api.hubapi.com/oauth/v1/token",
        "client_id": settings.hubspot_client_id if hasattr(settings, 'hubspot_client_id') else "",
        "client_secret": settings.hubspot_client_secret if hasattr(settings, 'hubspot_client_secret') else "",
        "redirect_uri": get_redirect_uri("hubspot"),
        "scope": "crm.objects.contacts.read crm.objects.deals.read crm.objects.companies.read crm.objects.emails.read tickets"
    },
    "zendesk": {
        "authorize_url": "https://{subdomain}.zendesk.com/oauth/authorizations/new",
        "token_url": "https://{subdomain}.zendesk.com/oauth/tokens",
        "client_id": settings.zendesk_client_id if hasattr(settings, 'zendesk_client_id') else "",
        "client_secret": settings.zendesk_client_secret if hasattr(settings, 'zendesk_client_secret') else "",
        "redirect_uri": get_redirect_uri("zendesk"),
        "scope": "read"
    },
    # Alias: google_workspace maps to same config as google
    "google_workspace": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "client_id": settings.google_client_id if hasattr(settings, 'google_client_id') else "",
        "client_secret": settings.google_client_secret if hasattr(settings, 'google_client_secret') else "",
        "redirect_uri": get_redirect_uri("google_workspace"),
        "scope": "openid email profile https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/contacts https://www.googleapis.com/auth/tasks"
    }
}


class OAuthStartRequest(BaseModel):
    """OAuth flow start request"""
    wallet_address: str
    shop_domain: Optional[str] = None  # Required for Shopify
    subdomain: Optional[str] = None  # Required for Zendesk


class OAuthCallbackResponse(BaseModel):
    """OAuth callback response"""
    success: bool
    integration: str
    wallet_address: str
    message: str
    cid: Optional[str] = None


@router.post("/authorize")
async def authorize_oauth_alias(
    request: Request
):
    """
    Frontend-compatible OAuth authorization endpoint (alias)
    Extracts provider and wallet_address from request body and delegates to start_oauth_flow
    """
    try:
        body = await request.json()
        provider = body.get("provider")
        wallet_address = body.get("wallet_address")

        if not provider or not wallet_address:
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: provider, wallet_address"
            )

        oauth_request = OAuthStartRequest(
            wallet_address=wallet_address,
            shop_domain=body.get("shop_domain"),
            subdomain=body.get("subdomain")
        )

        return await start_oauth_flow(provider, oauth_request)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to authorize OAuth: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/start/{integration}")
async def start_oauth_flow(
    integration: str,
    request: OAuthStartRequest
):
    """
    Start OAuth authorization flow for an integration

    Args:
        integration: Integration name (quickbooks, salesforce, shopify)
        request: OAuth start request with wallet address

    Returns:
        Redirect URL to OAuth provider
    """
    try:
        if integration not in OAUTH_CONFIGS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported integration: {integration}"
            )

        config = OAUTH_CONFIGS[integration]

        # CRITICAL FIX: Get redirect_uri dynamically at request time, not module load time
        # This ensures consistency between START and CALLBACK phases
        redirect_uri = get_redirect_uri(integration)

        # Generate PKCE for providers that require it
        # Salesforce, Google, Microsoft require PKCE (code_challenge)
        pkce_providers = ["salesforce", "google", "google_workspace", "microsoft", "hubspot", "slack"]
        code_verifier = None
        code_challenge = None
        if integration in pkce_providers:
            code_verifier, code_challenge = generate_pkce_pair()

        # Generate state token for CSRF protection
        # State is self-contained (encoded with signature) so it survives backend restarts
        # CRITICAL: Store redirect_uri in state to ensure same URI is used in CALLBACK
        state = encode_oauth_state(
            integration=integration,
            wallet_address=request.wallet_address,
            shop_domain=request.shop_domain,
            subdomain=request.subdomain,
            redirect_uri=redirect_uri,  # Store for CALLBACK phase
            code_verifier=code_verifier  # Store PKCE verifier for token exchange
        )

        # Also store in memory for faster lookup (optional, state is self-validating)
        oauth_states[state] = {
            "integration": integration,
            "wallet_address": request.wallet_address,
            "shop_domain": request.shop_domain,
            "subdomain": request.subdomain,
            "redirect_uri": redirect_uri,
            "code_verifier": code_verifier
        }

        # Build authorization URL
        authorize_url = config["authorize_url"]

        # For Shopify, replace shop domain
        if integration == "shopify":
            if not request.shop_domain:
                raise HTTPException(
                    status_code=400,
                    detail="shop_domain is required for Shopify"
                )
            authorize_url = authorize_url.replace("{shop}", request.shop_domain)

        # For Zendesk, replace subdomain
        if integration == "zendesk":
            if not request.subdomain:
                raise HTTPException(
                    status_code=400,
                    detail="subdomain is required for Zendesk"
                )
            authorize_url = authorize_url.replace("{subdomain}", request.subdomain)

        # Build query parameters
        # CRITICAL: Use dynamic redirect_uri, not config["redirect_uri"] from module load
        params = {
            "client_id": config["client_id"],
            "redirect_uri": redirect_uri,  # Use dynamic redirect_uri for consistency
            "response_type": "code",
            "state": state,
            "scope": config["scope"]
        }

        # Add PKCE parameters if generated
        if code_challenge:
            params["code_challenge"] = code_challenge
            params["code_challenge_method"] = "S256"

        # Add integration-specific parameters
        if integration == "quickbooks":
            params["response_mode"] = "query"

        # Google/Google Workspace: Add access_type=offline for refresh tokens
        if integration in ["google", "google_workspace"]:
            params["access_type"] = "offline"
            params["prompt"] = "consent"  # Force consent to ensure refresh_token is returned

        auth_url = f"{authorize_url}?{urlencode(params)}"

        logger.info(
            f"Starting OAuth flow for {integration}, "
            f"wallet: {request.wallet_address}, "
            f"redirect_uri: {redirect_uri}"  # Log for debugging
        )

        return {
            "success": True,
            "authorization_url": auth_url,
            "integration": integration,
            "wallet_address": request.wallet_address
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start OAuth flow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/callback")
async def oauth_callback_post(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle OAuth callback with POST request from frontend (New Next.js OAuth flow)

    Accepts JSON body with: provider, code, state, wallet_address, redirect_uri

    This endpoint:
    1. Validates state token
    2. Exchanges authorization code for access token
    3. Stores token in database (OAuthToken table) for sync endpoint to use
    4. Encrypts token with Lit Protocol and stores in Filecoin
    5. Triggers initial data sync automatically
    6. Returns JSON success response

    Returns:
        JSON response with success status
    """
    try:
        # Parse JSON body from frontend
        body = await request.json()
        provider = body.get("provider")
        code = body.get("code")
        state = body.get("state")
        wallet_address = body.get("wallet_address")
        redirect_uri = body.get("redirect_uri")
        realm_id = body.get("realm_id")  # QuickBooks company ID (from callback URL)

        if not all([provider, code, state, wallet_address]):
            raise HTTPException(
                status_code=400,
                detail="Missing required fields: provider, code, state, wallet_address"
            )

        # Validate state - try memory first, then decode as fallback
        state_data = None
        if state in oauth_states:
            state_data = oauth_states.pop(state)
        else:
            # Fallback: decode self-contained state (survives backend restart)
            state_data = decode_oauth_state(state)
            if not state_data:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid or expired state token"
                )

        integration = state_data["integration"]

        # Normalize provider name for database storage (google_workspace -> google, etc.)
        # This ensures sync/data endpoints can find the tokens
        normalized_provider = normalize_provider_name(integration)

        # Verify provider matches state
        if integration != provider:
            raise HTTPException(
                status_code=400,
                detail=f"Provider mismatch: expected {integration}, got {provider}"
            )

        config = OAUTH_CONFIGS[integration]

        # Exchange code for access token
        token_url = config["token_url"]

        # For Shopify, replace shop domain
        if integration == "shopify":
            shop_domain = state_data.get("shop_domain")
            if not shop_domain:
                raise HTTPException(status_code=400, detail="Missing shop domain")
            token_url = token_url.replace("{shop}", shop_domain)

        # For Zendesk, replace subdomain
        if integration == "zendesk":
            subdomain = state_data.get("subdomain")
            if not subdomain:
                raise HTTPException(status_code=400, detail="Missing Zendesk subdomain")
            token_url = token_url.replace("{subdomain}", subdomain)

        # CRITICAL FIX: Use redirect_uri from state token, NOT from frontend request
        # This ensures the EXACT same redirect_uri is used in both START and CALLBACK
        # OAuth providers require redirect_uri to match EXACTLY
        state_redirect_uri = state_data.get("redirect_uri") or config["redirect_uri"]

        logger.info(
            f"OAuth callback POST for {integration}, "
            f"wallet: {wallet_address}, "
            f"redirect_uri (from state): {state_redirect_uri}, "
            f"redirect_uri (from frontend): {redirect_uri}"  # For debugging mismatch
        )

        # Build token request
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": state_redirect_uri,  # MUST match START phase redirect_uri
            "client_id": config["client_id"],
            "client_secret": config["client_secret"]
        }

        # Add PKCE code_verifier if present (required by Salesforce, Google, Microsoft, etc.)
        code_verifier = state_data.get("code_verifier")
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data=token_data if integration != "shopify" else None,
                json=token_data if integration == "shopify" else None,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded" if integration != "shopify" else "application/json"
                }
            )

            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for token: {response.text}"
                )

            token_response = response.json()

        # Prepare credentials for storage
        credentials = {
            "access_token": token_response.get("access_token"),
            "refresh_token": token_response.get("refresh_token"),
            "expires_in": token_response.get("expires_in"),
            "token_type": token_response.get("token_type", "Bearer"),
            "integration": integration,
            "wallet_address": wallet_address,
            "created_at": datetime.utcnow().isoformat()
        }

        # Add integration-specific data from token response
        if integration == "quickbooks" and realm_id:
            # QuickBooks realmId comes from callback URL, not token response
            credentials["realm_id"] = realm_id
        elif integration == "salesforce":
            # CRITICAL: Salesforce requires instance_url for all API calls
            credentials["instance_url"] = token_response.get("instance_url")
            credentials["id"] = token_response.get("id")  # User identity URL
            credentials["signature"] = token_response.get("signature")
        elif integration == "slack":
            # Slack returns team info and bot_user_id
            credentials["team_id"] = token_response.get("team", {}).get("id")
            credentials["team_name"] = token_response.get("team", {}).get("name")
            credentials["bot_user_id"] = token_response.get("bot_user_id")
            credentials["app_id"] = token_response.get("app_id")
        elif integration == "shopify":
            credentials["shop_domain"] = state_data.get("shop_domain")
        elif integration == "zendesk":
            credentials["subdomain"] = state_data.get("subdomain")

        # Encrypt credentials with Lit Protocol
        encrypted_credentials = await encryption_service.encrypt_for_customer(
            data=credentials,
            customer_wallet=wallet_address,
            additional_metadata={
                "integration": integration,
                "credential_type": "oauth_token"
            }
        )

        # Store encrypted credentials in Filecoin
        cid = await filecoin_service.upload_encrypted_data(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="oauth-credentials",
            encrypted_data=encrypted_credentials,
            metadata={
                "integration": integration,
                "credential_type": "oauth_token",
                "has_refresh_token": "true" if credentials.get("refresh_token") else "false"
            }
        )

        logger.info(
            f"Successfully stored OAuth credentials for {integration}, "
            f"wallet: {wallet_address}, CID: {cid}"
        )

        # Store token in database for sync endpoint to use
        # Use normalized_provider to ensure sync/data endpoints can find tokens
        try:
            # Check if token already exists for this user/provider
            existing_token_result = await db.execute(
                select(OAuthToken).where(
                    and_(
                        OAuthToken.user_address == wallet_address.lower(),
                        OAuthToken.provider == normalized_provider,
                        OAuthToken.is_active == True  # noqa: E712
                    )
                )
            )
            existing_token = existing_token_result.scalar_one_or_none()

            # Calculate token expiration
            expires_at = None
            if credentials.get("expires_in"):
                expires_at = datetime.utcnow() + timedelta(seconds=int(credentials["expires_in"]))

            if existing_token:
                # Update existing token
                existing_token.access_token = credentials["access_token"]
                existing_token.refresh_token = credentials.get("refresh_token")
                existing_token.expires_at = expires_at
                existing_token.provider_data = {
                    k: v for k, v in credentials.items()
                    if k not in ["access_token", "refresh_token", "expires_in", "token_type", "wallet_address"]
                }
                existing_token.updated_at = datetime.utcnow()
                logger.info(f"Updated existing OAuth token for {normalized_provider} (raw: {integration})")
            else:
                # Create new token with normalized provider name
                new_token = OAuthToken(
                    user_address=wallet_address.lower(),
                    provider=normalized_provider,
                    token_type=credentials.get("token_type", "Bearer"),
                    expires_at=expires_at,
                    scope=config.get("scope", ""),
                    provider_data={
                        k: v for k, v in credentials.items()
                        if k not in ["access_token", "refresh_token", "expires_in", "token_type", "wallet_address"]
                    },
                    connected_at=datetime.utcnow()
                )
                # Set tokens via properties to encrypt them
                new_token.access_token = credentials["access_token"]
                new_token.refresh_token = credentials.get("refresh_token")
                db.add(new_token)
                logger.info(f"Created new OAuth token for {normalized_provider} (raw: {integration})")

            await db.commit()

        except Exception as db_error:
            logger.error(f"Failed to store token in database: {db_error}")
            # Don't fail the OAuth flow if database storage fails
            # The Filecoin storage already succeeded

        # Trigger initial data sync automatically
        sync_result = None
        try:
            logger.info(f"Triggering initial sync for {integration}...")

            # Dynamic import based on integration
            # Available sync adapters (only include adapters that exist)
            # All adapters now accept credentials dict
            sync_adapters = {
                "quickbooks": ("app.adapters.quickbooks.sync", "QuickBooksSync"),
                "google": ("app.adapters.google.sync", "GoogleWorkspaceSync"),
                "google_workspace": ("app.adapters.google.sync", "GoogleWorkspaceSync"),
                "microsoft": ("app.adapters.microsoft.sync", "MicrosoftSync"),
                "slack": ("app.adapters.slack.sync", "SlackSync"),
                "hubspot": ("app.adapters.hubspot.sync", "HubSpotSync"),
                "salesforce": ("app.adapters.salesforce.sync", "SalesforceSync"),
                "shopify": ("app.adapters.shopify.sync", "ShopifySync"),
                "zendesk": ("app.adapters.zendesk.sync", "ZendeskSync"),
                "stripe": ("app.adapters.stripe.sync", "StripeSync"),
                "monday": ("app.adapters.monday.sync", "MondaySync"),
            }

            if integration in sync_adapters:
                import importlib
                module_path, class_name = sync_adapters[integration]
                module = importlib.import_module(module_path)
                SyncClass = getattr(module, class_name)

                # Initialize sync adapter with credentials dict
                sync = SyncClass(credentials)

                # Trigger sync
                sync_result = await sync.sync_data(wallet_address)
                logger.info(f"Initial sync completed for {integration}: {sync_result.get('data', {}).keys() if sync_result else 'N/A'}")
            else:
                logger.warning(f"No sync adapter found for {integration}")

        except Exception as sync_error:
            logger.error(f"Auto-sync failed for {integration}: {sync_error}", exc_info=True)
            # Don't fail OAuth flow if sync fails - credentials are stored

        # Return JSON success response (no redirect for POST)
        return {
            "success": True,
            "message": f"Successfully connected {integration}",
            "integration": integration,
            "wallet_address": wallet_address,
            "cid": cid,
            "sync_triggered": sync_result is not None,
            "sync_result": sync_result if sync_result else None
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/callback")
async def oauth_callback(
    code: str = Query(..., description="OAuth authorization code"),
    state: str = Query(..., description="CSRF state token"),
    realmId: Optional[str] = Query(None, description="QuickBooks realm ID")
):
    """
    Handle OAuth callback from provider (Legacy GET endpoint for direct provider redirects)

    This endpoint:
    1. Validates state token
    2. Exchanges authorization code for access token
    3. Encrypts token with Lit Protocol
    4. Stores encrypted token in Filecoin
    5. Returns success/failure

    Args:
        code: Authorization code from OAuth provider
        state: State token for CSRF protection
        realmId: QuickBooks company ID (optional)

    Returns:
        Success message with redirect to frontend
    """
    try:
        # Validate state - try memory first, then decode as fallback
        state_data = None
        if state in oauth_states:
            state_data = oauth_states.pop(state)
        else:
            # Fallback: decode self-contained state (survives backend restart)
            state_data = decode_oauth_state(state)
            if not state_data:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid or expired state token"
                )

        integration = state_data["integration"]
        wallet_address = state_data["wallet_address"]

        config = OAUTH_CONFIGS[integration]

        # Exchange code for access token
        token_url = config["token_url"]

        # For Shopify, replace shop domain
        if integration == "shopify":
            shop_domain = state_data.get("shop_domain")
            if not shop_domain:
                raise HTTPException(
                    status_code=400,
                    detail="Missing shop domain"
                )
            token_url = token_url.replace("{shop}", shop_domain)

        # For Zendesk, replace subdomain
        if integration == "zendesk":
            subdomain = state_data.get("subdomain")
            if not subdomain:
                raise HTTPException(
                    status_code=400,
                    detail="Missing Zendesk subdomain"
                )
            token_url = token_url.replace("{subdomain}", subdomain)

        # CRITICAL FIX: Use redirect_uri from state token for consistency
        state_redirect_uri = state_data.get("redirect_uri") or config["redirect_uri"]

        logger.info(
            f"Legacy OAuth callback for {integration}, "
            f"wallet: {wallet_address}, "
            f"redirect_uri (from state): {state_redirect_uri}"
        )

        # Build token request
        token_data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": state_redirect_uri,  # MUST match START phase redirect_uri
            "client_id": config["client_id"],
            "client_secret": config["client_secret"]
        }

        # Add PKCE code_verifier if present (required by Salesforce, Google, Microsoft, etc.)
        code_verifier = state_data.get("code_verifier")
        if code_verifier:
            token_data["code_verifier"] = code_verifier

        # Exchange code for token
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                data=token_data if integration != "shopify" else None,
                json=token_data if integration == "shopify" else None,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/x-www-form-urlencoded" if integration != "shopify" else "application/json"
                }
            )

            if response.status_code != 200:
                logger.error(f"Legacy token exchange failed for {integration}: {response.text}, redirect_uri: {state_redirect_uri}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to exchange code for token: {response.text}"
                )

            token_response = response.json()

        # Prepare credentials for storage
        credentials = {
            "access_token": token_response.get("access_token"),
            "refresh_token": token_response.get("refresh_token"),
            "expires_in": token_response.get("expires_in"),
            "token_type": token_response.get("token_type", "Bearer"),
            "integration": integration,
            "wallet_address": wallet_address,
            "created_at": datetime.utcnow().isoformat()
        }

        # Add integration-specific data from token response
        if integration == "quickbooks" and realmId:
            credentials["realm_id"] = realmId
        elif integration == "salesforce":
            # CRITICAL: Salesforce requires instance_url for all API calls
            credentials["instance_url"] = token_response.get("instance_url")
            credentials["id"] = token_response.get("id")  # User identity URL
            credentials["signature"] = token_response.get("signature")
        elif integration == "slack":
            # Slack returns team info and bot_user_id
            credentials["team_id"] = token_response.get("team", {}).get("id")
            credentials["team_name"] = token_response.get("team", {}).get("name")
            credentials["bot_user_id"] = token_response.get("bot_user_id")
            credentials["app_id"] = token_response.get("app_id")
        elif integration == "shopify":
            credentials["shop_domain"] = state_data.get("shop_domain")
        elif integration == "zendesk":
            credentials["subdomain"] = state_data.get("subdomain")

        # Encrypt credentials with Lit Protocol
        encrypted_credentials = await encryption_service.encrypt_for_customer(
            data=credentials,
            customer_wallet=wallet_address,
            additional_metadata={
                "integration": integration,
                "credential_type": "oauth_token"
            }
        )

        # Store encrypted credentials in Filecoin
        cid = await filecoin_service.upload_encrypted_data(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="oauth-credentials",
            encrypted_data=encrypted_credentials,
            metadata={
                "integration": integration,
                "credential_type": "oauth_token",
                "has_refresh_token": "true" if credentials.get("refresh_token") else "false"
            }
        )

        logger.info(
            f"Successfully stored OAuth credentials for {integration}, "
            f"wallet: {wallet_address}, CID: {cid}"
        )

        # Trigger initial data sync
        try:
            logger.info(f"Triggering initial sync for {integration}...")

            # Available sync adapters (only include adapters that exist)
            # All adapters now accept credentials dict
            sync_adapters = {
                "quickbooks": ("app.adapters.quickbooks.sync", "QuickBooksSync"),
                "google": ("app.adapters.google.sync", "GoogleWorkspaceSync"),
                "google_workspace": ("app.adapters.google.sync", "GoogleWorkspaceSync"),
                "microsoft": ("app.adapters.microsoft.sync", "MicrosoftSync"),
                "slack": ("app.adapters.slack.sync", "SlackSync"),
                "hubspot": ("app.adapters.hubspot.sync", "HubSpotSync"),
                "salesforce": ("app.adapters.salesforce.sync", "SalesforceSync"),
                "shopify": ("app.adapters.shopify.sync", "ShopifySync"),
                "zendesk": ("app.adapters.zendesk.sync", "ZendeskSync"),
                "stripe": ("app.adapters.stripe.sync", "StripeSync"),
                "monday": ("app.adapters.monday.sync", "MondaySync"),
            }

            if integration in sync_adapters:
                import importlib
                module_path, class_name = sync_adapters[integration]
                module = importlib.import_module(module_path)
                SyncClass = getattr(module, class_name)

                # Initialize sync adapter with credentials dict
                sync = SyncClass(credentials)

                # Trigger sync (this will run in background)
                result = await sync.sync_data(wallet_address)
                logger.info(f"Initial sync completed for {integration}: {result}")
            else:
                logger.warning(f"No sync adapter found for {integration}")

        except Exception as e:
            logger.error(f"Sync trigger failed for {integration}: {e}", exc_info=True)
            # Don't fail OAuth flow if sync fails - credentials are already stored

        # Redirect to frontend with success message
        redirect_url = f"{settings.frontend_url}/integrations?success=true&integration={integration}"

        return RedirectResponse(url=redirect_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OAuth callback failed: {e}")
        # Redirect to frontend with error
        redirect_url = f"{settings.frontend_url}/integrations?success=false&error={str(e)}"
        return RedirectResponse(url=redirect_url)


@router.get("/status/{integration}")
async def get_oauth_status(
    integration: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Check OAuth connection status for an integration

    Args:
        integration: Integration name
        wallet_address: User's wallet address

    Returns:
        Connection status and last sync info
    """
    try:
        # List files for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="oauth-credentials",
            limit=10
        )

        if not files:
            return {
                "success": True,
                "integration": integration,
                "connected": False,
                "message": "No OAuth credentials found"
            }

        # Get most recent credential
        credential_file = files[0]

        return {
            "success": True,
            "integration": integration,
            "connected": True,
            "credential_cid": credential_file["cid"],
            "stored_at": credential_file["timestamp"],
            "metadata": credential_file.get("metadata", {})
        }

    except Exception as e:
        logger.error(f"Failed to check OAuth status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/disconnect/{integration}")
async def disconnect_oauth(
    integration: str,
    wallet_address: str = Query(..., description="User's wallet address")
):
    """
    Disconnect OAuth integration by removing stored credentials

    Args:
        integration: Integration name
        wallet_address: User's wallet address

    Returns:
        Success confirmation
    """
    try:
        # List and delete all OAuth credentials for this integration
        files = await filecoin_service.list_customer_files(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="oauth-credentials",
            limit=100
        )

        deleted_count = 0
        for file in files:
            await filecoin_service.unpin_file(file["cid"])
            deleted_count += 1

        logger.info(
            f"Disconnected {integration} for wallet {wallet_address}, "
            f"deleted {deleted_count} credential files"
        )

        return {
            "success": True,
            "integration": integration,
            "wallet_address": wallet_address,
            "deleted_credentials": deleted_count
        }

    except Exception as e:
        logger.error(f"Failed to disconnect OAuth: {e}")
        raise HTTPException(status_code=500, detail=str(e))
