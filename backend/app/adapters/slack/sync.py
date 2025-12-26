"""
Slack Sync Adapter
Inherits from BaseDataAdapter for consistent data pipeline handling.

Fetches workspace data from Slack API:
- Channels (public + private)
- Messages (from channels)
- Users (workspace members)
- Files (shared files)

Only "files" are indexed in RAG for AI queries.
"""
import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.adapters.base_adapter import BaseDataAdapter

logger = logging.getLogger(__name__)


class SlackSync(BaseDataAdapter):
    """
    Sync adapter for Slack integration.

    Inherits from BaseDataAdapter which handles:
    - Wallet normalization
    - Encryption
    - Pinata storage
    - Chunking
    """

    # Integration identifier
    INTEGRATION_NAME = "slack"

    # Only files go to RAG - messages/channels/users are not indexed
    RAG_ENABLED_TYPES = ["files"]

    def __init__(self, credentials: dict):
        """
        Initialize Slack adapter.

        Args:
            credentials: OAuth credentials with access_token (bot token)
        """
        super().__init__(credentials)
        self.api_base = "https://slack.com/api"

    # ==================== REQUIRED IMPLEMENTATIONS ====================

    def get_data_types(self) -> List[str]:
        """Get available data types for Slack"""
        return ["channels", "messages", "users", "files"]

    async def fetch_data(self, data_type: str, **kwargs) -> Dict[str, Any]:
        """
        Fetch data from Slack API.

        Args:
            data_type: Type of data to fetch
            **kwargs: Additional options (limit, etc.)

        Returns:
            Raw data from Slack API
        """
        limit = kwargs.get("limit", 100)
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json; charset=utf-8"
        }

        all_records = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                if data_type == "channels":
                    all_records = await self._fetch_channels(client, headers, limit)

                elif data_type == "messages":
                    all_records = await self._fetch_messages(client, headers, limit)

                elif data_type == "users":
                    all_records = await self._fetch_users(client, headers, limit)

                elif data_type == "files":
                    all_records = await self._fetch_files(client, headers, limit)

                else:
                    raise ValueError(f"Unsupported data type: {data_type}")

                logger.info(f"Fetched {len(all_records)} {data_type} from Slack")

                return {
                    "records": all_records,
                    "total_count": len(all_records)
                }

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to fetch {data_type}: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to fetch {data_type}: {e}")
                raise

    def transform_data(
        self,
        data_type: str,
        raw_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Transform Slack data to common schema.

        Args:
            data_type: Type of data being transformed
            raw_data: Raw data from fetch_data()

        Returns:
            List of transformed records
        """
        records = raw_data.get("records", [])
        transformed = []

        for record in records:
            if data_type == "channels":
                transformed.append({
                    "id": record.get("id"),
                    "type": "channel",
                    "integration": self.INTEGRATION_NAME,
                    "name": record.get("name"),
                    "is_private": record.get("is_private", False),
                    "is_archived": record.get("is_archived", False),
                    "created": record.get("created"),
                    "created_at": self._timestamp_to_iso(record.get("created")),
                    "creator": record.get("creator"),
                    "num_members": record.get("num_members", 0),
                    "topic": record.get("topic", {}).get("value"),
                    "purpose": record.get("purpose", {}).get("value")
                })

            elif data_type == "messages":
                transformed.append({
                    "id": record.get("ts"),
                    "type": "message",
                    "integration": self.INTEGRATION_NAME,
                    "channel_id": record.get("channel_id"),
                    "channel_name": record.get("channel_name"),
                    "user": record.get("user"),
                    "text": record.get("text"),
                    "timestamp": record.get("ts"),
                    "created_at": self._timestamp_to_iso(record.get("ts")),
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
                    "integration": self.INTEGRATION_NAME,
                    "name": record.get("name"),
                    "real_name": record.get("real_name"),
                    "display_name": profile.get("display_name"),
                    "email": profile.get("email"),
                    "title": profile.get("title"),
                    "is_admin": record.get("is_admin", False),
                    "is_owner": record.get("is_owner", False),
                    "status_text": profile.get("status_text"),
                    "timezone": record.get("tz"),
                    "created_at": datetime.utcnow().isoformat()
                })

            elif data_type == "files":
                transformed.append({
                    "id": record.get("id"),
                    "type": "file",
                    "integration": self.INTEGRATION_NAME,
                    "name": record.get("name"),
                    "title": record.get("title"),
                    "mimetype": record.get("mimetype"),
                    "size": record.get("size", 0),
                    "created": record.get("created"),
                    "created_at": self._timestamp_to_iso(record.get("created")),
                    "user": record.get("user"),
                    "url_private": record.get("url_private"),
                    "is_public": record.get("is_public", False)
                })

        return transformed

    # ==================== OPTIONAL OVERRIDES ====================

    def get_chunk_strategy(self, data_type: str) -> str:
        """Get chunking strategy for each data type"""
        strategies = {
            "channels": "latest",   # Channels don't change often
            "messages": "monthly",  # Messages chunked by month
            "users": "latest",      # Users as single chunk
            "files": "quarterly"    # Files chunked by quarter
        }
        return strategies.get(data_type, "latest")

    def get_date_field(self, data_type: str) -> str:
        """Get date field for chunking"""
        return "created_at"

    async def test_connection(self) -> bool:
        """Test if the Slack connection is valid"""
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.api_base}/auth.test",
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                if result.get("ok"):
                    logger.info(
                        f"Slack connection valid for team: {result.get('team')}"
                    )
                    return True
                else:
                    logger.error(f"Slack auth test failed: {result.get('error')}")
                    return False

        except Exception as e:
            logger.error(f"Slack connection test failed: {e}")
            return False

    # ==================== PRIVATE HELPERS ====================

    async def _fetch_channels(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch all channels (public + private)"""
        response = await client.get(
            f"{self.api_base}/conversations.list",
            params={"types": "public_channel,private_channel", "limit": limit},
            headers=headers
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("ok"):
            raise Exception(f"Slack API error: {result.get('error')}")

        return result.get("channels", [])

    async def _fetch_messages(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch messages from all channels"""
        # First get channels
        channels_response = await client.get(
            f"{self.api_base}/conversations.list",
            params={"types": "public_channel,private_channel", "limit": 100},
            headers=headers
        )
        channels_response.raise_for_status()
        channels_result = channels_response.json()

        if not channels_result.get("ok"):
            raise Exception(f"Slack API error: {channels_result.get('error')}")

        channels = channels_result.get("channels", [])
        all_messages = []

        # Fetch messages from each channel (limit to first 10 for MVP)
        for channel in channels[:10]:
            channel_id = channel.get("id")

            try:
                messages_response = await client.get(
                    f"{self.api_base}/conversations.history",
                    params={"channel": channel_id, "limit": min(limit, 100)},
                    headers=headers
                )
                messages_response.raise_for_status()
                messages_result = messages_response.json()

                if messages_result.get("ok"):
                    messages = messages_result.get("messages", [])
                    for msg in messages:
                        msg["channel_id"] = channel_id
                        msg["channel_name"] = channel.get("name")
                    all_messages.extend(messages)
            except Exception as e:
                logger.warning(f"Failed to fetch messages from channel {channel_id}: {e}")
                continue

        return all_messages

    async def _fetch_users(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch all workspace users with pagination"""
        all_users = []
        cursor = None

        while len(all_users) < limit:
            params = {"limit": min(100, limit - len(all_users))}
            if cursor:
                params["cursor"] = cursor

            response = await client.get(
                f"{self.api_base}/users.list",
                params=params,
                headers=headers
            )
            response.raise_for_status()
            result = response.json()

            if not result.get("ok"):
                raise Exception(f"Slack API error: {result.get('error')}")

            members = result.get("members", [])
            if not members:
                break

            all_users.extend(members)

            # Check for pagination
            cursor = result.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                break

        return all_users

    async def _fetch_files(
        self,
        client: httpx.AsyncClient,
        headers: dict,
        limit: int
    ) -> List[Dict[str, Any]]:
        """Fetch workspace files"""
        response = await client.get(
            f"{self.api_base}/files.list",
            params={"count": min(limit, 100)},
            headers=headers
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("ok"):
            raise Exception(f"Slack API error: {result.get('error')}")

        return result.get("files", [])

    def _timestamp_to_iso(self, ts: Any) -> str:
        """Convert Slack timestamp to ISO format"""
        if not ts:
            return datetime.utcnow().isoformat()

        try:
            # Slack timestamps are Unix timestamps (can be string or float)
            if isinstance(ts, str):
                ts = float(ts.split(".")[0])
            return datetime.fromtimestamp(ts).isoformat()
        except (ValueError, TypeError):
            return datetime.utcnow().isoformat()

    # ==================== ACTION METHODS ====================

    async def send_message(
        self,
        channel: str,
        text: str,
        thread_ts: Optional[str] = None,
        reply_broadcast: bool = False
    ) -> Dict[str, Any]:
        """
        Send a message to a Slack channel.

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

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.api_base}/chat.postMessage",
                    json=payload,
                    headers=headers
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
        Add a reaction emoji to a message.

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

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.api_base}/reactions.add",
                    json=payload,
                    headers=headers
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

    # ==================== LIVE API METHODS ====================

    async def get_channels(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get all channels via live Slack API.

        Args:
            limit: Maximum number of channels to fetch

        Returns:
            List of transformed channel objects
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{self.api_base}/conversations.list",
                    params={"types": "public_channel,private_channel", "limit": limit},
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    raise Exception(f"Slack API error: {result.get('error')}")

                channels = result.get("channels", [])

                # Transform to common schema
                transformed = []
                for ch in channels:
                    transformed.append({
                        "id": ch.get("id"),
                        "type": "channel",
                        "name": ch.get("name"),
                        "is_private": ch.get("is_private", False),
                        "is_archived": ch.get("is_archived", False),
                        "created": ch.get("created"),
                        "created_at": self._timestamp_to_iso(ch.get("created")),
                        "creator": ch.get("creator"),
                        "num_members": ch.get("num_members", 0),
                        "topic": ch.get("topic", {}).get("value"),
                        "purpose": ch.get("purpose", {}).get("value")
                    })

                logger.info(f"Fetched {len(transformed)} channels via live API")
                return transformed

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to get channels: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get channels: {e}")
                raise

    async def get_messages(
        self,
        channel: str,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Get messages for a specific channel via live Slack API.

        Args:
            channel: Channel ID to fetch messages from
            limit: Maximum number of messages to fetch

        Returns:
            List of transformed message objects
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{self.api_base}/conversations.history",
                    params={"channel": channel, "limit": limit},
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    raise Exception(f"Slack API error: {result.get('error')}")

                messages = result.get("messages", [])

                # Transform to common schema
                transformed = []
                for msg in messages:
                    transformed.append({
                        "id": msg.get("ts"),
                        "type": "message",
                        "channel_id": channel,
                        "user": msg.get("user"),
                        "text": msg.get("text"),
                        "timestamp": msg.get("ts"),
                        "created_at": self._timestamp_to_iso(msg.get("ts")),
                        "thread_ts": msg.get("thread_ts"),
                        "reply_count": msg.get("reply_count", 0),
                        "reactions": msg.get("reactions", []),
                        "attachments": msg.get("attachments", []),
                        "files": msg.get("files", [])
                    })

                logger.info(f"Fetched {len(transformed)} messages from channel {channel}")
                return transformed

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to get messages: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get messages: {e}")
                raise

    async def get_users(self, limit: int = 200) -> List[Dict[str, Any]]:
        """
        Get workspace users via live Slack API.

        Args:
            limit: Maximum number of users to fetch

        Returns:
            List of transformed user objects
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        all_users = []
        cursor = None

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                while len(all_users) < limit:
                    params = {"limit": min(100, limit - len(all_users))}
                    if cursor:
                        params["cursor"] = cursor

                    response = await client.get(
                        f"{self.api_base}/users.list",
                        params=params,
                        headers=headers
                    )
                    response.raise_for_status()
                    result = response.json()

                    if not result.get("ok"):
                        raise Exception(f"Slack API error: {result.get('error')}")

                    members = result.get("members", [])
                    if not members:
                        break

                    # Transform and filter out bots/deleted
                    for user in members:
                        if user.get("is_bot") or user.get("deleted"):
                            continue

                        profile = user.get("profile", {})
                        all_users.append({
                            "id": user.get("id"),
                            "type": "user",
                            "name": user.get("name"),
                            "real_name": user.get("real_name"),
                            "display_name": profile.get("display_name"),
                            "email": profile.get("email"),
                            "title": profile.get("title"),
                            "is_admin": user.get("is_admin", False),
                            "is_owner": user.get("is_owner", False),
                            "status_text": profile.get("status_text"),
                            "status_emoji": profile.get("status_emoji"),
                            "timezone": user.get("tz"),
                            "image_48": profile.get("image_48"),
                            "image_72": profile.get("image_72")
                        })

                    # Check for pagination
                    cursor = result.get("response_metadata", {}).get("next_cursor")
                    if not cursor:
                        break

                logger.info(f"Fetched {len(all_users)} users via live API")
                return all_users

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to get users: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get users: {e}")
                raise

    async def get_thread_replies(
        self,
        channel: str,
        thread_ts: str
    ) -> List[Dict[str, Any]]:
        """
        Get replies in a Slack thread via conversations.replies API.

        Args:
            channel: Channel ID containing the thread
            thread_ts: Parent message timestamp

        Returns:
            List of message objects in the thread (including parent)
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(
                    f"{self.api_base}/conversations.replies",
                    params={"channel": channel, "ts": thread_ts},
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()

                if not result.get("ok"):
                    raise Exception(f"Slack API error: {result.get('error')}")

                messages = result.get("messages", [])
                logger.info(f"Fetched {len(messages)} thread replies for {thread_ts}")
                return messages

            except httpx.HTTPStatusError as e:
                logger.error(f"Slack API error: {e.response.text}")
                raise Exception(f"Failed to get thread replies: {e.response.text}")
            except Exception as e:
                logger.error(f"Failed to get thread replies: {e}")
                raise
