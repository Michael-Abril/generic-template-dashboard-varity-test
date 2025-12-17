"""
Slack Sync Adapter
Fetches workspace data from Slack API with multi-tenant Filecoin storage
"""
import httpx
import time
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class SlackSync:
    """Sync adapter for Slack integration with multi-tenant encrypted storage"""

    def __init__(self, credentials: dict):
        """
        Initialize Slack sync adapter

        Args:
            credentials: OAuth credentials with access_token (bot token)
        """
        self.access_token = credentials.get("access_token")
        self.api_base = "https://slack.com/api"

        if not self.access_token:
            raise ValueError("Missing Slack access token")

        # Initialize storage services
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

    def get_data_types(self) -> List[str]:
        """Get available data types for Slack"""
        return ["channels", "messages", "users", "files"]

    async def fetch_data(self, data_type: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Fetch data from Slack API

        Args:
            data_type: Type of data to fetch
            limit: Maximum records to fetch

        Returns:
            List of records from Slack
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json; charset=utf-8"
        }

        all_records = []

        async with httpx.AsyncClient() as client:
            try:
                if data_type == "channels":
                    # Fetch all public channels
                    response = await client.get(
                        f"{self.api_base}/conversations.list",
                        params={"types": "public_channel,private_channel", "limit": limit},
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()

                    if not result.get("ok"):
                        raise Exception(f"Slack API error: {result.get('error')}")

                    all_records = result.get("channels", [])

                elif data_type == "messages":
                    # Fetch messages from all channels
                    channels_response = await client.get(
                        f"{self.api_base}/conversations.list",
                        params={"types": "public_channel,private_channel", "limit": 100},
                        headers=headers,
                        timeout=30.0
                    )
                    channels_response.raise_for_status()
                    channels_result = channels_response.json()

                    if not channels_result.get("ok"):
                        raise Exception(f"Slack API error: {channels_result.get('error')}")

                    channels = channels_result.get("channels", [])

                    # Fetch messages from each channel
                    for channel in channels[:10]:  # Limit to first 10 channels for MVP
                        channel_id = channel.get("id")

                        try:
                            messages_response = await client.get(
                                f"{self.api_base}/conversations.history",
                                params={"channel": channel_id, "limit": min(limit, 100)},
                                headers=headers,
                                timeout=30.0
                            )
                            messages_response.raise_for_status()
                            messages_result = messages_response.json()

                            if messages_result.get("ok"):
                                messages = messages_result.get("messages", [])
                                for msg in messages:
                                    msg["channel_id"] = channel_id
                                    msg["channel_name"] = channel.get("name")
                                all_records.extend(messages)
                        except Exception as e:
                            logger.warning(f"Failed to fetch messages from channel {channel_id}: {e}")
                            continue

                elif data_type == "users":
                    # Fetch all workspace users
                    cursor = None
                    while len(all_records) < limit:
                        params = {"limit": min(100, limit - len(all_records))}
                        if cursor:
                            params["cursor"] = cursor

                        response = await client.get(
                            f"{self.api_base}/users.list",
                            params=params,
                            headers=headers,
                            timeout=30.0
                        )
                        response.raise_for_status()
                        result = response.json()

                        if not result.get("ok"):
                            raise Exception(f"Slack API error: {result.get('error')}")

                        members = result.get("members", [])
                        if not members:
                            break

                        all_records.extend(members)

                        # Check for pagination
                        cursor = result.get("response_metadata", {}).get("next_cursor")
                        if not cursor:
                            break

                elif data_type == "files":
                    # Fetch workspace files
                    response = await client.get(
                        f"{self.api_base}/files.list",
                        params={"count": min(limit, 100)},
                        headers=headers,
                        timeout=30.0
                    )
                    response.raise_for_status()
                    result = response.json()

                    if not result.get("ok"):
                        raise Exception(f"Slack API error: {result.get('error')}")

                    all_records = result.get("files", [])

                logger.info(f"Fetched {len(all_records)} {data_type} from Slack")
                return all_records

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
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
        Transform Slack data to common schema

        Args:
            data_type: Type of data
            records: Raw records from Slack

        Returns:
            Transformed records with common schema
        """
        transformed = []

        for record in records:
            if data_type == "channels":
                transformed.append({
                    "id": record.get("id"),
                    "type": "channel",
                    "name": record.get("name"),
                    "is_private": record.get("is_private", False),
                    "is_archived": record.get("is_archived", False),
                    "created": record.get("created"),
                    "creator": record.get("creator"),
                    "num_members": record.get("num_members", 0),
                    "topic": record.get("topic", {}).get("value"),
                    "purpose": record.get("purpose", {}).get("value")
                })

            elif data_type == "messages":
                transformed.append({
                    "id": record.get("ts"),
                    "type": "message",
                    "channel_id": record.get("channel_id"),
                    "channel_name": record.get("channel_name"),
                    "user": record.get("user"),
                    "text": record.get("text"),
                    "timestamp": record.get("ts"),
                    "thread_ts": record.get("thread_ts"),
                    "reply_count": record.get("reply_count", 0),
                    "attachments": record.get("attachments", [])
                })

            elif data_type == "users":
                # Skip bots and deleted users
                if record.get("is_bot") or record.get("deleted"):
                    continue

                profile = record.get("profile", {})
                transformed.append({
                    "id": record.get("id"),
                    "type": "user",
                    "name": record.get("name"),
                    "real_name": record.get("real_name"),
                    "display_name": profile.get("display_name"),
                    "email": profile.get("email"),
                    "title": profile.get("title"),
                    "is_admin": record.get("is_admin", False),
                    "is_owner": record.get("is_owner", False),
                    "status_text": profile.get("status_text"),
                    "timezone": record.get("tz")
                })

            elif data_type == "files":
                transformed.append({
                    "id": record.get("id"),
                    "type": "file",
                    "name": record.get("name"),
                    "title": record.get("title"),
                    "mimetype": record.get("mimetype"),
                    "size": record.get("size", 0),
                    "created": record.get("created"),
                    "user": record.get("user"),
                    "url_private": record.get("url_private"),
                    "is_public": record.get("is_public", False)
                })

        return transformed

    async def sync_data(
        self,
        business_wallet: str,
        data_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Sync all Slack data with multi-tenant Filecoin storage

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
            "integration": "slack",
            "synced_at": datetime.utcnow().isoformat(),
            "data": {}
        }

        for data_type in data_types:
            try:
                # 1. Fetch data from Slack
                raw_data = await self.fetch_data(data_type)

                # 2. Transform to common schema
                transformed_data = self.transform_data(data_type, raw_data)

                # 3. Prepare data package
                data_package = {
                    "data_type": data_type,
                    "integration": "slack",
                    "records": transformed_data,
                    "record_count": len(transformed_data),
                    "synced_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "source": "slack_api",
                        "version": "v1"
                    }
                }

                # 4. Encrypt with Lit Protocol (business wallet as key)
                encrypted_data = await self.encryption.encrypt_for_customer(
                    data=data_package,
                    customer_wallet=business_wallet,
                    additional_metadata={
                        "integration": "slack",
                        "data_type": data_type
                    }
                )

                # 5. Upload to Filecoin (multi-tenant namespace)
                cid = await self.filecoin.upload_encrypted_data(
                    customer_wallet=business_wallet,
                    integration="slack",
                    data_type=data_type,
                    encrypted_data=encrypted_data,
                    metadata={
                        "integration": "slack",
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

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
        reply_broadcast: bool = False
    ) -> Dict[str, Any]:
        """
        Send a message to a Slack channel

        Args:
            channel: Channel ID to send message to
            text: Message text
            thread_ts: Optional thread timestamp to reply in thread
            reply_broadcast: If replying in thread, also send to channel

        Returns:
            Message response from Slack API
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "channel": channel,
            "text": text
        }

        if thread_ts:
            payload["thread_ts"] = thread_ts
            if reply_broadcast:
                payload["reply_broadcast"] = True

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_base}/chat.postMessage",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    raise Exception(f"Slack API error: {result.get('error')}")

                logger.info(f"Sent message to channel {channel}")
                return result

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to send message: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                raise

    async def add_reaction(
        self,
        channel: str,
        timestamp: str,
        emoji: str
    ) -> Dict[str, Any]:
        """
        Add a reaction emoji to a message

        Args:
            channel: Channel ID containing the message
            timestamp: Message timestamp
            emoji: Emoji name (without colons)

        Returns:
            Reaction response from Slack API
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        payload = {
            "channel": channel,
            "timestamp": timestamp,
            "name": emoji
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.api_base}/reactions.add",
                    json=payload,
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    # If already reacted, that's okay
                    if result.get("error") == "already_reacted":
                        return {"ok": True, "already_reacted": True}
                    raise Exception(f"Slack API error: {result.get('error')}")

                logger.info(f"Added reaction {emoji} to message {timestamp}")
                return result

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to add reaction: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to add reaction: {e}")
                raise

    async def get_thread_replies(
        self,
        channel: str,
        thread_ts: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get replies in a message thread

        Args:
            channel: Channel ID
            thread_ts: Thread timestamp (parent message)
            limit: Maximum number of replies to fetch

        Returns:
            List of thread reply messages
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.api_base}/conversations.replies",
                    params={
                        "channel": channel,
                        "ts": thread_ts,
                        "limit": limit
                    },
                    headers=headers,
                    timeout=30.0
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    raise Exception(f"Slack API error: {result.get('error')}")

                messages = result.get("messages", [])
                logger.info(f"Retrieved {len(messages)} thread replies")
                return messages

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to get thread replies: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get thread replies: {e}")
                raise
