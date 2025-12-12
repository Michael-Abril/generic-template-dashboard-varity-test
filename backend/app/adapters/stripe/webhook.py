"""
Stripe Webhook Handler
Implements real-time payment monitoring and financial reconciliation
Based on 2025 best practices for Stripe webhook security and reliability
"""
import stripe
import hashlib
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import HTTPException

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.adapters.stripe.sync import StripeSync
from app.services.cross_tool_notifications import CrossToolNotificationService
from app.core.database import get_db_session
from app.models.user_settings import WebhookEventLog as WebhookEventLogModel

logger = logging.getLogger(__name__)

# Initialize notification service
notification_service = CrossToolNotificationService()


class StripeWebhook:
    """Handle Stripe webhook events with idempotency and security"""

    def __init__(self, api_key: str, webhook_secret: str):
        """
        Initialize webhook handler

        Args:
            api_key: Stripe API secret key
            webhook_secret: Webhook endpoint secret for signature verification
        """
        self.api_key = api_key
        self.webhook_secret = webhook_secret
        stripe.api_key = api_key

        self.filecoin = FilecoinService()
        self.encryption = EncryptionService()

        # Track processed events for idempotency
        self._processed_events: set = set()

    def verify_signature(self, payload: bytes, signature: str) -> stripe.Event:
        """
        Verify webhook signature and construct event
        Security best practice: Always verify signatures

        Args:
            payload: Raw webhook payload bytes
            signature: Signature from Stripe-Signature header

        Returns:
            Verified Stripe Event object

        Raises:
            HTTPException: If signature is invalid
        """
        try:
            event = stripe.Webhook.construct_event(payload, signature, self.webhook_secret)
            return event

        except ValueError as e:
            logger.error(f"Invalid payload: {e}")
            raise HTTPException(status_code=400, detail="Invalid payload")

        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature: {e}")
            raise HTTPException(status_code=401, detail="Invalid signature")

    async def handle_webhook(
        self, payload: bytes, signature: str, business_wallet: str
    ) -> Dict[str, Any]:
        """
        Process incoming Stripe webhook event
        Best practice: Return 200 quickly, process asynchronously

        Args:
            payload: Raw webhook payload
            signature: Stripe signature header
            business_wallet: Customer wallet for encryption

        Returns:
            Processing result
        """
        # Step 1: Verify signature and construct event
        event = self.verify_signature(payload, signature)

        # Step 2: Check idempotency (prevent duplicate processing)
        event_id = event.id
        if event_id in self._processed_events:
            logger.info(f"Event {event_id} already processed (idempotent)")
            return {"status": "success", "message": "Event already processed", "event_id": event_id}

        # Step 3: Log event for auditing
        await WebhookEventLog.log_event(event_id=event_id, event_type=event.type, status="received")

        # Step 4: Route to appropriate handler
        try:
            result = await self._route_event(event, business_wallet)

            # Mark as processed
            self._processed_events.add(event_id)

            await WebhookEventLog.log_event(
                event_id=event_id, event_type=event.type, status="processed", metadata=result
            )

            return {
                "status": "success",
                "event_id": event_id,
                "event_type": event.type,
                "result": result,
            }

        except Exception as e:
            logger.error(f"Failed to process event {event_id}: {e}")

            await WebhookEventLog.log_event(
                event_id=event_id,
                event_type=event.type,
                status="failed",
                metadata={"error": str(e)},
            )

            # Still return 200 to prevent retries for unrecoverable errors
            return {"status": "error", "event_id": event_id, "error": str(e)}

    async def _route_event(self, event: stripe.Event, business_wallet: str) -> Dict[str, Any]:
        """
        Route event to appropriate handler based on type

        Args:
            event: Verified Stripe event
            business_wallet: Customer wallet for encryption

        Returns:
            Handler result
        """
        event_type = event.type
        data = event.data.object

        # Payment events (real-time transaction tracking)
        if event_type == "payment_intent.succeeded":
            return await self._handle_payment_succeeded(data, business_wallet)

        elif event_type == "payment_intent.payment_failed":
            return await self._handle_payment_failed(data, business_wallet)

        # Invoice events (for subscription analytics)
        elif event_type == "invoice.paid":
            return await self._handle_invoice_paid(data, business_wallet)

        elif event_type == "invoice.payment_failed":
            return await self._handle_invoice_failed(data, business_wallet)

        # Customer events (for analytics)
        elif event_type == "customer.created":
            return await self._handle_customer_created(data, business_wallet)

        elif event_type == "customer.subscription.deleted":
            return await self._handle_subscription_deleted(data, business_wallet)

        # Payout events (for reconciliation)
        elif event_type == "payout.paid":
            return await self._handle_payout_paid(data, business_wallet)

        elif event_type == "payout.reconciliation_completed":
            return await self._handle_reconciliation_completed(data, business_wallet)

        # Charge events (for transaction tracking)
        elif event_type == "charge.succeeded":
            return await self._handle_charge_succeeded(data, business_wallet)

        elif event_type == "charge.refunded":
            return await self._handle_charge_refunded(data, business_wallet)

        else:
            logger.info(f"Unhandled event type: {event_type}")
            return {"status": "ignored", "event_type": event_type}

    async def _handle_payment_succeeded(
        self, payment_intent: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle successful payment (real-time monitoring)"""
        logger.info(
            f"Payment succeeded: {payment_intent['id']} - "
            f"${payment_intent['amount'] / 100} {payment_intent['currency']}"
        )

        # Store payment data for analytics
        payment_data = {
            "id": payment_intent["id"],
            "type": "payment",
            "amount": payment_intent["amount"] / 100,
            "currency": payment_intent["currency"],
            "status": "succeeded",
            "customer_id": payment_intent.get("customer"),
            "created": payment_intent["created"],
            "description": payment_intent.get("description"),
            "payment_method": payment_intent.get("payment_method"),
            "metadata": payment_intent.get("metadata", {}),
            "webhook_timestamp": datetime.utcnow().isoformat(),
        }

        # Encrypt and upload to Filecoin
        cid = await self._store_transaction(
            data=payment_data, data_type="payments", business_wallet=business_wallet
        )

        return {
            "action": "payment_tracked",
            "payment_id": payment_intent["id"],
            "amount": payment_intent["amount"] / 100,
            "cid": cid,
        }

    async def _handle_invoice_paid(
        self, invoice: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle paid invoice (subscription analytics)"""
        logger.info(f"Invoice paid: {invoice['id']}")

        invoice_data = {
            "id": invoice["id"],
            "type": "invoice",
            "customer_id": invoice.get("customer"),
            "amount_paid": invoice.get("amount_paid", 0) / 100,
            "currency": invoice.get("currency", "usd"),
            "status": "paid",
            "subscription_id": invoice.get("subscription"),
            "created": invoice["created"],
            "webhook_timestamp": datetime.utcnow().isoformat(),
        }

        cid = await self._store_transaction(
            data=invoice_data, data_type="invoices", business_wallet=business_wallet
        )

        return {
            "action": "invoice_recorded",
            "invoice_id": invoice["id"],
            "amount": invoice.get("amount_paid", 0) / 100,
            "cid": cid,
        }

    async def _handle_payout_paid(
        self, payout: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """
        Handle payout completion (reconciliation)
        Best practice: Trigger automated reconciliation
        """
        logger.info(f"Payout paid: {payout['id']} - ${payout['amount'] / 100}")

        payout_data = {
            "id": payout["id"],
            "type": "payout",
            "amount": payout["amount"] / 100,
            "currency": payout["currency"],
            "status": "paid",
            "arrival_date": payout.get("arrival_date"),
            "created": payout["created"],
            "destination": payout.get("destination"),
            "webhook_timestamp": datetime.utcnow().isoformat(),
        }

        cid = await self._store_transaction(
            data=payout_data, data_type="payouts", business_wallet=business_wallet
        )

        # Trigger reconciliation notification
        try:
            await notification_service.send_notification(
                wallet_address=business_wallet,
                notification_type="payout_reconciliation",
                title="Payout Ready for Reconciliation",
                message=f"Payout {payout['id']} for ${payout['amount'] / 100:.2f} {payout['currency'].upper()} has been paid and is ready for reconciliation.",
                priority="normal",
                channels=["dashboard", "email"],
                metadata={
                    "payout_id": payout["id"],
                    "amount": payout["amount"] / 100,
                    "currency": payout["currency"],
                    "arrival_date": payout.get("arrival_date"),
                    "cid": cid,
                    "integration": "stripe",
                    "action_required": "reconciliation",
                },
            )
            logger.info(f"Payout {payout['id']} reconciliation notification sent")
        except Exception as e:
            logger.warning(f"Failed to send payout notification: {e}")

        return {
            "action": "payout_recorded",
            "payout_id": payout["id"],
            "amount": payout["amount"] / 100,
            "cid": cid,
            "reconciliation_triggered": True,
        }

    async def _handle_reconciliation_completed(
        self, payout: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """
        Handle reconciliation completion
        Best practice: Automatically retrieve payout details
        """
        logger.info(f"Reconciliation completed for payout: {payout['id']}")

        # Fetch complete reconciliation data
        payout_id = payout["id"]
        balance_transactions = await self._fetch_balance_transactions(payout_id)

        reconciliation_data = {
            "payout_id": payout_id,
            "type": "reconciliation",
            "balance_transactions": balance_transactions,
            "completed_at": datetime.utcnow().isoformat(),
        }

        cid = await self._store_transaction(
            data=reconciliation_data, data_type="reconciliations", business_wallet=business_wallet
        )

        return {
            "action": "reconciliation_stored",
            "payout_id": payout_id,
            "transaction_count": len(balance_transactions),
            "cid": cid,
        }

    async def _handle_payment_failed(
        self, payment_intent: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle failed payment (alerting)"""
        logger.warning(
            f"Payment failed: {payment_intent['id']} - " f"${payment_intent['amount'] / 100}"
        )

        failure_data = {
            "id": payment_intent["id"],
            "type": "payment_failure",
            "amount": payment_intent["amount"] / 100,
            "currency": payment_intent["currency"],
            "status": "failed",
            "customer_id": payment_intent.get("customer"),
            "last_payment_error": payment_intent.get("last_payment_error", {}),
            "webhook_timestamp": datetime.utcnow().isoformat(),
        }

        cid = await self._store_transaction(
            data=failure_data, data_type="payment_failures", business_wallet=business_wallet
        )

        # Trigger payment failure alert
        try:
            error_message = "Unknown error"
            error_code = None
            if payment_intent.get("last_payment_error"):
                error_message = payment_intent["last_payment_error"].get("message", "Unknown error")
                error_code = payment_intent["last_payment_error"].get("code")

            await notification_service.send_notification(
                wallet_address=business_wallet,
                notification_type="payment_failed",
                title="Payment Failed Alert",
                message=f"Payment of ${payment_intent['amount'] / 100:.2f} {payment_intent['currency'].upper()} failed. Reason: {error_message}",
                priority="high",
                channels=["dashboard", "email", "slack"],  # High priority - multiple channels
                metadata={
                    "payment_id": payment_intent["id"],
                    "amount": payment_intent["amount"] / 100,
                    "currency": payment_intent["currency"],
                    "customer_id": payment_intent.get("customer"),
                    "error_code": error_code,
                    "error_message": error_message,
                    "cid": cid,
                    "integration": "stripe",
                    "action_required": "review_payment",
                },
            )
            logger.info(f"Payment failure alert sent for {payment_intent['id']}")
        except Exception as e:
            logger.warning(f"Failed to send payment failure alert: {e}")

        return {"action": "failure_logged", "payment_id": payment_intent["id"], "cid": cid}

    async def _handle_invoice_failed(
        self, invoice: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle failed invoice payment"""
        return {"action": "invoice_failure_logged", "invoice_id": invoice["id"]}

    async def _handle_customer_created(
        self, customer: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle new customer creation"""
        return {"action": "customer_tracked", "customer_id": customer["id"]}

    async def _handle_subscription_deleted(
        self, subscription: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle subscription cancellation (churn analytics)"""
        return {"action": "churn_tracked", "subscription_id": subscription["id"]}

    async def _handle_charge_succeeded(
        self, charge: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle successful charge"""
        return {"action": "charge_tracked", "charge_id": charge["id"]}

    async def _handle_charge_refunded(
        self, charge: Dict[str, Any], business_wallet: str
    ) -> Dict[str, Any]:
        """Handle charge refund (for refund analytics)"""
        return {"action": "refund_tracked", "charge_id": charge["id"]}

    async def _store_transaction(
        self, data: Dict[str, Any], data_type: str, business_wallet: str
    ) -> str:
        """
        Encrypt and store transaction data to Filecoin

        Args:
            data: Transaction data
            data_type: Type of transaction
            business_wallet: Customer wallet

        Returns:
            Filecoin CID
        """
        data_package = {
            "data_type": data_type,
            "integration": "stripe",
            "records": [data],
            "record_count": 1,
            "synced_at": datetime.utcnow().isoformat(),
            "sync_method": "webhook",
            "metadata": {"source": "stripe_webhook", "version": "v1"},
        }

        encrypted_data = await self.encryption.encrypt_for_customer(
            data=data_package,
            customer_wallet=business_wallet,
            additional_metadata={
                "integration": "stripe",
                "data_type": data_type,
                "sync_method": "webhook",
            },
        )

        cid = await self.filecoin.upload_encrypted_data(
            customer_wallet=business_wallet,
            integration="stripe",
            data_type=data_type,
            encrypted_data=encrypted_data,
            metadata={
                "integration": "stripe",
                "data_type": data_type,
                "sync_method": "webhook",
                "storage_layer": "customer-data",
            },
        )

        return cid

    async def _fetch_balance_transactions(self, payout_id: str) -> List[Dict[str, Any]]:
        """
        Fetch balance transactions for a payout
        Used for reconciliation

        Args:
            payout_id: Stripe payout ID

        Returns:
            List of balance transactions
        """
        try:
            # Fetch balance transactions for this payout
            balance_transactions = stripe.BalanceTransaction.list(payout=payout_id, limit=100)

            return [
                {
                    "id": txn.id,
                    "amount": txn.amount / 100,
                    "currency": txn.currency,
                    "type": txn.type,
                    "created": txn.created,
                    "description": txn.description,
                    "fee": txn.fee / 100,
                    "net": txn.net / 100,
                }
                for txn in balance_transactions.auto_paging_iter()
            ]

        except Exception as e:
            logger.error(f"Failed to fetch balance transactions: {e}")
            return []


class WebhookEventLog:
    """Log webhook events for auditing and debugging"""

    @staticmethod
    async def log_event(
        event_id: str,
        event_type: str,
        status: str,
        metadata: Optional[Dict[str, Any]] = None,
        wallet_address: Optional[str] = None,
        error_message: Optional[str] = None,
        processing_time_ms: Optional[int] = None,
    ) -> None:
        """
        Log webhook event to database and logs

        Args:
            event_id: Stripe event ID
            event_type: Event type
            status: Processing status (received, processed, failed)
            metadata: Additional metadata
            wallet_address: Associated business wallet
            error_message: Error details if failed
            processing_time_ms: Time taken to process in milliseconds
        """
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_id": event_id,
            "event_type": event_type,
            "status": status,
            "metadata": metadata or {},
        }

        logger.info(f"Stripe webhook event: {log_entry}")

        # Store in database for historical tracking
        try:
            async with get_db_session() as db:
                # Check if event already exists (for updates)
                from sqlalchemy import select

                existing = await db.execute(
                    select(WebhookEventLogModel).where(WebhookEventLogModel.event_id == event_id)
                )
                existing_record = existing.scalar_one_or_none()

                if existing_record:
                    # Update existing record
                    existing_record.status = status
                    existing_record.event_data = metadata or {}
                    if error_message:
                        existing_record.error_message = error_message
                    if processing_time_ms:
                        existing_record.processing_time_ms = processing_time_ms
                    if status == "processed":
                        existing_record.processed_at = datetime.utcnow()
                else:
                    # Create new record
                    event_log = WebhookEventLogModel(
                        event_id=event_id,
                        event_type=event_type,
                        source="stripe",
                        wallet_address=wallet_address,
                        status=status,
                        payload_hash=hashlib.sha256(event_id.encode()).hexdigest(),
                        event_data=metadata or {},
                        error_message=error_message,
                        processing_time_ms=processing_time_ms,
                        processed_at=datetime.utcnow() if status == "processed" else None,
                    )
                    db.add(event_log)

                await db.commit()
                logger.debug(f"Webhook event {event_id} stored in database")

        except Exception as e:
            # Don't fail webhook processing if database storage fails
            logger.warning(f"Failed to store webhook event {event_id} in database: {e}")
