"""
Unified Activity Feed Service
Aggregates activities from all productivity integrations into a single feed
"""
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from enum import Enum
import logging

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class ActivityType(str, Enum):
    """Types of activities across all tools"""

    # Slack
    MESSAGE = "message"
    CHANNEL_CREATED = "channel_created"
    FILE_SHARED = "file_shared"

    # Asana / Monday / Trello
    TASK_CREATED = "task_created"
    TASK_UPDATED = "task_updated"
    TASK_COMPLETED = "task_completed"
    PROJECT_CREATED = "project_created"

    # Jira
    ISSUE_CREATED = "issue_created"
    ISSUE_UPDATED = "issue_updated"
    ISSUE_RESOLVED = "issue_resolved"
    SPRINT_STARTED = "sprint_started"

    # GitHub
    COMMIT = "commit"
    PULL_REQUEST = "pull_request"
    ISSUE_OPENED = "issue_opened"
    MERGE = "merge"

    # Zoom
    MEETING_SCHEDULED = "meeting_scheduled"
    MEETING_STARTED = "meeting_started"
    MEETING_ENDED = "meeting_ended"

    # Notion
    PAGE_CREATED = "page_created"
    PAGE_UPDATED = "page_updated"

    # Google Workspace / Microsoft 365
    DOCUMENT_CREATED = "document_created"
    DOCUMENT_EDITED = "document_edited"
    EMAIL_RECEIVED = "email_received"
    EVENT_CREATED = "event_created"


class ActivityPriority(str, Enum):
    """Activity priority levels"""

    CRITICAL = "critical"
    HIGH = "high"
    NORMAL = "normal"
    LOW = "low"


class UnifiedActivityFeed:
    """Unified activity feed aggregating data from all productivity tools"""

    def __init__(self):
        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

        # Activity type to integration mapping
        self.integration_mapping = {
            "slack": [ActivityType.MESSAGE, ActivityType.CHANNEL_CREATED, ActivityType.FILE_SHARED],
            "asana": [
                ActivityType.TASK_CREATED,
                ActivityType.TASK_UPDATED,
                ActivityType.TASK_COMPLETED,
                ActivityType.PROJECT_CREATED,
            ],
            "monday": [
                ActivityType.TASK_CREATED,
                ActivityType.TASK_UPDATED,
                ActivityType.TASK_COMPLETED,
                ActivityType.PROJECT_CREATED,
            ],
            "trello": [
                ActivityType.TASK_CREATED,
                ActivityType.TASK_UPDATED,
                ActivityType.TASK_COMPLETED,
                ActivityType.PROJECT_CREATED,
            ],
            "jira": [
                ActivityType.ISSUE_CREATED,
                ActivityType.ISSUE_UPDATED,
                ActivityType.ISSUE_RESOLVED,
                ActivityType.SPRINT_STARTED,
            ],
            "github": [
                ActivityType.COMMIT,
                ActivityType.PULL_REQUEST,
                ActivityType.ISSUE_OPENED,
                ActivityType.MERGE,
            ],
            "zoom": [
                ActivityType.MEETING_SCHEDULED,
                ActivityType.MEETING_STARTED,
                ActivityType.MEETING_ENDED,
            ],
            "notion": [ActivityType.PAGE_CREATED, ActivityType.PAGE_UPDATED],
            "google": [
                ActivityType.DOCUMENT_CREATED,
                ActivityType.DOCUMENT_EDITED,
                ActivityType.EMAIL_RECEIVED,
                ActivityType.EVENT_CREATED,
            ],
            "microsoft": [
                ActivityType.DOCUMENT_CREATED,
                ActivityType.DOCUMENT_EDITED,
                ActivityType.EMAIL_RECEIVED,
                ActivityType.EVENT_CREATED,
            ],
        }

    async def fetch_unified_feed(
        self,
        business_wallet: str,
        integrations: List[str],
        limit: int = 100,
        since: Optional[datetime] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch unified activity feed from multiple integrations

        Args:
            business_wallet: Business wallet address
            integrations: List of integration names to fetch from
            limit: Maximum activities to return
            since: Only fetch activities after this timestamp

        Returns:
            Unified list of activities sorted by timestamp
        """
        if since is None:
            since = datetime.utcnow() - timedelta(days=7)  # Default: last 7 days

        all_activities = []

        # Fetch activities from each integration in parallel
        tasks = []
        for integration in integrations:
            task = self._fetch_integration_activities(
                business_wallet=business_wallet, integration=integration, since=since
            )
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Combine and normalize activities
        for integration, result in zip(integrations, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to fetch activities from {integration}: {result}")
                continue

            if result:
                all_activities.extend(result)

        # Sort by timestamp (newest first)
        all_activities.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        # Apply limit
        return all_activities[:limit]

    async def _fetch_integration_activities(
        self, business_wallet: str, integration: str, since: datetime
    ) -> List[Dict[str, Any]]:
        """
        Fetch activities from a specific integration

        Args:
            business_wallet: Business wallet address
            integration: Integration name
            since: Fetch activities after this timestamp

        Returns:
            List of normalized activities
        """
        try:
            # Retrieve latest data from Filecoin
            data_cid = await self._get_latest_cid(business_wallet, integration)

            if not data_cid:
                logger.info(f"No data found for {integration}")
                return []

            # Download and decrypt data
            encrypted_data = await self.filecoin.download_data(data_cid)
            decrypted_data = await self.encryption.decrypt_for_customer(
                encrypted_data=encrypted_data, customer_wallet=business_wallet
            )

            # Extract records
            records = decrypted_data.get("records", [])

            # Normalize activities based on integration type
            normalized = await self._normalize_activities(
                integration=integration, records=records, since=since
            )

            return normalized

        except Exception as e:
            logger.error(f"Failed to fetch {integration} activities: {e}")
            return []

    async def _normalize_activities(
        self, integration: str, records: List[Dict[str, Any]], since: datetime
    ) -> List[Dict[str, Any]]:
        """
        Normalize activities from different integrations to common schema

        Args:
            integration: Integration name
            records: Raw records from integration
            since: Filter activities after this timestamp

        Returns:
            Normalized activities
        """
        normalized = []

        for record in records:
            activity = await self._normalize_single_activity(integration, record)

            if activity and self._is_after_timestamp(activity.get("timestamp"), since):
                normalized.append(activity)

        return normalized

    async def _normalize_single_activity(
        self, integration: str, record: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Normalize a single activity record

        Args:
            integration: Integration name
            record: Raw record

        Returns:
            Normalized activity or None
        """
        try:
            if integration == "slack":
                return self._normalize_slack_activity(record)
            elif integration in ["asana", "monday", "trello"]:
                return self._normalize_task_activity(integration, record)
            elif integration == "jira":
                return self._normalize_jira_activity(record)
            elif integration == "github":
                return self._normalize_github_activity(record)
            elif integration == "zoom":
                return self._normalize_zoom_activity(record)
            elif integration == "notion":
                return self._normalize_notion_activity(record)
            elif integration in ["google", "microsoft"]:
                return self._normalize_office_activity(integration, record)
            else:
                return None

        except Exception as e:
            logger.error(f"Failed to normalize {integration} activity: {e}")
            return None

    def _normalize_slack_activity(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Slack activity"""
        record_type = record.get("type")

        if record_type == "message":
            return {
                "id": record.get("id"),
                "type": ActivityType.MESSAGE,
                "integration": "slack",
                "title": f"Message in #{record.get('channel_name', 'unknown')}",
                "description": record.get("text", "")[:200],
                "user": record.get("user"),
                "timestamp": record.get("timestamp"),
                "priority": ActivityPriority.NORMAL,
                "url": None,
                "metadata": {
                    "channel_id": record.get("channel_id"),
                    "channel_name": record.get("channel_name"),
                    "thread_ts": record.get("thread_ts"),
                },
            }
        elif record_type == "channel":
            return {
                "id": record.get("id"),
                "type": ActivityType.CHANNEL_CREATED,
                "integration": "slack",
                "title": f"Channel created: #{record.get('name')}",
                "description": record.get("topic", ""),
                "user": record.get("creator"),
                "timestamp": str(record.get("created")),
                "priority": ActivityPriority.LOW,
                "url": None,
                "metadata": {
                    "channel_id": record.get("id"),
                    "is_private": record.get("is_private"),
                },
            }
        elif record_type == "file":
            return {
                "id": record.get("id"),
                "type": ActivityType.FILE_SHARED,
                "integration": "slack",
                "title": f"File shared: {record.get('name')}",
                "description": record.get("title", ""),
                "user": record.get("user"),
                "timestamp": str(record.get("created")),
                "priority": ActivityPriority.NORMAL,
                "url": record.get("url_private"),
                "metadata": {"file_type": record.get("mimetype"), "size": record.get("size")},
            }

        return None

    def _normalize_task_activity(self, integration: str, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize task management activity (Asana/Monday/Trello)"""
        # Common structure for task management tools
        return {
            "id": record.get("id"),
            "type": ActivityType.TASK_UPDATED,
            "integration": integration,
            "title": record.get("name") or record.get("title", "Task updated"),
            "description": record.get("description", "")[:200],
            "user": record.get("assignee") or record.get("creator"),
            "timestamp": record.get("modified_at") or record.get("updated_at"),
            "priority": self._determine_priority(record),
            "url": record.get("permalink_url") or record.get("url"),
            "metadata": {
                "status": record.get("status"),
                "project": record.get("project"),
                "due_date": record.get("due_on") or record.get("due_date"),
            },
        }

    def _normalize_jira_activity(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Jira activity"""
        return {
            "id": record.get("id") or record.get("key"),
            "type": ActivityType.ISSUE_UPDATED,
            "integration": "jira",
            "title": record.get("key", "") + ": " + record.get("summary", "Issue updated"),
            "description": record.get("description", "")[:200],
            "user": record.get("assignee"),
            "timestamp": record.get("updated"),
            "priority": self._map_jira_priority(record.get("priority")),
            "url": record.get("url"),
            "metadata": {
                "status": record.get("status"),
                "issue_type": record.get("issuetype"),
                "project": record.get("project"),
            },
        }

    def _normalize_github_activity(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize GitHub activity"""
        return {
            "id": record.get("id") or record.get("sha"),
            "type": ActivityType.COMMIT,
            "integration": "github",
            "title": record.get("message", "")[:100] or "GitHub activity",
            "description": record.get("message", "")[:200],
            "user": record.get("author") or record.get("user"),
            "timestamp": record.get("timestamp") or record.get("created_at"),
            "priority": ActivityPriority.NORMAL,
            "url": record.get("html_url") or record.get("url"),
            "metadata": {
                "repository": record.get("repository"),
                "branch": record.get("branch"),
                "sha": record.get("sha"),
            },
        }

    def _normalize_zoom_activity(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Zoom activity"""
        return {
            "id": record.get("id") or record.get("uuid"),
            "type": ActivityType.MEETING_SCHEDULED,
            "integration": "zoom",
            "title": record.get("topic", "Zoom meeting"),
            "description": record.get("agenda", "")[:200],
            "user": record.get("host_email"),
            "timestamp": record.get("start_time"),
            "priority": ActivityPriority.HIGH,
            "url": record.get("join_url"),
            "metadata": {
                "meeting_id": record.get("id"),
                "duration": record.get("duration"),
                "timezone": record.get("timezone"),
            },
        }

    def _normalize_notion_activity(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Notion activity"""
        return {
            "id": record.get("id"),
            "type": ActivityType.PAGE_UPDATED,
            "integration": "notion",
            "title": record.get("title", "Notion page updated"),
            "description": record.get("description", "")[:200],
            "user": record.get("created_by") or record.get("last_edited_by"),
            "timestamp": record.get("last_edited_time"),
            "priority": ActivityPriority.NORMAL,
            "url": record.get("url"),
            "metadata": {"page_id": record.get("id"), "workspace": record.get("workspace")},
        }

    def _normalize_office_activity(
        self, integration: str, record: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Normalize Google Workspace / Microsoft 365 activity"""
        return {
            "id": record.get("id"),
            "type": ActivityType.DOCUMENT_EDITED,
            "integration": integration,
            "title": record.get("name") or record.get("title", "Document updated"),
            "description": record.get("description", "")[:200],
            "user": record.get("owner") or record.get("modified_by"),
            "timestamp": record.get("modified_time") or record.get("last_modified"),
            "priority": ActivityPriority.NORMAL,
            "url": record.get("web_view_link") or record.get("url"),
            "metadata": {
                "document_type": record.get("mime_type") or record.get("file_type"),
                "size": record.get("size"),
            },
        }

    def _determine_priority(self, record: Dict[str, Any]) -> ActivityPriority:
        """Determine activity priority from record"""
        # Check for explicit priority
        priority = record.get("priority")
        if priority:
            if isinstance(priority, str):
                priority_lower = priority.lower()
                if "critical" in priority_lower or "urgent" in priority_lower:
                    return ActivityPriority.CRITICAL
                elif "high" in priority_lower:
                    return ActivityPriority.HIGH
                elif "low" in priority_lower:
                    return ActivityPriority.LOW

        # Check for due dates
        due_date = record.get("due_on") or record.get("due_date")
        if due_date:
            try:
                due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                if due < datetime.utcnow():
                    return ActivityPriority.CRITICAL
                elif due < datetime.utcnow() + timedelta(days=1):
                    return ActivityPriority.HIGH
            except:
                pass

        return ActivityPriority.NORMAL

    def _map_jira_priority(self, priority: Optional[str]) -> ActivityPriority:
        """Map Jira priority to ActivityPriority"""
        if not priority:
            return ActivityPriority.NORMAL

        priority_lower = priority.lower()
        if "critical" in priority_lower or "blocker" in priority_lower:
            return ActivityPriority.CRITICAL
        elif "high" in priority_lower:
            return ActivityPriority.HIGH
        elif "low" in priority_lower:
            return ActivityPriority.LOW
        else:
            return ActivityPriority.NORMAL

    def _is_after_timestamp(self, timestamp: Optional[str], since: datetime) -> bool:
        """Check if timestamp is after 'since' datetime"""
        if not timestamp:
            return False

        try:
            ts = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            return ts >= since
        except:
            return False

    async def _get_latest_cid(self, business_wallet: str, integration: str) -> Optional[str]:
        """
        Get the latest CID for an integration from metadata

        Args:
            business_wallet: Business wallet address
            integration: Integration name

        Returns:
            Latest CID or None
        """
        # This would query your metadata storage (database or Filecoin) for the latest CID
        # For now, return None as placeholder
        # TODO: Implement metadata storage query
        return None
