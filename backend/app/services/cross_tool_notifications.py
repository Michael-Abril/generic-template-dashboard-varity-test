"""
Cross-Tool Notifications Service
Implements intelligent notification routing across productivity tools
Based on 2025 best practices: granular permissions, notification fatigue reduction, workflow integration
"""
import asyncio
import hashlib
import hmac
import json
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Dict, Any, Optional, Set
from datetime import datetime, timedelta
from enum import Enum
import logging

import aiohttp
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


class NotificationChannel(str, Enum):
    """Notification delivery channels"""

    SLACK = "slack"
    EMAIL = "email"
    DASHBOARD = "dashboard"
    MOBILE_PUSH = "mobile_push"
    WEBHOOK = "webhook"


class NotificationPriority(str, Enum):
    """Notification priority levels"""

    CRITICAL = "critical"  # Always deliver immediately
    HIGH = "high"  # Deliver within 5 minutes
    NORMAL = "normal"  # Deliver within 1 hour (batched)
    LOW = "low"  # Daily digest only


class NotificationCategory(str, Enum):
    """Notification categories for filtering"""

    MENTION = "mention"  # @mentions in any tool
    ASSIGNMENT = "assignment"  # Task/issue assignments
    DEADLINE = "deadline"  # Due dates and deadlines
    APPROVAL = "approval"  # Approval requests
    STATUS_CHANGE = "status_change"  # Status updates
    COMMENT = "comment"  # Comments and replies
    COLLABORATION = "collaboration"  # Shared documents, invites
    SYSTEM = "system"  # System notifications


class CrossToolNotifications:
    """
    Cross-tool notifications service implementing 2025 best practices:
    - Granular permission controls
    - Notification fatigue reduction
    - Customizable notification schemes
    - Workflow-based routing
    """

    def __init__(self):
        # User notification preferences (would be stored in database)
        self.user_preferences: Dict[str, Dict] = {}

        # Notification batching queue
        self.notification_queue: Dict[str, List[Dict]] = {}

        # Rate limiting tracking
        self.rate_limits: Dict[str, Dict] = {}

    async def send_notification(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send cross-tool notification with intelligent routing

        Args:
            user_id: User identifier
            notification: Notification data

        Returns:
            Delivery status
        """
        # Get user preferences
        preferences = await self._get_user_preferences(user_id)

        # Check if notification should be sent based on preferences
        if not self._should_send(notification, preferences):
            logger.info(f"Notification filtered out for user {user_id} based on preferences")
            return {"status": "filtered", "reason": "user_preferences"}

        # Determine priority
        priority = self._determine_priority(notification, preferences)

        # Route based on priority
        if priority == NotificationPriority.CRITICAL:
            # Send immediately across all channels
            return await self._send_immediate(user_id, notification, preferences)
        elif priority == NotificationPriority.HIGH:
            # Send within 5 minutes
            return await self._send_high_priority(user_id, notification, preferences)
        elif priority == NotificationPriority.NORMAL:
            # Batch for hourly delivery
            return await self._batch_notification(user_id, notification, preferences)
        else:
            # Add to daily digest
            return await self._add_to_digest(user_id, notification)

    async def _get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        Get user notification preferences

        Returns:
            User preferences dictionary
        """
        if user_id in self.user_preferences:
            return self.user_preferences[user_id]

        # Default preferences based on 2025 best practices
        return {
            "channels": {
                NotificationChannel.SLACK: True,
                NotificationChannel.EMAIL: False,  # Reduce email clutter
                NotificationChannel.DASHBOARD: True,
                NotificationChannel.MOBILE_PUSH: True,
                NotificationChannel.WEBHOOK: False,
            },
            "categories": {
                # Only notify for critical categories by default
                NotificationCategory.MENTION: True,
                NotificationCategory.ASSIGNMENT: True,
                NotificationCategory.DEADLINE: True,
                NotificationCategory.APPROVAL: True,
                NotificationCategory.STATUS_CHANGE: False,  # Too noisy
                NotificationCategory.COMMENT: False,  # Too noisy
                NotificationCategory.COLLABORATION: True,
                NotificationCategory.SYSTEM: False,
            },
            "priority_override": {
                # User can override priorities for specific integrations
                "jira": {
                    "assigned_to_me": NotificationPriority.HIGH,
                    "status_change": NotificationPriority.NORMAL,
                    "comment": NotificationPriority.LOW,
                },
                "slack": {
                    "direct_message": NotificationPriority.HIGH,
                    "mention": NotificationPriority.HIGH,
                    "channel_message": NotificationPriority.LOW,
                },
                "asana": {
                    "assigned_to_me": NotificationPriority.HIGH,
                    "due_today": NotificationPriority.CRITICAL,
                    "due_soon": NotificationPriority.HIGH,
                },
            },
            "quiet_hours": {
                "enabled": True,
                "start": "22:00",  # 10 PM
                "end": "08:00",  # 8 AM
                "timezone": "UTC",
                "critical_only": True,  # Only critical notifications during quiet hours
            },
            "batching": {
                "enabled": True,
                "interval_minutes": 60,  # Batch normal priority notifications hourly
                "max_batch_size": 10,
            },
            "digest": {
                "enabled": True,
                "frequency": "daily",  # daily, weekly
                "time": "09:00",
                "categories": [NotificationCategory.STATUS_CHANGE, NotificationCategory.COMMENT],
            },
        }

    def _should_send(self, notification: Dict[str, Any], preferences: Dict[str, Any]) -> bool:
        """
        Check if notification should be sent based on user preferences

        Args:
            notification: Notification data
            preferences: User preferences

        Returns:
            True if notification should be sent
        """
        # Check category filter
        category = notification.get("category")
        if category and not preferences.get("categories", {}).get(category, False):
            return False

        # Check integration-specific filters
        integration = notification.get("integration")
        if integration and integration in preferences.get("muted_integrations", []):
            return False

        # Check quiet hours
        if self._is_quiet_hours(preferences):
            priority = notification.get("priority", NotificationPriority.NORMAL)
            if priority != NotificationPriority.CRITICAL:
                return False

        return True

    def _is_quiet_hours(self, preferences: Dict[str, Any]) -> bool:
        """Check if current time is within quiet hours"""
        quiet_hours = preferences.get("quiet_hours", {})
        if not quiet_hours.get("enabled", False):
            return False

        # TODO: Implement actual timezone-aware quiet hours check
        return False

    def _determine_priority(
        self, notification: Dict[str, Any], preferences: Dict[str, Any]
    ) -> NotificationPriority:
        """
        Determine notification priority based on content and user preferences

        Args:
            notification: Notification data
            preferences: User preferences

        Returns:
            NotificationPriority
        """
        # Check for explicit priority
        explicit_priority = notification.get("priority")
        if explicit_priority:
            return explicit_priority

        # Check for user-defined priority overrides
        integration = notification.get("integration")
        event_type = notification.get("event_type")

        if integration in preferences.get("priority_override", {}):
            override = preferences["priority_override"][integration].get(event_type)
            if override:
                return override

        # Determine priority based on category
        category = notification.get("category")

        if category == NotificationCategory.MENTION:
            return NotificationPriority.HIGH
        elif category == NotificationCategory.ASSIGNMENT:
            return NotificationPriority.HIGH
        elif category == NotificationCategory.DEADLINE:
            # Check how soon the deadline is
            due_date = notification.get("metadata", {}).get("due_date")
            if due_date:
                try:
                    due = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                    if due < datetime.utcnow():
                        return NotificationPriority.CRITICAL  # Overdue
                    elif due < datetime.utcnow() + timedelta(hours=24):
                        return NotificationPriority.HIGH  # Due within 24 hours
                except:
                    pass
            return NotificationPriority.NORMAL
        elif category == NotificationCategory.APPROVAL:
            return NotificationPriority.HIGH
        elif category in [NotificationCategory.STATUS_CHANGE, NotificationCategory.COMMENT]:
            return NotificationPriority.NORMAL
        else:
            return NotificationPriority.NORMAL

    async def _send_immediate(
        self, user_id: str, notification: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send notification immediately across all enabled channels

        Args:
            user_id: User identifier
            notification: Notification data
            preferences: User preferences

        Returns:
            Delivery status
        """
        enabled_channels = [
            channel for channel, enabled in preferences.get("channels", {}).items() if enabled
        ]

        delivery_results = {}

        # Send to all channels in parallel
        tasks = []
        for channel in enabled_channels:
            task = self._send_to_channel(user_id, notification, channel)
            tasks.append(task)

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for channel, result in zip(enabled_channels, results):
            if isinstance(result, Exception):
                delivery_results[channel] = {"status": "failed", "error": str(result)}
            else:
                delivery_results[channel] = result

        return {
            "status": "sent",
            "priority": NotificationPriority.CRITICAL,
            "channels": delivery_results,
            "timestamp": datetime.utcnow().isoformat(),
        }

    async def _send_high_priority(
        self, user_id: str, notification: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send high-priority notification (within 5 minutes)

        For MVP, send immediately. In production, could use a delayed queue.
        """
        # For now, send immediately like critical
        return await self._send_immediate(user_id, notification, preferences)

    async def _batch_notification(
        self, user_id: str, notification: Dict[str, Any], preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Add notification to batch queue for hourly delivery

        Args:
            user_id: User identifier
            notification: Notification data
            preferences: User preferences

        Returns:
            Status
        """
        if user_id not in self.notification_queue:
            self.notification_queue[user_id] = []

        self.notification_queue[user_id].append(
            {"notification": notification, "queued_at": datetime.utcnow().isoformat()}
        )

        # Check if batch should be sent
        batch_config = preferences.get("batching", {})
        if len(self.notification_queue[user_id]) >= batch_config.get("max_batch_size", 10):
            return await self._flush_batch(user_id, preferences)

        return {
            "status": "queued",
            "priority": NotificationPriority.NORMAL,
            "queue_position": len(self.notification_queue[user_id]),
        }

    async def _flush_batch(self, user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send all queued notifications for a user

        Args:
            user_id: User identifier
            preferences: User preferences

        Returns:
            Delivery status
        """
        if user_id not in self.notification_queue or not self.notification_queue[user_id]:
            return {"status": "no_notifications"}

        notifications = self.notification_queue[user_id]
        self.notification_queue[user_id] = []

        # Group by integration
        grouped = {}
        for item in notifications:
            notif = item["notification"]
            integration = notif.get("integration", "unknown")
            if integration not in grouped:
                grouped[integration] = []
            grouped[integration].append(notif)

        # Create batch notification
        batch_notification = {
            "type": "batch",
            "count": len(notifications),
            "grouped_by_integration": grouped,
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Send via preferred channel (Slack or Dashboard)
        channel = (
            NotificationChannel.SLACK
            if preferences.get("channels", {}).get(NotificationChannel.SLACK)
            else NotificationChannel.DASHBOARD
        )

        result = await self._send_to_channel(user_id, batch_notification, channel)

        return {
            "status": "sent",
            "type": "batch",
            "notification_count": len(notifications),
            "channel": channel,
            "result": result,
        }

    async def _add_to_digest(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add notification to daily digest

        Args:
            user_id: User identifier
            notification: Notification data

        Returns:
            Status
        """
        # In production, this would add to digest database
        logger.info(f"Added notification to digest for user {user_id}")

        return {"status": "added_to_digest", "priority": NotificationPriority.LOW}

    async def _send_to_channel(
        self, user_id: str, notification: Dict[str, Any], channel: NotificationChannel
    ) -> Dict[str, Any]:
        """
        Send notification to specific channel

        Args:
            user_id: User identifier
            notification: Notification data
            channel: Delivery channel

        Returns:
            Delivery result
        """
        # Rate limiting check
        if not await self._check_rate_limit(user_id, channel):
            return {"status": "rate_limited"}

        try:
            if channel == NotificationChannel.SLACK:
                return await self._send_to_slack(user_id, notification)
            elif channel == NotificationChannel.EMAIL:
                return await self._send_to_email(user_id, notification)
            elif channel == NotificationChannel.DASHBOARD:
                return await self._send_to_dashboard(user_id, notification)
            elif channel == NotificationChannel.MOBILE_PUSH:
                return await self._send_to_mobile(user_id, notification)
            elif channel == NotificationChannel.WEBHOOK:
                return await self._send_to_webhook(user_id, notification)
            else:
                return {"status": "unsupported_channel"}

        except Exception as e:
            logger.error(f"Failed to send to {channel}: {e}")
            return {"status": "failed", "error": str(e)}

    async def _check_rate_limit(self, user_id: str, channel: NotificationChannel) -> bool:
        """
        Check if sending is within rate limits

        Args:
            user_id: User identifier
            channel: Delivery channel

        Returns:
            True if within limits
        """
        # Rate limiting based on 2025 best practices
        limits = {
            NotificationChannel.SLACK: 20,  # max 20 messages per hour
            NotificationChannel.EMAIL: 5,  # max 5 emails per hour
            NotificationChannel.MOBILE_PUSH: 10,  # max 10 pushes per hour
            NotificationChannel.DASHBOARD: 100,  # max 100 per hour
            NotificationChannel.WEBHOOK: 50,  # max 50 per hour
        }

        key = f"{user_id}:{channel}"
        now = datetime.utcnow()

        if key not in self.rate_limits:
            self.rate_limits[key] = {"count": 0, "window_start": now}

        rate_limit = self.rate_limits[key]

        # Reset window if hour has passed
        if (now - rate_limit["window_start"]) > timedelta(hours=1):
            rate_limit["count"] = 0
            rate_limit["window_start"] = now

        # Check limit
        if rate_limit["count"] >= limits.get(channel, 100):
            logger.warning(f"Rate limit exceeded for {user_id} on {channel}")
            return False

        rate_limit["count"] += 1
        return True

    async def _send_to_slack(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification to Slack via webhook or Bot API.

        Supports both:
        - Webhook URL: Simple one-way notifications
        - Bot Token: Full Slack API (DMs, channels, threads)
        """
        from app.core.config import settings

        title = notification.get("title", "Notification")
        message = notification.get("message", "")
        category = notification.get("category", "")
        priority = notification.get("priority", "normal")
        integration = notification.get("integration", "")

        # Build Slack message blocks
        blocks = [
            {
                "type": "header",
                "text": {"type": "plain_text", "text": title, "emoji": True}
            }
        ]

        if message:
            blocks.append({
                "type": "section",
                "text": {"type": "mrkdwn", "text": message}
            })

        # Add context (priority, category, integration)
        context_elements = []
        if priority == "critical":
            context_elements.append({"type": "mrkdwn", "text": ":rotating_light: *CRITICAL*"})
        elif priority == "high":
            context_elements.append({"type": "mrkdwn", "text": ":warning: *High Priority*"})

        if category:
            context_elements.append({"type": "mrkdwn", "text": f"Category: {category}"})
        if integration:
            context_elements.append({"type": "mrkdwn", "text": f"From: {integration}"})

        if context_elements:
            blocks.append({"type": "context", "elements": context_elements})

        payload = {
            "text": f"{title}: {message}",  # Fallback text
            "blocks": blocks
        }

        # Try webhook first, then bot token
        if settings.slack_webhook_url:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        settings.slack_webhook_url,
                        json=payload,
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            logger.info(f"Slack notification sent to {user_id}: {title}")
                            return {"status": "sent", "channel": "slack", "method": "webhook"}
                        else:
                            error_text = await response.text()
                            logger.error(f"Slack webhook failed: {response.status} - {error_text}")
                            return {"status": "failed", "channel": "slack", "error": error_text}
            except Exception as e:
                logger.error(f"Slack webhook error: {e}")
                return {"status": "failed", "channel": "slack", "error": str(e)}

        elif settings.slack_bot_token:
            # Use Slack Web API for bot-based messaging
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        "https://slack.com/api/chat.postMessage",
                        headers={"Authorization": f"Bearer {settings.slack_bot_token}"},
                        json={
                            "channel": user_id,  # User ID or channel ID
                            "text": f"{title}: {message}",
                            "blocks": blocks
                        },
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        result = await response.json()
                        if result.get("ok"):
                            logger.info(f"Slack bot message sent to {user_id}: {title}")
                            return {"status": "sent", "channel": "slack", "method": "bot_api"}
                        else:
                            logger.error(f"Slack bot API failed: {result.get('error')}")
                            return {"status": "failed", "channel": "slack", "error": result.get("error")}
            except Exception as e:
                logger.error(f"Slack bot API error: {e}")
                return {"status": "failed", "channel": "slack", "error": str(e)}

        else:
            logger.warning("No Slack credentials configured (SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN)")
            return {"status": "skipped", "channel": "slack", "reason": "not_configured"}

    async def _send_to_email(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification via email using SMTP or email API service.

        Supports:
        - SMTP: Direct email server connection
        - SendGrid: API-based email delivery
        - Resend: Modern email API
        """
        from app.core.config import settings

        title = notification.get("title", "Notification")
        message = notification.get("message", "")
        priority = notification.get("priority", "normal")
        category = notification.get("category", "")

        # User ID should contain email address, or we need to look it up
        # For now, assume user_id is the email or wallet address
        recipient_email = notification.get("metadata", {}).get("email", user_id)

        # Validate email format
        if "@" not in recipient_email:
            logger.warning(f"Invalid email format for user {user_id}, skipping email notification")
            return {"status": "skipped", "channel": "email", "reason": "invalid_email"}

        # Build HTML email
        priority_badge = ""
        if priority == "critical":
            priority_badge = '<span style="background:#dc2626;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">CRITICAL</span>'
        elif priority == "high":
            priority_badge = '<span style="background:#f59e0b;color:white;padding:2px 8px;border-radius:4px;font-size:12px;">High Priority</span>'

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }}
                .footer {{ text-align: center; padding: 20px; color: #64748b; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin:0;font-size:24px;">{title}</h1>
                    {f'<p style="margin:8px 0 0 0;">{priority_badge}</p>' if priority_badge else ''}
                </div>
                <div class="content">
                    <p>{message}</p>
                    {f'<p style="color:#64748b;font-size:14px;">Category: {category}</p>' if category else ''}
                </div>
                <div class="footer">
                    <p>Sent from Varity Dashboard</p>
                    <p><a href="https://dashboard.varity.app">View in Dashboard</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        # Send via configured provider
        if settings.email_api_provider == "sendgrid" and settings.email_api_key:
            return await self._send_email_sendgrid(recipient_email, title, html_content, settings)
        elif settings.email_api_provider == "resend" and settings.email_api_key:
            return await self._send_email_resend(recipient_email, title, html_content, settings)
        elif settings.smtp_host:
            return await self._send_email_smtp(recipient_email, title, html_content, message, settings)
        else:
            logger.warning("No email provider configured")
            return {"status": "skipped", "channel": "email", "reason": "not_configured"}

    async def _send_email_smtp(
        self, recipient: str, subject: str, html_content: str, text_content: str, settings
    ) -> Dict[str, Any]:
        """Send email via SMTP"""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email}>"
            msg["To"] = recipient

            # Attach both plain text and HTML versions
            msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            # Send via SMTP (run in thread pool to avoid blocking)
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                self._smtp_send_sync,
                msg,
                recipient,
                settings
            )

            logger.info(f"Email sent via SMTP to {recipient}: {subject}")
            return {"status": "sent", "channel": "email", "method": "smtp"}

        except Exception as e:
            logger.error(f"SMTP email error: {e}")
            return {"status": "failed", "channel": "email", "error": str(e)}

    def _smtp_send_sync(self, msg: MIMEMultipart, recipient: str, settings) -> None:
        """Synchronous SMTP send (called in thread pool)"""
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            if settings.smtp_use_tls:
                server.starttls()
            if settings.smtp_username and settings.smtp_password:
                server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, recipient, msg.as_string())

    async def _send_email_sendgrid(
        self, recipient: str, subject: str, html_content: str, settings
    ) -> Dict[str, Any]:
        """Send email via SendGrid API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {settings.email_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "personalizations": [{"to": [{"email": recipient}]}],
                        "from": {"email": settings.smtp_from_email, "name": settings.smtp_from_name},
                        "subject": subject,
                        "content": [{"type": "text/html", "value": html_content}]
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status in (200, 202):
                        logger.info(f"Email sent via SendGrid to {recipient}: {subject}")
                        return {"status": "sent", "channel": "email", "method": "sendgrid"}
                    else:
                        error_text = await response.text()
                        logger.error(f"SendGrid error: {response.status} - {error_text}")
                        return {"status": "failed", "channel": "email", "error": error_text}
        except Exception as e:
            logger.error(f"SendGrid API error: {e}")
            return {"status": "failed", "channel": "email", "error": str(e)}

    async def _send_email_resend(
        self, recipient: str, subject: str, html_content: str, settings
    ) -> Dict[str, Any]:
        """Send email via Resend API"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {settings.email_api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "from": f"{settings.smtp_from_name} <{settings.smtp_from_email}>",
                        "to": [recipient],
                        "subject": subject,
                        "html": html_content
                    },
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"Email sent via Resend to {recipient}: {subject}")
                        return {"status": "sent", "channel": "email", "method": "resend", "id": result.get("id")}
                    else:
                        error_text = await response.text()
                        logger.error(f"Resend error: {response.status} - {error_text}")
                        return {"status": "failed", "channel": "email", "error": error_text}
        except Exception as e:
            logger.error(f"Resend API error: {e}")
            return {"status": "failed", "channel": "email", "error": str(e)}

    async def _send_to_dashboard(
        self, user_id: str, notification: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Store notification in database for in-app dashboard display.

        Creates a DashboardNotification record that can be retrieved
        via the notifications API endpoint.
        """
        from app.core.database import AsyncSessionLocal
        from app.models.user_settings import DashboardNotification

        title = notification.get("title", "Notification")
        message = notification.get("message", "")
        category = notification.get("category")
        priority = notification.get("priority", "normal")
        integration = notification.get("integration")
        metadata = notification.get("metadata", {})

        try:
            async with AsyncSessionLocal() as db:
                db_notification = DashboardNotification(
                    wallet_address=user_id,
                    title=title,
                    message=message,
                    category=category,
                    priority=priority,
                    integration=integration,
                    metadata=metadata,
                    is_read=False
                )
                db.add(db_notification)
                await db.commit()
                await db.refresh(db_notification)

                logger.info(f"Dashboard notification stored for {user_id}: {title} (ID: {db_notification.id})")
                return {
                    "status": "sent",
                    "channel": "dashboard",
                    "notification_id": db_notification.id
                }

        except Exception as e:
            logger.error(f"Dashboard notification storage error: {e}")
            return {"status": "failed", "channel": "dashboard", "error": str(e)}

    async def _send_to_mobile(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send mobile push notification via Firebase Cloud Messaging (FCM).

        Requires:
        - FCM_SERVER_KEY or FCM_PROJECT_ID environment variable
        - User's FCM device token stored in user metadata
        """
        from app.core.config import settings

        title = notification.get("title", "Notification")
        message = notification.get("message", "")
        priority = notification.get("priority", "normal")
        category = notification.get("category", "")

        # Get FCM token from notification metadata or user profile
        fcm_token = notification.get("metadata", {}).get("fcm_token")

        if not fcm_token:
            logger.debug(f"No FCM token for user {user_id}, skipping mobile push")
            return {"status": "skipped", "channel": "mobile_push", "reason": "no_device_token"}

        if not settings.fcm_server_key:
            logger.warning("FCM_SERVER_KEY not configured, skipping mobile push")
            return {"status": "skipped", "channel": "mobile_push", "reason": "not_configured"}

        # Map priority to FCM priority
        fcm_priority = "high" if priority in ("critical", "high") else "normal"

        # Build FCM payload
        payload = {
            "to": fcm_token,
            "priority": fcm_priority,
            "notification": {
                "title": title,
                "body": message,
                "sound": "default" if priority in ("critical", "high") else None,
                "badge": 1
            },
            "data": {
                "category": category,
                "priority": priority,
                "click_action": "OPEN_DASHBOARD"
            }
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://fcm.googleapis.com/fcm/send",
                    headers={
                        "Authorization": f"key={settings.fcm_server_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    result = await response.json()

                    if result.get("success", 0) > 0:
                        logger.info(f"Mobile push sent to {user_id}: {title}")
                        return {"status": "sent", "channel": "mobile_push", "message_id": result.get("results", [{}])[0].get("message_id")}
                    else:
                        error = result.get("results", [{}])[0].get("error", "Unknown error")
                        logger.error(f"FCM error for {user_id}: {error}")
                        return {"status": "failed", "channel": "mobile_push", "error": error}

        except Exception as e:
            logger.error(f"FCM API error: {e}")
            return {"status": "failed", "channel": "mobile_push", "error": str(e)}

    async def _send_to_webhook(self, user_id: str, notification: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send notification to configured webhooks with HMAC signature verification.

        Retrieves webhook configurations from database and delivers
        notifications with proper security headers.
        """
        from app.core.database import AsyncSessionLocal
        from app.models.user_settings import WebhookConfig

        title = notification.get("title", "Notification")

        try:
            async with AsyncSessionLocal() as db:
                # Get active webhooks for this user
                result = await db.execute(
                    select(WebhookConfig).where(
                        WebhookConfig.wallet_address == user_id,
                        WebhookConfig.is_active == True
                    )
                )
                webhooks = result.scalars().all()

                if not webhooks:
                    logger.debug(f"No webhooks configured for user {user_id}")
                    return {"status": "skipped", "channel": "webhook", "reason": "no_webhooks_configured"}

                # Send to all configured webhooks
                delivery_results = []
                for webhook in webhooks:
                    result = await self._deliver_webhook(webhook, notification)
                    delivery_results.append({
                        "webhook_name": webhook.name,
                        "webhook_id": webhook.id,
                        **result
                    })

                successful = sum(1 for r in delivery_results if r.get("status") == "sent")
                logger.info(f"Webhook notifications sent for {user_id}: {successful}/{len(webhooks)} successful")

                return {
                    "status": "sent" if successful > 0 else "failed",
                    "channel": "webhook",
                    "total_webhooks": len(webhooks),
                    "successful": successful,
                    "results": delivery_results
                }

        except Exception as e:
            logger.error(f"Webhook delivery error: {e}")
            return {"status": "failed", "channel": "webhook", "error": str(e)}

    async def _deliver_webhook(self, webhook, notification: Dict[str, Any]) -> Dict[str, Any]:
        """Deliver notification to a single webhook endpoint"""
        payload = {
            "event": "notification",
            "timestamp": datetime.utcnow().isoformat(),
            "data": notification
        }

        # Serialize payload
        payload_json = json.dumps(payload, default=str)

        # Build headers
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Varity-Webhook/1.0",
            "X-Varity-Event": "notification",
            "X-Varity-Timestamp": datetime.utcnow().isoformat()
        }

        # Add HMAC signature if secret is configured
        if webhook.secret:
            signature = hmac.new(
                webhook.secret.encode(),
                payload_json.encode(),
                hashlib.sha256
            ).hexdigest()
            headers["X-Varity-Signature"] = f"sha256={signature}"

        # Add custom headers from webhook config
        if webhook.headers:
            headers.update(webhook.headers)

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook.url,
                    data=payload_json,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status in (200, 201, 202, 204):
                        return {"status": "sent", "http_status": response.status}
                    else:
                        response_text = await response.text()
                        return {
                            "status": "failed",
                            "http_status": response.status,
                            "error": response_text[:200]  # Truncate long responses
                        }

        except asyncio.TimeoutError:
            return {"status": "failed", "error": "timeout"}
        except Exception as e:
            return {"status": "failed", "error": str(e)}

    async def update_user_preferences(
        self, user_id: str, preferences: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update user notification preferences

        Args:
            user_id: User identifier
            preferences: New preferences

        Returns:
            Updated preferences
        """
        # Merge with existing preferences
        current = await self._get_user_preferences(user_id)
        current.update(preferences)

        self.user_preferences[user_id] = current

        # TODO: Persist to database

        return current
