"""
Real-Time Transaction Tracking Service
Monitors financial transactions across QuickBooks and Stripe in real-time
Implements event-driven architecture with webhooks
"""
import logging
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime, timedelta
from collections import deque
from decimal import Decimal

logger = logging.getLogger(__name__)


class TransactionTrackingService:
    """Real-time transaction monitoring and alerting"""

    def __init__(self):
        """Initialize transaction tracking service"""
        # In-memory cache for recent transactions (last 1000)
        self.recent_transactions = deque(maxlen=1000)

        # Event subscribers (for real-time notifications)
        self.subscribers: List[Callable] = []

        # Transaction statistics
        self.stats = {
            "total_tracked": 0,
            "total_volume": Decimal(0),
            "failed_count": 0,
            "refund_count": 0
        }

        # Alert thresholds
        self.alert_thresholds = {
            "high_value_transaction": Decimal(10000),  # $10,000
            "failed_payment_threshold": 3,  # Alert after 3 failures
            "anomaly_z_score": 3.0  # 3 standard deviations
        }

    async def track_transaction(
        self,
        transaction: Dict[str, Any],
        source: str = "unknown"
    ) -> Dict[str, Any]:
        """
        Track a new transaction in real-time

        Args:
            transaction: Transaction data
            source: Source system (stripe, quickbooks, etc.)

        Returns:
            Tracking result with alerts
        """
        # Enrich transaction with metadata
        enriched_transaction = {
            **transaction,
            "tracked_at": datetime.utcnow().isoformat(),
            "source": source,
            "tracking_id": self._generate_tracking_id()
        }

        # Add to recent transactions cache
        self.recent_transactions.append(enriched_transaction)

        # Update statistics
        self._update_statistics(enriched_transaction)

        # Check for alerts
        alerts = await self._check_alerts(enriched_transaction)

        # Notify subscribers
        if alerts:
            await self._notify_subscribers(enriched_transaction, alerts)

        logger.info(
            f"Tracked transaction {enriched_transaction['tracking_id']} "
            f"from {source}: ${transaction.get('amount', 0)}"
        )

        return {
            "tracking_id": enriched_transaction["tracking_id"],
            "status": "tracked",
            "alerts": alerts,
            "transaction": enriched_transaction
        }

    async def get_recent_transactions(
        self,
        limit: int = 100,
        source: Optional[str] = None,
        transaction_type: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Get recent transactions with optional filtering

        Args:
            limit: Maximum number of transactions to return
            source: Filter by source (stripe, quickbooks)
            transaction_type: Filter by type (payment, invoice, etc.)

        Returns:
            List of recent transactions
        """
        transactions = list(self.recent_transactions)

        # Apply filters
        if source:
            transactions = [t for t in transactions if t.get("source") == source]

        if transaction_type:
            transactions = [t for t in transactions if t.get("type") == transaction_type]

        # Return most recent first
        return list(reversed(transactions))[:limit]

    async def get_real_time_statistics(self) -> Dict[str, Any]:
        """
        Get real-time transaction statistics

        Returns:
            Current statistics and metrics
        """
        # Calculate moving averages
        recent_amounts = [
            Decimal(str(t.get("amount", 0)))
            for t in self.recent_transactions
            if t.get("status") in ["succeeded", "paid"]
        ]

        avg_transaction = (
            sum(recent_amounts) / len(recent_amounts)
            if recent_amounts
            else Decimal(0)
        )

        # Calculate hourly rate
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_hour = [
            t for t in self.recent_transactions
            if datetime.fromisoformat(t.get("tracked_at", "").replace("Z", "+00:00")) > one_hour_ago
        ]

        return {
            "total_tracked": self.stats["total_tracked"],
            "total_volume": float(self.stats["total_volume"]),
            "failed_count": self.stats["failed_count"],
            "refund_count": self.stats["refund_count"],
            "avg_transaction_value": float(avg_transaction),
            "recent_transaction_count": len(self.recent_transactions),
            "hourly_rate": len(recent_hour),
            "success_rate": self._calculate_success_rate(),
            "last_updated": datetime.utcnow().isoformat()
        }

    async def monitor_transaction_velocity(
        self,
        time_window_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Monitor transaction velocity (rate of transactions)
        Useful for detecting unusual activity patterns

        Args:
            time_window_minutes: Time window for velocity calculation

        Returns:
            Velocity metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(minutes=time_window_minutes)

        recent = [
            t for t in self.recent_transactions
            if datetime.fromisoformat(t.get("tracked_at", "").replace("Z", "+00:00")) > cutoff_time
        ]

        velocity = len(recent) / time_window_minutes  # transactions per minute

        # Calculate value velocity
        value_velocity = sum(
            Decimal(str(t.get("amount", 0)))
            for t in recent
            if t.get("status") in ["succeeded", "paid"]
        ) / time_window_minutes  # dollars per minute

        # Determine if velocity is unusual
        is_unusual = velocity > 10  # More than 10 tx/min is unusual

        return {
            "time_window_minutes": time_window_minutes,
            "transaction_count": len(recent),
            "velocity_tpm": float(velocity),  # transactions per minute
            "value_velocity_dpm": float(value_velocity),  # dollars per minute
            "is_unusual": is_unusual,
            "measured_at": datetime.utcnow().isoformat()
        }

    async def track_failed_payments(
        self,
        customer_id: str,
        time_window_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Track failed payments for a specific customer
        Useful for fraud detection and customer support

        Args:
            customer_id: Customer identifier
            time_window_hours: Time window to check

        Returns:
            Failed payment metrics
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=time_window_hours)

        failed_payments = [
            t for t in self.recent_transactions
            if (
                t.get("customer_id") == customer_id
                and t.get("status") in ["failed", "payment_failed"]
                and datetime.fromisoformat(t.get("tracked_at", "").replace("Z", "+00:00")) > cutoff_time
            )
        ]

        # Check if threshold exceeded
        threshold_exceeded = len(failed_payments) >= self.alert_thresholds["failed_payment_threshold"]

        return {
            "customer_id": customer_id,
            "failed_payment_count": len(failed_payments),
            "time_window_hours": time_window_hours,
            "threshold_exceeded": threshold_exceeded,
            "failed_payments": failed_payments,
            "total_failed_amount": float(sum(
                Decimal(str(t.get("amount", 0)))
                for t in failed_payments
            ))
        }

    async def subscribe_to_events(
        self,
        callback: Callable[[Dict[str, Any], List[str]], None]
    ) -> None:
        """
        Subscribe to real-time transaction events

        Args:
            callback: Async function to call when events occur
        """
        self.subscribers.append(callback)
        logger.info(f"Added event subscriber: {callback.__name__}")

    async def unsubscribe_from_events(
        self,
        callback: Callable
    ) -> None:
        """
        Unsubscribe from transaction events

        Args:
            callback: Callback function to remove
        """
        if callback in self.subscribers:
            self.subscribers.remove(callback)
            logger.info(f"Removed event subscriber: {callback.__name__}")

    async def generate_transaction_timeline(
        self,
        customer_id: Optional[str] = None,
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """
        Generate chronological transaction timeline

        Args:
            customer_id: Optional customer filter
            hours: Number of hours to include

        Returns:
            Timeline of transactions
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        transactions = [
            t for t in self.recent_transactions
            if datetime.fromisoformat(t.get("tracked_at", "").replace("Z", "+00:00")) > cutoff_time
        ]

        if customer_id:
            transactions = [
                t for t in transactions
                if t.get("customer_id") == customer_id
            ]

        # Sort chronologically
        timeline = sorted(
            transactions,
            key=lambda t: t.get("tracked_at", ""),
            reverse=True
        )

        return timeline

    # Private helper methods

    def _update_statistics(self, transaction: Dict[str, Any]) -> None:
        """Update running statistics"""
        self.stats["total_tracked"] += 1

        amount = Decimal(str(transaction.get("amount", 0)))
        if transaction.get("status") in ["succeeded", "paid"]:
            self.stats["total_volume"] += amount

        if transaction.get("status") in ["failed", "payment_failed"]:
            self.stats["failed_count"] += 1

        if transaction.get("type") == "refund" or "refund" in transaction.get("status", ""):
            self.stats["refund_count"] += 1

    async def _check_alerts(
        self,
        transaction: Dict[str, Any]
    ) -> List[str]:
        """Check if transaction triggers any alerts"""
        alerts = []

        # High value transaction alert
        amount = Decimal(str(transaction.get("amount", 0)))
        if amount >= self.alert_thresholds["high_value_transaction"]:
            alerts.append(f"high_value_transaction: ${amount}")

        # Failed payment alert
        if transaction.get("status") in ["failed", "payment_failed"]:
            customer_id = transaction.get("customer_id")
            if customer_id:
                recent_failures = await self.track_failed_payments(
                    customer_id,
                    time_window_hours=24
                )
                if recent_failures["threshold_exceeded"]:
                    alerts.append(
                        f"multiple_failures: {recent_failures['failed_payment_count']} "
                        f"failures for customer {customer_id}"
                    )

        # Refund alert
        if transaction.get("type") == "refund" or "refund" in transaction.get("status", ""):
            alerts.append(f"refund: ${amount}")

        # Anomaly detection (simple version)
        if len(self.recent_transactions) >= 100:
            recent_amounts = [
                Decimal(str(t.get("amount", 0)))
                for t in list(self.recent_transactions)[-100:]
            ]
            mean = sum(recent_amounts) / len(recent_amounts)
            variance = sum((x - mean) ** 2 for x in recent_amounts) / len(recent_amounts)
            std_dev = variance ** Decimal("0.5")

            if std_dev > 0:
                z_score = abs(amount - mean) / std_dev
                if z_score > self.alert_thresholds["anomaly_z_score"]:
                    alerts.append(f"anomaly: z-score {float(z_score):.2f}")

        return alerts

    async def _notify_subscribers(
        self,
        transaction: Dict[str, Any],
        alerts: List[str]
    ) -> None:
        """Notify all subscribers of transaction event"""
        for subscriber in self.subscribers:
            try:
                # Call subscriber asynchronously
                if asyncio.iscoroutinefunction(subscriber):
                    await subscriber(transaction, alerts)
                else:
                    subscriber(transaction, alerts)
            except Exception as e:
                logger.error(f"Error notifying subscriber {subscriber.__name__}: {e}")

    def _generate_tracking_id(self) -> str:
        """Generate unique tracking ID"""
        import uuid
        return f"trk_{uuid.uuid4().hex[:12]}"

    def _calculate_success_rate(self) -> float:
        """Calculate overall success rate"""
        if self.stats["total_tracked"] == 0:
            return 100.0

        successful = self.stats["total_tracked"] - self.stats["failed_count"]
        return (successful / self.stats["total_tracked"]) * 100


# Singleton instance
transaction_tracking_service = TransactionTrackingService()
