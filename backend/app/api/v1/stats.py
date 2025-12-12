"""
Stats API - Public statistics endpoints for the Varity dashboard.

This module provides endpoints for:
- Signup progress tracking (beta program spots)
- Platform statistics

NOTE: Email tracking is handled by Privy dashboard.
This module only tracks signup COUNT for the progress bar.

STORAGE: Signup count stored in Filecoin/IPFS via Pinata for:
- Dynamic access from anywhere (laptop, phone, etc.)
- Persistent decentralized storage
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import json
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Beta program configuration
BETA_TOTAL_SPOTS = 100

# Varity internal namespace for signup tracking
VARITY_SIGNUPS_NAMESPACE = "varity-internal-beta-signups"


# Pydantic models (simplified - no email validation needed, Privy handles that)
class BetaSignupRequest(BaseModel):
    wallet_address: str  # Required - unique identifier from Privy
    source: Optional[str] = "dashboard"


def _get_pinata_headers() -> dict:
    """Build authentication headers for Pinata API"""
    headers = {"Content-Type": "application/json"}
    if settings.pinata_jwt:
        headers["Authorization"] = f"Bearer {settings.pinata_jwt}"
    else:
        headers["pinata_api_key"] = settings.pinata_api_key
        headers["pinata_secret_api_key"] = settings.pinata_secret_key
    return headers


async def load_signups_from_pinata() -> List[dict]:
    """
    Load all signups from Pinata/Filecoin.
    Queries all pins with varity-internal-beta-signups namespace.
    """
    try:
        headers = _get_pinata_headers()

        filters = {
            "status": "pinned",
            "metadata[keyvalues][namespace]": json.dumps({
                "value": VARITY_SIGNUPS_NAMESPACE,
                "op": "eq"
            })
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.pinata_api_url}/data/pinList",
                params={"pageLimit": 1000, **filters},
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()

            result = response.json()
            signups = []

            for pin in result.get("rows", []):
                cid = pin["ipfs_pin_hash"]
                try:
                    data_response = await client.get(
                        f"{settings.pinata_gateway_url}/ipfs/{cid}",
                        timeout=10.0
                    )
                    if data_response.status_code == 200:
                        signup_data = data_response.json()
                        signups.append(signup_data)
                except Exception as e:
                    logger.warning(f"Failed to fetch signup {cid}: {e}")

            signups.sort(key=lambda x: x.get("signup_number", 0))
            return signups

    except Exception as e:
        logger.error(f"Error loading signups from Pinata: {e}")
        return []


async def save_signup_to_pinata(signup: dict) -> Optional[str]:
    """
    Save a single signup to Pinata/Filecoin.
    Returns the CID if successful.
    """
    try:
        headers = _get_pinata_headers()

        pin_data = {
            "pinataContent": signup,
            "pinataMetadata": {
                "name": f"{VARITY_SIGNUPS_NAMESPACE}-{signup['signup_number']:04d}",
                "keyvalues": {
                    "namespace": VARITY_SIGNUPS_NAMESPACE,
                    "wallet_address": signup["wallet_address"],
                    "signup_number": str(signup["signup_number"]),
                    "is_early_adopter": str(signup["is_early_adopter"]).lower(),
                    "source": signup.get("source", "dashboard"),
                    "layer": "varity-internal"
                }
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{settings.pinata_api_url}/pinning/pinJSONToIPFS",
                json=pin_data,
                headers=headers,
                timeout=30.0
            )
            response.raise_for_status()

            result = response.json()
            cid = result["IpfsHash"]
            logger.info(f"Saved signup #{signup['signup_number']} to Pinata: CID={cid}")
            return cid

    except Exception as e:
        logger.error(f"Error saving signup to Pinata: {e}")
        return None


async def get_signup_count() -> int:
    """Get the current signup count from Pinata."""
    try:
        headers = _get_pinata_headers()

        filters = {
            "status": "pinned",
            "metadata[keyvalues][namespace]": json.dumps({
                "value": VARITY_SIGNUPS_NAMESPACE,
                "op": "eq"
            })
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.pinata_api_url}/data/pinList",
                params={"pageLimit": 1, **filters},
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()

            result = response.json()
            return result.get("count", 0)

    except Exception as e:
        logger.error(f"Error getting signup count: {e}")
        return 0


async def wallet_exists(wallet_address: str) -> bool:
    """Check if a wallet already exists in signups (prevents duplicates)."""
    try:
        headers = _get_pinata_headers()

        filters = {
            "status": "pinned",
            "metadata[keyvalues][namespace]": json.dumps({
                "value": VARITY_SIGNUPS_NAMESPACE,
                "op": "eq"
            }),
            "metadata[keyvalues][wallet_address]": json.dumps({
                "value": wallet_address.lower(),
                "op": "eq"
            })
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{settings.pinata_api_url}/data/pinList",
                params={"pageLimit": 1, **filters},
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()

            result = response.json()
            return result.get("count", 0) > 0

    except Exception as e:
        logger.error(f"Error checking wallet existence: {e}")
        return False


async def add_signup(wallet_address: str, source: str = "dashboard") -> Optional[dict]:
    """
    Add a new signup to Pinata/Filecoin.
    Returns the signup record, or None if wallet already exists.

    Note: Email tracking is handled by Privy dashboard.
    """
    # Check if wallet already registered
    if await wallet_exists(wallet_address):
        return None

    count = await get_signup_count()

    signup = {
        "wallet_address": wallet_address.lower(),
        "signed_up_at": datetime.utcnow().isoformat(),
        "source": source,
        "is_early_adopter": count < BETA_TOTAL_SPOTS,
        "signup_number": count + 1
    }

    cid = await save_signup_to_pinata(signup)

    if cid:
        signup["cid"] = cid
        logger.info(f"New beta signup #{count + 1}: {wallet_address[:10]}... (early_adopter: {signup['is_early_adopter']})")
        return signup

    return None


@router.get("/stats/signups")
async def get_signup_stats():
    """
    Get current signup statistics for the beta program.
    Data is fetched DYNAMICALLY from Pinata/Filecoin.

    Returns:
        - count: Number of users signed up
        - total: Total spots available (100 for beta)
        - lastUpdated: ISO timestamp of when this was calculated
        - percentage: Percentage of spots claimed
        - spotsRemaining: Number of spots still available

    This endpoint is PUBLIC and used by the landing page progress bar.
    """
    try:
        count = await get_signup_count()
        total = BETA_TOTAL_SPOTS

        return {
            "count": count,
            "total": total,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": min(100, round((count / total) * 100, 1)) if total > 0 else 0,
            "spotsRemaining": max(0, total - count)
        }

    except Exception as e:
        logger.error(f"Error fetching signup stats: {e}")
        # Return default values on error (graceful degradation)
        return {
            "count": 0,
            "total": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": 0,
            "spotsRemaining": BETA_TOTAL_SPOTS
        }


@router.post("/stats/signups/register")
async def register_beta_signup(request: BetaSignupRequest):
    """
    Register a new beta signup by wallet address.
    Called when a new user completes authentication via Privy.

    NOTE: Email tracking is handled by Privy dashboard.
    This only tracks wallet addresses for the progress bar count.

    Returns:
    - success: Whether this is a new signup
    - is_new: True if first time, False if already registered
    - is_early_adopter: True if within first 100 signups
    - signup_number: Their position in the signup queue
    """
    try:
        # Check if wallet already registered
        if await wallet_exists(request.wallet_address):
            count = await get_signup_count()
            return {
                "success": True,
                "is_new": False,
                "message": "Already registered",
                "count": count,
                "total": BETA_TOTAL_SPOTS,
                "lastUpdated": datetime.utcnow().isoformat(),
                "percentage": min(100, round((count / BETA_TOTAL_SPOTS) * 100, 1)),
                "spotsRemaining": max(0, BETA_TOTAL_SPOTS - count)
            }

        # Add new signup (stored in Pinata/Filecoin)
        signup = await add_signup(
            wallet_address=request.wallet_address,
            source=request.source or "dashboard"
        )

        if not signup:
            return {
                "success": False,
                "error": "Failed to register signup"
            }

        count = await get_signup_count()

        return {
            "success": True,
            "is_new": True,
            "is_early_adopter": signup["is_early_adopter"],
            "signup_number": signup["signup_number"],
            "cid": signup.get("cid"),  # Filecoin CID for reference
            "message": "Welcome to the beta!" if signup["is_early_adopter"] else "Thanks for signing up!",
            "count": count,
            "total": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat(),
            "percentage": min(100, round((count / BETA_TOTAL_SPOTS) * 100, 1)),
            "spotsRemaining": max(0, BETA_TOTAL_SPOTS - count)
        }

    except Exception as e:
        logger.error(f"Error registering beta signup: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/stats/signups/list")
async def list_beta_signups():
    """
    List all beta signups (admin endpoint).
    In production, this should be protected with authentication.

    DATA IS FETCHED FROM FILECOIN/PINATA - accessible from anywhere!

    Returns list of all signups with emails for outreach.
    """
    try:
        signups = await load_signups_from_pinata()
        early_adopters = [s for s in signups if s.get("is_early_adopter", False)]

        return {
            "success": True,
            "total_signups": len(signups),
            "early_adopters_count": len(early_adopters),
            "signups": signups,
            "lastUpdated": datetime.utcnow().isoformat(),
            "storage": "filecoin/pinata"  # Indicates where data is stored
        }

    except Exception as e:
        logger.error(f"Error listing signups: {e}")
        return {
            "success": False,
            "error": str(e)
        }


@router.get("/stats/platform")
async def get_platform_stats():
    """
    Get overall platform statistics.

    Returns aggregated statistics about the platform usage.
    This endpoint is PUBLIC for marketing purposes.
    """
    try:
        signup_count = await get_signup_count()

        return {
            "totalUsers": signup_count,
            "totalIntegrations": 0,  # Placeholder - will be implemented
            "totalAIQueries": 0,  # Placeholder - will be implemented
            "betaSpotsRemaining": max(0, BETA_TOTAL_SPOTS - signup_count),
            "lastUpdated": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching platform stats: {e}")
        return {
            "totalUsers": 0,
            "totalIntegrations": 0,
            "totalAIQueries": 0,
            "betaSpotsRemaining": BETA_TOTAL_SPOTS,
            "lastUpdated": datetime.utcnow().isoformat()
        }
