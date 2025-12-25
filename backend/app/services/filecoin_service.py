"""
Varity Filecoin/IPFS Storage Service
Uses Pinata API for decentralized storage on Filecoin/IPFS

Multi-Tenant Architecture:
- Each business gets isolated namespace: customer-{wallet}-{integration}-{timestamp}
- All data encrypted with Lit Protocol before storage
- Business A cannot access Business B's data (enforced by wallet-based access control)
"""
import json
import httpx
import time
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging

from ..core.config import settings, NamespaceConfig
from .encryption_service import normalize_wallet_address

logger = logging.getLogger(__name__)


class FilecoinService:
    """
    Service for storing and retrieving encrypted data on Filecoin/IPFS via Pinata
    """

    def __init__(self):
        self.api_url = settings.pinata_api_url
        self.gateway_url = settings.pinata_gateway_url
        self.headers = self._build_headers()

    def _build_headers(self) -> Dict[str, str]:
        """Build authentication headers for Pinata API"""
        headers = {
            "Content-Type": "application/json"
        }

        # Use JWT if available, otherwise use API key/secret
        if settings.pinata_jwt:
            headers["Authorization"] = f"Bearer {settings.pinata_jwt}"
        else:
            headers["pinata_api_key"] = settings.pinata_api_key
            headers["pinata_secret_api_key"] = settings.pinata_secret_key

        return headers

    async def upload_encrypted_data(
        self,
        customer_wallet: str,
        integration: str,
        data_type: str,
        encrypted_data: dict,
        metadata: Optional[dict] = None,
        chunk_id: Optional[str] = None,
        chunk_type: Optional[str] = None,
        is_latest: bool = True,
        record_count: Optional[int] = None
    ) -> str:
        """
        Upload encrypted data to Filecoin/IPFS via Pinata with chunking support

        Args:
            customer_wallet: Customer's wallet address
            integration: Integration name (e.g., 'google-workspace')
            data_type: Type of data (e.g., 'gmail', 'calendar')
            encrypted_data: Encrypted data payload
            metadata: Optional metadata for Pinata pinning
            chunk_id: Chunk identifier (e.g., '2025-01', '2024-Q4', 'latest')
            chunk_type: Chunking strategy ('monthly', 'quarterly', 'yearly', 'latest')
            is_latest: Whether this is the latest chunk for this data type
            record_count: Number of records in this chunk

        Returns:
            CID (Content Identifier) of the uploaded file
        """
        # CRITICAL: Use normalize_wallet_address for consistent storage/querying
        # This ensures data can be found when querying with the same wallet
        normalized_wallet = normalize_wallet_address(customer_wallet)

        # Generate timestamp
        timestamp = datetime.utcnow().isoformat()

        # Build namespace with chunk_id if provided
        if chunk_id:
            namespace = f"customer-{normalized_wallet}/{integration}/{data_type}/{chunk_id}.json.enc"
        else:
            namespace = NamespaceConfig.build_namespace(
                normalized_wallet,
                integration,
                data_type,
                timestamp
            )

        # Prepare pinning data with minimal metadata (Pinata has 10 key limit)
        # Essential keys only: wallet, integration, data_type, timestamp + chunk info
        # Removed: "encrypted" (always true), "layer" (always customer-data)
        pin_data = {
            "pinataContent": encrypted_data,
            "pinataMetadata": {
                "name": namespace,
                "keyvalues": {
                    "customer_wallet": normalized_wallet,
                    "integration": integration,
                    "data_type": data_type,
                    "timestamp": timestamp
                }
            }
        }

        # Add chunk metadata if provided
        if chunk_id:
            pin_data["pinataMetadata"]["keyvalues"]["chunk_id"] = chunk_id
        if chunk_type:
            pin_data["pinataMetadata"]["keyvalues"]["chunk_type"] = chunk_type
        if is_latest is not None:
            pin_data["pinataMetadata"]["keyvalues"]["is_latest"] = "true" if is_latest else "false"
        if record_count is not None:
            pin_data["pinataMetadata"]["keyvalues"]["record_count"] = str(record_count)

        # Add custom metadata if provided (max 10 keys total in Pinata)
        if metadata:
            current_count = len(pin_data["pinataMetadata"]["keyvalues"])
            max_custom = 10 - current_count
            if len(metadata) > max_custom:
                logger.warning(f"Custom metadata truncated: {len(metadata)} keys > {max_custom} available")
                metadata = dict(list(metadata.items())[:max_custom])
            pin_data["pinataMetadata"]["keyvalues"].update(metadata)

        # Pin to IPFS via Pinata
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_url}/pinning/pinJSONToIPFS",
                    json=pin_data,
                    headers=self.headers,
                    timeout=60.0  # Increased timeout for large chunks
                )
                response.raise_for_status()

                result = response.json()
                cid = result["IpfsHash"]

                logger.info(
                    f"Successfully uploaded to Filecoin/IPFS: "
                    f"CID={cid}, namespace={namespace}, "
                    f"chunk_id={chunk_id}, records={record_count}"
                )

                return cid

            except httpx.HTTPStatusError as e:
                logger.error(f"Pinata API error: {e.response.text}")
                raise Exception(f"Failed to upload to Filecoin/IPFS: {e.response.text}")
            except Exception as e:
                logger.error(f"Upload error: {str(e)}")
                raise

    async def upload_encrypted_file(
        self,
        customer_wallet: str,
        integration: str,
        data_type: str,
        file_content: bytes,
        filename: str,
        metadata: Optional[dict] = None
    ) -> str:
        """
        Upload encrypted file to Filecoin/IPFS via Pinata

        Args:
            customer_wallet: Customer's wallet address
            integration: Integration name
            data_type: Type of data
            file_content: Encrypted file bytes
            filename: Original filename
            metadata: Optional metadata

        Returns:
            CID of the uploaded file
        """
        # CRITICAL: Use normalize_wallet_address for consistent storage/querying
        normalized_wallet = normalize_wallet_address(customer_wallet)

        # Generate namespace
        timestamp = datetime.utcnow().isoformat()
        namespace = NamespaceConfig.build_namespace(
            normalized_wallet,
            integration,
            data_type,
            timestamp
        )

        # Prepare file upload
        files = {
            "file": (filename, file_content)
        }

        # Prepare metadata
        pin_metadata = {
            "name": namespace,
            "keyvalues": {
                "customer_wallet": normalized_wallet,
                "integration": integration,
                "data_type": data_type,
                "timestamp": timestamp,
                "encrypted": "true",
                "layer": "customer-data",
                "original_filename": filename
            }
        }

        if metadata:
            pin_metadata["keyvalues"].update(metadata)

        # Build form data with headers that exclude Content-Type (let httpx set it)
        headers_without_content_type = {
            k: v for k, v in self.headers.items() if k != "Content-Type"
        }

        data = {
            "pinataMetadata": json.dumps(pin_metadata)
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_url}/pinning/pinFileToIPFS",
                    files=files,
                    data=data,
                    headers=headers_without_content_type,
                    timeout=60.0
                )
                response.raise_for_status()

                result = response.json()
                cid = result["IpfsHash"]

                logger.info(
                    f"Successfully uploaded file to Filecoin/IPFS: "
                    f"CID={cid}, filename={filename}"
                )

                return cid

            except httpx.HTTPStatusError as e:
                logger.error(f"Pinata file upload error: {e.response.text}")
                raise Exception(f"Failed to upload file to Filecoin/IPFS: {e.response.text}")
            except Exception as e:
                logger.error(f"File upload error: {str(e)}")
                raise

    async def retrieve_data(self, cid: str) -> dict:
        """
        Retrieve data from Filecoin/IPFS by CID

        Args:
            cid: Content Identifier

        Returns:
            Retrieved data (still encrypted)
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.gateway_url}/ipfs/{cid}",
                    timeout=30.0
                )
                response.raise_for_status()

                data = response.json()
                logger.info(f"Successfully retrieved data from IPFS: CID={cid}")
                return data

            except httpx.HTTPStatusError as e:
                logger.error(f"IPFS retrieval error: {e.response.text}")
                raise Exception(f"Failed to retrieve from IPFS: {e.response.text}")
            except Exception as e:
                logger.error(f"Retrieval error: {str(e)}")
                raise

    async def retrieve_file(self, cid: str) -> bytes:
        """
        Retrieve file from Filecoin/IPFS by CID

        Args:
            cid: Content Identifier

        Returns:
            File bytes (still encrypted)
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.gateway_url}/ipfs/{cid}",
                    timeout=60.0
                )
                response.raise_for_status()

                logger.info(f"Successfully retrieved file from IPFS: CID={cid}")
                return response.content

            except httpx.HTTPStatusError as e:
                logger.error(f"IPFS file retrieval error: {e.response.text}")
                raise Exception(f"Failed to retrieve file from IPFS: {e.response.text}")
            except Exception as e:
                logger.error(f"File retrieval error: {str(e)}")
                raise

    async def list_customer_files(
        self,
        customer_wallet: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        List all files for a customer

        Args:
            customer_wallet: Customer's wallet address
            integration: Optional filter by integration
            data_type: Optional filter by data type
            limit: Maximum number of results

        Returns:
            List of file metadata
        """
        # CRITICAL: Normalize wallet address for consistent querying
        # Data is stored with normalized wallet, so we must query with normalized wallet
        normalized_wallet = normalize_wallet_address(customer_wallet)

        logger.info(
            f"Pinata query: wallet={normalized_wallet}, "
            f"integration={integration}, data_type={data_type}"
        )

        # Build query filters using Pinata's object format
        # Pinata requires: {"value": "yourValue", "op": "eq"}
        filters = {
            "status": "pinned",
            "metadata[keyvalues][customer_wallet]": json.dumps({"value": normalized_wallet, "op": "eq"})
        }

        if integration:
            filters["metadata[keyvalues][integration]"] = json.dumps({"value": integration, "op": "eq"})

        if data_type:
            filters["metadata[keyvalues][data_type]"] = json.dumps({"value": data_type, "op": "eq"})

        logger.debug(f"Pinata query filters: {filters}")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/data/pinList",
                    params={"pageLimit": limit, **filters},
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()

                result = response.json()
                files = []

                for pin in result.get("rows", []):
                    file_info = {
                        "cid": pin["ipfs_pin_hash"],
                        "name": pin["metadata"].get("name"),
                        "size": pin["size"],
                        "timestamp": pin["date_pinned"],
                        "metadata": pin["metadata"].get("keyvalues", {})
                    }
                    files.append(file_info)

                logger.info(
                    f"Pinata returned {len(files)} files for wallet={normalized_wallet}, "
                    f"integration={integration}, data_type={data_type}"
                )

                # Log warning if no files found - helps debug pipeline issues
                if len(files) == 0:
                    logger.warning(
                        f"No files found in Pinata for wallet={normalized_wallet}, "
                        f"integration={integration}. This may indicate a sync issue."
                    )

                return files

            except httpx.HTTPStatusError as e:
                logger.error(
                    f"Pinata list error: {e.response.text}, "
                    f"wallet={normalized_wallet}, integration={integration}"
                )
                raise Exception(f"Failed to list files: {e.response.text}")
            except Exception as e:
                logger.error(f"Pinata list error: {str(e)}, wallet={normalized_wallet}")
                raise

    async def unpin_file(self, cid: str) -> bool:
        """
        Unpin a file from Pinata (delete from IPFS)

        Args:
            cid: Content Identifier to unpin

        Returns:
            True if successful
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.delete(
                    f"{self.api_url}/pinning/unpin/{cid}",
                    headers=self.headers,
                    timeout=30.0
                )
                response.raise_for_status()

                logger.info(f"Successfully unpinned CID={cid}")
                return True

            except httpx.HTTPStatusError as e:
                logger.error(f"Pinata unpin error: {e.response.text}")
                raise Exception(f"Failed to unpin file: {e.response.text}")
            except Exception as e:
                logger.error(f"Unpin error: {str(e)}")
                raise

    async def test_connection(self) -> bool:
        """
        Test connection to Pinata API

        Returns:
            True if connection is successful
        """
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_url}/data/testAuthentication",
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()

                logger.info("Pinata API connection test successful")
                return True

            except Exception as e:
                logger.error(f"Pinata connection test failed: {str(e)}")
                return False

    async def test_pinning_permission(self) -> bool:
        """
        Test if Pinata API key has pinning permissions

        Returns:
            True if key has necessary scopes
        """
        async with httpx.AsyncClient() as client:
            try:
                # Try to pin a small test object
                test_data = {
                    "pinataContent": {"test": "permissions_check"},
                    "pinataMetadata": {"name": "varity-permissions-test"}
                }

                response = await client.post(
                    f"{self.api_url}/pinning/pinJSONToIPFS",
                    json=test_data,
                    headers=self.headers,
                    timeout=10.0
                )

                if response.status_code == 200:
                    # Successfully pinned, unpin the test file
                    result = response.json()
                    test_cid = result.get("IpfsHash")
                    if test_cid:
                        await self.unpin_file(test_cid)
                    logger.info("✅ Pinata API has pinning permissions")
                    return True
                elif response.status_code == 403:
                    error_data = response.json()
                    if "NO_SCOPES_FOUND" in str(error_data):
                        logger.error(
                            "❌ Pinata API key missing required scopes. "
                            "Required scopes: pinFileToIPFS, pinJSONToIPFS, pinList, unpin"
                        )
                    return False
                else:
                    logger.error(f"Pinata pinning test failed: {response.status_code} - {response.text}")
                    return False

            except Exception as e:
                logger.error(f"Pinata pinning permission test failed: {str(e)}")
                return False


class FilecoinMultiTenantService(FilecoinService):
    """
    Multi-tenant extension of FilecoinService with business isolation

    Ensures:
    - Each business has unique namespaces
    - Data queries are wallet-scoped
    - No cross-business data leakage
    """

    def generate_namespace(
        self,
        business_wallet: str,
        integration: str,
        data_type: str = "data"
    ) -> str:
        """
        Generate business-specific namespace with timestamp

        Format: customer-{wallet}-{integration}-{data_type}-{timestamp}

        Args:
            business_wallet: Business wallet address (lowercase)
            integration: Integration name (e.g., 'google-workspace')
            data_type: Type of data (e.g., 'emails', 'invoices', 'documents')

        Returns:
            Unique namespace string
        """
        timestamp = int(time.time())
        wallet_short = business_wallet.lower()[:10]  # First 10 chars for readability
        return f"customer-{wallet_short}-{integration}-{data_type}-{timestamp}"

    async def upload_business_data(
        self,
        business_wallet: str,
        integration: str,
        data_type: str,
        data: dict,
        encrypted_data: bytes
    ) -> str:
        """
        Upload encrypted business data to Filecoin with strict wallet isolation

        Args:
            business_wallet: Business wallet address
            integration: Integration name
            data_type: Type of data being stored
            data: Original data (for metadata only, not stored)
            encrypted_data: Lit Protocol encrypted data

        Returns:
            IPFS CID of uploaded data
        """
        namespace = self.generate_namespace(business_wallet, integration, data_type)

        # Prepare encrypted payload
        encrypted_payload = {
            "encrypted": encrypted_data.hex(),
            "wallet": business_wallet.lower(),
            "integration": integration,
            "data_type": data_type,
            "encrypted_at": datetime.utcnow().isoformat()
        }

        # Upload with business-specific metadata
        metadata = {
            "business_wallet": business_wallet.lower(),
            "integration": integration,
            "data_type": data_type,
            "layer": "customer-data",
            "multi_tenant": "true"
        }

        cid = await self.upload_encrypted_data(
            customer_wallet=business_wallet,
            integration=integration,
            data_type=data_type,
            encrypted_data=encrypted_payload,
            metadata=metadata
        )

        logger.info(
            f"Multi-tenant upload successful: "
            f"wallet={business_wallet[:10]}..., integration={integration}, CID={cid}"
        )

        return cid

    async def query_business_data(
        self,
        business_wallet: str,
        integration: Optional[str] = None,
        data_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query data for ONLY this specific business (wallet-scoped)

        This ensures Business A cannot access Business B's data

        Args:
            business_wallet: Business wallet address (used as filter)
            integration: Optional integration filter
            data_type: Optional data type filter

        Returns:
            List of CIDs and metadata for this business only
        """
        files = await self.list_customer_files(
            customer_wallet=business_wallet,
            integration=integration,
            data_type=data_type
        )

        logger.info(
            f"Multi-tenant query: Found {len(files)} files for "
            f"wallet={business_wallet[:10]}..."
        )

        return files

    async def retrieve_business_data(
        self,
        business_wallet: str,
        cid: str
    ) -> Optional[dict]:
        """
        Retrieve data from Filecoin and verify it belongs to requesting business

        Args:
            business_wallet: Business wallet requesting data
            cid: Content Identifier

        Returns:
            Decrypted data if wallet has access, None if unauthorized
        """
        try:
            # Retrieve from IPFS
            data = await self.retrieve_data(cid)

            # Verify wallet ownership
            stored_wallet = data.get("wallet", "").lower()
            requesting_wallet = business_wallet.lower()

            if stored_wallet != requesting_wallet:
                logger.warning(
                    f"Unauthorized access attempt: "
                    f"Wallet {requesting_wallet[:10]}... tried to access "
                    f"data owned by {stored_wallet[:10]}..."
                )
                return None

            logger.info(
                f"Authorized retrieval: wallet={requesting_wallet[:10]}..., CID={cid}"
            )

            return data

        except Exception as e:
            logger.error(f"Retrieval error for wallet {business_wallet}: {str(e)}")
            raise
