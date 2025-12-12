"""
Audit Logging Service

Comprehensive audit trail for sensitive operations including:
- Data uploads/downloads
- Integration configurations
- Wallet authentication events
- Admin actions
- Security events

Implements structured logging with:
- Timestamp
- Actor (wallet address or IP)
- Action type
- Resource affected
- Success/failure status
- Metadata
"""
import logging
import json
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum
from pathlib import Path
import asyncio
from collections import deque

logger = logging.getLogger(__name__)


class AuditEventType(Enum):
    """Types of auditable events"""
    # Authentication events
    AUTH_SUCCESS = "auth.success"
    AUTH_FAILURE = "auth.failure"
    AUTH_SIGNATURE_INVALID = "auth.signature_invalid"
    AUTH_TIMESTAMP_EXPIRED = "auth.timestamp_expired"

    # Data access events
    DATA_UPLOAD = "data.upload"
    DATA_DOWNLOAD = "data.download"
    DATA_DELETE = "data.delete"
    DATA_LIST = "data.list"

    # Integration events
    INTEGRATION_CONNECT = "integration.connect"
    INTEGRATION_SYNC = "integration.sync"
    INTEGRATION_DISCONNECT = "integration.disconnect"
    INTEGRATION_CONFIG_UPDATE = "integration.config.update"

    # Marketplace events
    LICENSE_PURCHASE = "marketplace.license.purchase"
    LICENSE_REVOKE = "marketplace.license.revoke"
    TOOL_LIST = "marketplace.tool.list"

    # Security events
    RATE_LIMIT_EXCEEDED = "security.rate_limit_exceeded"
    INVALID_SIGNATURE = "security.invalid_signature"
    UNAUTHORIZED_ACCESS = "security.unauthorized_access"

    # Admin events
    ADMIN_CONFIG_CHANGE = "admin.config.change"
    ADMIN_USER_MODIFY = "admin.user.modify"


class AuditService:
    """Service for comprehensive audit logging"""

    def __init__(self, log_file: Optional[str] = None):
        """
        Initialize audit service

        Args:
            log_file: Optional path to audit log file (defaults to logs/audit.log)
        """
        self.log_file = Path(log_file or "logs/audit.log")
        self.log_file.parent.mkdir(parents=True, exist_ok=True)

        # In-memory buffer for recent events (last 1000)
        self.recent_events = deque(maxlen=1000)

        # Configure audit logger
        self.audit_logger = logging.getLogger("audit")
        self.audit_logger.setLevel(logging.INFO)

        # File handler for persistent storage
        file_handler = logging.FileHandler(self.log_file)
        file_handler.setLevel(logging.INFO)
        file_handler.setFormatter(
            logging.Formatter('%(message)s')  # JSON format, no extra formatting
        )
        self.audit_logger.addHandler(file_handler)

        # Prevent propagation to root logger
        self.audit_logger.propagate = False

        logger.info(f"Audit service initialized with log file: {self.log_file}")

    async def log_event(
        self,
        event_type: AuditEventType,
        actor: str,
        resource: Optional[str] = None,
        action: Optional[str] = None,
        success: bool = True,
        metadata: Optional[Dict[str, Any]] = None,
        error: Optional[str] = None
    ) -> None:
        """
        Log an audit event

        Args:
            event_type: Type of event from AuditEventType enum
            actor: Who performed the action (wallet address or IP)
            resource: What resource was affected (optional)
            action: Description of the action (optional)
            success: Whether the action succeeded
            metadata: Additional context (optional)
            error: Error message if failed (optional)
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "actor": actor,
            "resource": resource,
            "action": action,
            "success": success,
            "metadata": metadata or {},
            "error": error
        }

        # Add to in-memory buffer
        self.recent_events.append(event)

        # Write to audit log
        self.audit_logger.info(json.dumps(event))

        # Log critical security events to main logger
        if not success and event_type.value.startswith("security."):
            logger.warning(
                f"SECURITY EVENT: {event_type.value} - Actor: {actor}, "
                f"Resource: {resource}, Error: {error}"
            )

    async def log_auth_success(self, wallet: str, endpoint: str):
        """Log successful authentication"""
        await self.log_event(
            event_type=AuditEventType.AUTH_SUCCESS,
            actor=wallet,
            resource=endpoint,
            action="Wallet signature verified",
            metadata={"endpoint": endpoint}
        )

    async def log_auth_failure(
        self,
        wallet_or_ip: str,
        endpoint: str,
        reason: str
    ):
        """Log authentication failure"""
        await self.log_event(
            event_type=AuditEventType.AUTH_FAILURE,
            actor=wallet_or_ip,
            resource=endpoint,
            action="Authentication failed",
            success=False,
            error=reason,
            metadata={"endpoint": endpoint, "reason": reason}
        )

    async def log_data_upload(
        self,
        wallet: str,
        integration: str,
        data_type: str,
        cid: str,
        size_bytes: Optional[int] = None
    ):
        """Log data upload event"""
        await self.log_event(
            event_type=AuditEventType.DATA_UPLOAD,
            actor=wallet,
            resource=cid,
            action=f"Uploaded {integration}/{data_type} data",
            metadata={
                "integration": integration,
                "data_type": data_type,
                "cid": cid,
                "size_bytes": size_bytes
            }
        )

    async def log_data_download(
        self,
        wallet: str,
        cid: str,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Log data download event"""
        await self.log_event(
            event_type=AuditEventType.DATA_DOWNLOAD,
            actor=wallet,
            resource=cid,
            action="Retrieved encrypted data",
            success=success,
            error=error,
            metadata={"cid": cid}
        )

    async def log_data_delete(
        self,
        wallet: str,
        cid: str,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Log data deletion event"""
        await self.log_event(
            event_type=AuditEventType.DATA_DELETE,
            actor=wallet,
            resource=cid,
            action="Deleted/unpinned data",
            success=success,
            error=error,
            metadata={"cid": cid}
        )

    async def log_integration_sync(
        self,
        wallet: str,
        integration: str,
        data_types: list,
        record_count: int,
        success: bool = True,
        error: Optional[str] = None
    ):
        """Log integration sync event"""
        await self.log_event(
            event_type=AuditEventType.INTEGRATION_SYNC,
            actor=wallet,
            resource=integration,
            action=f"Synced {integration} data",
            success=success,
            error=error,
            metadata={
                "integration": integration,
                "data_types": data_types,
                "record_count": record_count
            }
        )

    async def log_license_purchase(
        self,
        wallet: str,
        tool_id: int,
        duration_months: int,
        total_cost: float,
        transaction_hash: Optional[str] = None
    ):
        """Log license purchase event"""
        await self.log_event(
            event_type=AuditEventType.LICENSE_PURCHASE,
            actor=wallet,
            resource=f"tool_{tool_id}",
            action=f"Purchased {duration_months}-month license",
            metadata={
                "tool_id": tool_id,
                "duration_months": duration_months,
                "total_cost": total_cost,
                "transaction_hash": transaction_hash
            }
        )

    async def log_rate_limit_exceeded(
        self,
        identifier: str,
        endpoint: str,
        rate_limit: int
    ):
        """Log rate limit exceeded event"""
        await self.log_event(
            event_type=AuditEventType.RATE_LIMIT_EXCEEDED,
            actor=identifier,
            resource=endpoint,
            action="Rate limit exceeded",
            success=False,
            metadata={
                "endpoint": endpoint,
                "rate_limit": rate_limit
            }
        )

    async def log_invalid_signature(
        self,
        wallet: str,
        endpoint: str,
        reason: str
    ):
        """Log invalid signature attempt"""
        await self.log_event(
            event_type=AuditEventType.INVALID_SIGNATURE,
            actor=wallet,
            resource=endpoint,
            action="Invalid signature detected",
            success=False,
            error=reason,
            metadata={"endpoint": endpoint}
        )

    def get_recent_events(self, limit: int = 100) -> list:
        """
        Get recent audit events from memory buffer

        Args:
            limit: Maximum number of events to return

        Returns:
            List of recent audit events
        """
        return list(self.recent_events)[-limit:]

    def get_events_for_actor(
        self,
        actor: str,
        limit: int = 100
    ) -> list:
        """
        Get recent events for a specific actor

        Args:
            actor: Wallet address or IP to filter by
            limit: Maximum number of events to return

        Returns:
            List of events filtered by actor
        """
        return [
            event for event in self.recent_events
            if event["actor"] == actor
        ][-limit:]

    def get_security_events(self, limit: int = 100) -> list:
        """
        Get recent security-related events

        Args:
            limit: Maximum number of events to return

        Returns:
            List of security events
        """
        return [
            event for event in self.recent_events
            if event["event_type"].startswith("security.")
        ][-limit:]

    async def query_audit_log(
        self,
        event_type: Optional[AuditEventType] = None,
        actor: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        success: Optional[bool] = None,
        limit: int = 1000
    ) -> list:
        """
        Query audit log with filters

        Args:
            event_type: Filter by event type
            actor: Filter by actor
            start_time: Filter by start time
            end_time: Filter by end time
            success: Filter by success status
            limit: Maximum number of results

        Returns:
            List of matching audit events
        """
        # For production: implement database query
        # For now: filter in-memory events
        results = list(self.recent_events)

        if event_type:
            results = [e for e in results if e["event_type"] == event_type.value]

        if actor:
            results = [e for e in results if e["actor"] == actor]

        if success is not None:
            results = [e for e in results if e["success"] == success]

        if start_time:
            start_iso = start_time.isoformat()
            results = [e for e in results if e["timestamp"] >= start_iso]

        if end_time:
            end_iso = end_time.isoformat()
            results = [e for e in results if e["timestamp"] <= end_iso]

        return results[-limit:]


# Global audit service instance
audit_service = AuditService()
