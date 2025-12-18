"""
Monday.com Sync Adapter
Fetches project data from Monday.com GraphQL API with multi-tenant Filecoin storage
"""
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class MondaySync:
    """Sync adapter for Monday.com integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Monday.com sync adapter

        Args:
            credentials: OAuth credentials with access_token
        """
        self.access_token = credentials.get("access_token")
        self.api_url = "https://api.monday.com/v2"

        if not self.access_token:
            raise ValueError("Missing Monday.com access token")

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Monday.com"""
        return ["boards", "items", "updates", "users"]

    async def fetch_data(self, data_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch data from Monday.com GraphQL API

        Args:
            data_type: Type of data to fetch
            limit: Maximum records to fetch

        Returns:
            List of records from Monday.com
        """
        headers = {
            "Authorization": self.access_token,
            "Content-Type": "application/json"
        }

        all_records = []

        async with httpx.AsyncClient() as client:
            try:
                if data_type == "boards":
                    # GraphQL query for boards
                    query = """
                    query {
                        boards(limit: %d) {
                            id
                            name
                            description
                            state
                            board_kind
                            items_count
                            columns {
                                id
                                title
                                type
                            }
                            owners {
                                id
                                name
                                email
                            }
                            created_at
                            updated_at
                        }
                    }
                    """ % limit

                    response = await client.post(
                        self.api_url,
                        json={"query": query},
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()

                    if "errors" in result:
                        raise Exception(f"Monday.com API error: {result['errors']}")

                    all_records = result.get("data", {}).get("boards", [])

                elif data_type == "items":
                    # First, get all boards
                    boards_query = """
                    query {
                        boards(limit: 50) {
                            id
                            name
                        }
                    }
                    """

                    boards_response = await client.post(
                        self.api_url,
                        json={"query": boards_query},
                        headers=headers,
                        timeout=30.0
                    )
                    boards_response.raise_for_status()
                    boards_result = boards_response.json()

                    if "errors" in boards_result:
                        raise Exception(f"Monday.com API error: {boards_result['errors']}")

                    boards = boards_result.get("data", {}).get("boards", [])

                    # Fetch items from each board
                    for board in boards[:10]:  # Limit to first 10 boards for MVP
                        board_id = board.get("id")

                        items_query = """
                        query {
                            boards(ids: [%s]) {
                                items_page(limit: %d) {
                                    items {
                                        id
                                        name
                                        state
                                        created_at
                                        updated_at
                                        column_values {
                                            id
                                            text
                                            value
                                        }
                                        creator {
                                            id
                                            name
                                            email
                                        }
                                    }
                                }
                            }
                        }
                        """ % (board_id, min(limit, 100))

                        try:
                            items_response = await client.post(
                                self.api_url,
                                json={"query": items_query},
                                headers=headers,
                                timeout=30.0
                            )
                            items_response.raise_for_status()
                            items_result = items_response.json()

                            if "errors" not in items_result:
                                boards_data = items_result.get("data", {}).get("boards", [])
                                if boards_data:
                                    items = boards_data[0].get("items_page", {}).get("items", [])
                                    for item in items:
                                        item["board_id"] = board_id
                                        item["board_name"] = board.get("name")
                                    all_records.extend(items)
                        except Exception as e:
                            logger.warning(f"Failed to fetch items from board {board_id}: {e}")
                            continue

                elif data_type == "updates":
                    # Fetch updates (activity log)
                    query = """
                    query {
                        boards(limit: 10) {
                            id
                            name
                            updates(limit: %d) {
                                id
                                body
                                created_at
                                creator {
                                    id
                                    name
                                    email
                                }
                                item_id
                            }
                        }
                    }
                    """ % limit

                    response = await client.post(
                        self.api_url,
                        json={"query": query},
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()

                    if "errors" in result:
                        raise Exception(f"Monday.com API error: {result['errors']}")

                    boards = result.get("data", {}).get("boards", [])
                    for board in boards:
                        updates = board.get("updates", [])
                        for update in updates:
                            update["board_id"] = board.get("id")
                            update["board_name"] = board.get("name")
                        all_records.extend(updates)

                elif data_type == "users":
                    # GraphQL query for users
                    query = """
                    query {
                        users(limit: %d) {
                            id
                            name
                            email
                            title
                            account {
                                name
                            }
                            teams {
                                id
                                name
                            }
                            created_at
                            is_admin
                            is_guest
                        }
                    }
                    """ % limit

                    response = await client.post(
                        self.api_url,
                        json={"query": query},
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()

                    if "errors" in result:
                        raise Exception(f"Monday.com API error: {result['errors']}")

                    all_records = result.get("data", {}).get("users", [])

                logger.info(f"Fetched {len(all_records)} {data_type} from Monday.com")
                return all_records

            except httpx.HTTPStatusError as e:
                logger.error(f"Monday.com API error: {e.response.text}")
                raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to fetch {data_type}: {e}")
                raise

    def transform_data(
        self,
        data_type: str,
        records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Transform Monday.com data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Monday.com

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "boards":
                transformed.append({
                    "id": record.get("id"),
                    "type": "board",
                    "name": record.get("name"),
                    "description": record.get("description"),
                    "state": record.get("state"),
                    "kind": record.get("board_kind"),
                    "items_count": record.get("items_count", 0),
                    "columns": record.get("columns", []),
                    "owners": record.get("owners", []),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at")
                })

            elif data_type == "items":
                transformed.append({
                    "id": record.get("id"),
                    "type": "item",
                    "board_id": record.get("board_id"),
                    "board_name": record.get("board_name"),
                    "name": record.get("name"),
                    "state": record.get("state"),
                    "created_at": record.get("created_at"),
                    "updated_at": record.get("updated_at"),
                    "column_values": record.get("column_values", []),
                    "creator": record.get("creator", {})
                })

            elif data_type == "updates":
                transformed.append({
                    "id": record.get("id"),
                    "type": "update",
                    "board_id": record.get("board_id"),
                    "board_name": record.get("board_name"),
                    "item_id": record.get("item_id"),
                    "body": record.get("body"),
                    "created_at": record.get("created_at"),
                    "creator": record.get("creator", {})
                })

            elif data_type == "users":
                transformed.append({
                    "id": record.get("id"),
                    "type": "user",
                    "name": record.get("name"),
                    "email": record.get("email"),
                    "title": record.get("title"),
                    "account_name": record.get("account", {}).get("name"),
                    "teams": record.get("teams", []),
                    "created_at": record.get("created_at"),
                    "is_admin": record.get("is_admin", False),
                    "is_guest": record.get("is_guest", False)
                })

        return transformed

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Monday.com data with multi-tenant Filecoin storage

        Args:
            business_wallet: Business wallet address (for encryption key)
            data_types: Optional list of specific data types to sync

        Returns:
            Sync results with CIDs for each data type
        """
        if data_types is None:
            data_types = self.get_data_types()

        results = {
            "business_wallet": business_wallet,
            "integration": "monday",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Monday.com
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "monday",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "monday_graphql_api",
                        "version": "v2"
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "monday",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="monday",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "monday",
                        "data_type": data_type,
                        "record_count": len(transformed_data),
                        "storage_layer": "customer-data"
                    }
                )

                results["data"][data_type] = {
                    "cid": cid,
                    "record_count": len(transformed_data),
                    "status": "success"
                }

                logger.info(
                    f"Synced {len(transformed_data)} {data_type} records to Filecoin, "
                    f"CID: {cid}, wallet: {business_wallet}"
                )

            except Exception as e:
                logger.error(f"Failed to sync {data_type}: {e}")
                results["data"][data_type] = {
                    "status": "failed",
                    "error": str(e)
                }

        return results
