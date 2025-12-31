"""
Financial Analytics Service
Advanced financial analytics, reconciliation, and reporting
Implements 2025 best practices for financial data analysis
"""
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from collections import defaultdict

logger = logging.getLogger(__name__)


class FinancialAnalyticsService:
    """Advanced financial analytics with reconciliation capabilities"""

    def __init__(self):
        """Initialize financial analytics service"""
        pass

    async def calculate_revenue_metrics(
        self,
        transactions: List[Dict[str, Any]],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive revenue metrics

        Args:
            transactions: List of transaction records
            start_date: Start date for analysis
            end_date: End date for analysis

        Returns:
            Revenue metrics including MRR, ARR, growth rate
        """
        # Filter transactions by date range
        filtered = self._filter_by_date(transactions, start_date, end_date)

        # Calculate total revenue
        total_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in filtered
            if txn.get("status") in ["succeeded", "paid"]
        )

        # Calculate subscription metrics
        subscription_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in filtered
            if txn.get("type") == "subscription" and txn.get("status") == "paid"
        )

        # Calculate one-time payment revenue
        one_time_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in filtered
            if txn.get("type") == "payment" and txn.get("status") == "succeeded"
        )

        # Calculate Monthly Recurring Revenue (MRR)
        mrr = self._calculate_mrr(filtered)

        # Calculate Annual Recurring Revenue (ARR)
        arr = mrr * 12

        # Calculate revenue growth rate
        growth_rate = await self._calculate_growth_rate(transactions, start_date, end_date)

        # Calculate average transaction value
        successful_txns = [txn for txn in filtered if txn.get("status") in ["succeeded", "paid"]]
        avg_transaction_value = (
            total_revenue / len(successful_txns) if successful_txns else Decimal(0)
        )

        return {
            "total_revenue": float(total_revenue),
            "subscription_revenue": float(subscription_revenue),
            "one_time_revenue": float(one_time_revenue),
            "mrr": float(mrr),
            "arr": float(arr),
            "growth_rate": growth_rate,
            "avg_transaction_value": float(avg_transaction_value),
            "transaction_count": len(successful_txns),
            "period": {
                "start": start_date.isoformat() if start_date else None,
                "end": end_date.isoformat() if end_date else None,
            },
        }

    async def reconcile_accounts(
        self, stripe_data: List[Dict[str, Any]], quickbooks_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Reconcile Stripe payments with QuickBooks records
        Implements automated reconciliation best practices

        Args:
            stripe_data: Stripe transaction records
            quickbooks_data: QuickBooks transaction records

        Returns:
            Reconciliation report with matched and unmatched transactions
        """
        logger.info("Starting account reconciliation...")

        # Create lookup indices
        stripe_by_id = {txn["id"]: txn for txn in stripe_data}
        qb_by_id = {txn["id"]: txn for txn in quickbooks_data}

        # Track reconciliation results
        matched_transactions = []
        stripe_unmatched = []
        qb_unmatched = []
        discrepancies = []

        # Match by external reference (Stripe ID in QuickBooks metadata)
        for qb_txn in quickbooks_data:
            # Check if QuickBooks transaction has Stripe reference
            stripe_ref = self._extract_stripe_reference(qb_txn)

            if stripe_ref and stripe_ref in stripe_by_id:
                stripe_txn = stripe_by_id[stripe_ref]

                # Compare amounts
                qb_amount = Decimal(str(qb_txn.get("total_amount", 0)))
                stripe_amount = Decimal(str(stripe_txn.get("amount", 0)))

                if abs(qb_amount - stripe_amount) < Decimal("0.01"):
                    # Perfect match
                    matched_transactions.append(
                        {
                            "quickbooks_id": qb_txn["id"],
                            "stripe_id": stripe_txn["id"],
                            "amount": float(qb_amount),
                            "date": qb_txn.get("txn_date") or stripe_txn.get("created"),
                            "status": "matched",
                        }
                    )
                else:
                    # Amount discrepancy
                    discrepancies.append(
                        {
                            "quickbooks_id": qb_txn["id"],
                            "stripe_id": stripe_txn["id"],
                            "qb_amount": float(qb_amount),
                            "stripe_amount": float(stripe_amount),
                            "difference": float(abs(qb_amount - stripe_amount)),
                            "status": "discrepancy",
                        }
                    )

                # Remove from unmatched
                stripe_by_id.pop(stripe_ref, None)
            else:
                qb_unmatched.append(
                    {
                        "id": qb_txn["id"],
                        "amount": qb_txn.get("total_amount", 0),
                        "date": qb_txn.get("txn_date"),
                        "source": "quickbooks",
                    }
                )

        # Remaining Stripe transactions are unmatched
        stripe_unmatched = [
            {
                "id": txn["id"],
                "amount": txn.get("amount", 0),
                "date": txn.get("created"),
                "source": "stripe",
            }
            for txn in stripe_by_id.values()
        ]

        # Calculate reconciliation statistics
        total_transactions = len(stripe_data) + len(quickbooks_data)
        match_rate = (
            len(matched_transactions) / (len(stripe_data) + len(quickbooks_data)) * 100
            if total_transactions > 0
            else 0
        )

        logger.info(
            f"Reconciliation complete: {len(matched_transactions)} matched, "
            f"{len(discrepancies)} discrepancies, "
            f"{len(stripe_unmatched) + len(qb_unmatched)} unmatched"
        )

        return {
            "summary": {
                "total_matched": len(matched_transactions),
                "total_discrepancies": len(discrepancies),
                "total_unmatched": len(stripe_unmatched) + len(qb_unmatched),
                "match_rate": round(match_rate, 2),
                "reconciled_at": datetime.utcnow().isoformat(),
            },
            "matched_transactions": matched_transactions,
            "discrepancies": discrepancies,
            "unmatched": {"stripe": stripe_unmatched, "quickbooks": qb_unmatched},
        }

    async def analyze_cash_flow(
        self, transactions: List[Dict[str, Any]], period_days: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze cash flow patterns

        Args:
            transactions: Transaction records
            period_days: Number of days to analyze

        Returns:
            Cash flow analysis with trends
        """
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=period_days)

        filtered = self._filter_by_date(transactions, start_date, end_date)

        # Separate inflows and outflows
        inflows = [
            txn
            for txn in filtered
            if txn.get("type") in ["payment", "invoice", "charge"]
            and txn.get("status") in ["succeeded", "paid"]
        ]

        outflows = [txn for txn in filtered if txn.get("type") in ["expense", "payout", "refund"]]

        # Calculate totals
        total_inflow = sum(Decimal(str(txn.get("amount", 0))) for txn in inflows)

        total_outflow = sum(Decimal(str(txn.get("amount", 0))) for txn in outflows)

        net_cash_flow = total_inflow - total_outflow

        # Calculate daily averages
        avg_daily_inflow = total_inflow / period_days if period_days > 0 else 0
        avg_daily_outflow = total_outflow / period_days if period_days > 0 else 0

        # Calculate cash flow by day
        daily_cash_flow = self._calculate_daily_cash_flow(filtered, start_date, end_date)

        # Identify trends
        trend = "positive" if net_cash_flow > 0 else "negative" if net_cash_flow < 0 else "neutral"

        return {
            "period_days": period_days,
            "total_inflow": float(total_inflow),
            "total_outflow": float(total_outflow),
            "net_cash_flow": float(net_cash_flow),
            "avg_daily_inflow": float(avg_daily_inflow),
            "avg_daily_outflow": float(avg_daily_outflow),
            "trend": trend,
            "daily_breakdown": daily_cash_flow,
            "inflow_count": len(inflows),
            "outflow_count": len(outflows),
        }

    async def calculate_profit_margins(
        self, revenue_transactions: List[Dict[str, Any]], expense_transactions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate profit margins and ratios

        Args:
            revenue_transactions: Revenue records
            expense_transactions: Expense records

        Returns:
            Profit margin analysis
        """
        # Calculate total revenue
        total_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in revenue_transactions
            if txn.get("status") in ["succeeded", "paid"]
        )

        # Calculate total expenses
        total_expenses = sum(Decimal(str(txn.get("amount", 0))) for txn in expense_transactions)

        # Calculate gross profit
        gross_profit = total_revenue - total_expenses

        # Calculate profit margin
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        # Calculate expense ratio
        expense_ratio = (total_expenses / total_revenue * 100) if total_revenue > 0 else 0

        return {
            "total_revenue": float(total_revenue),
            "total_expenses": float(total_expenses),
            "gross_profit": float(gross_profit),
            "profit_margin": float(profit_margin),
            "expense_ratio": float(expense_ratio),
            "is_profitable": gross_profit > 0,
        }

    async def detect_anomalies(
        self, transactions: List[Dict[str, Any]], threshold_std_dev: float = 2.0
    ) -> Dict[str, Any]:
        """
        Detect anomalous transactions using statistical methods

        Args:
            transactions: Transaction records
            threshold_std_dev: Standard deviation threshold for anomaly detection

        Returns:
            Anomaly detection report
        """
        if len(transactions) < 10:
            return {
                "anomalies": [],
                "message": "Insufficient data for anomaly detection (minimum 10 transactions)",
            }

        # Extract amounts
        amounts = [Decimal(str(txn.get("amount", 0))) for txn in transactions]

        # Calculate mean and standard deviation
        mean_amount = sum(amounts) / len(amounts)
        variance = sum((x - mean_amount) ** 2 for x in amounts) / len(amounts)
        std_dev = variance ** Decimal("0.5")

        # Detect anomalies
        anomalies = []
        for txn in transactions:
            amount = Decimal(str(txn.get("amount", 0)))
            z_score = abs(amount - mean_amount) / std_dev if std_dev > 0 else 0

            if z_score > threshold_std_dev:
                anomalies.append(
                    {
                        "transaction_id": txn.get("id"),
                        "amount": float(amount),
                        "z_score": float(z_score),
                        "type": txn.get("type"),
                        "date": txn.get("created") or txn.get("txn_date"),
                        "severity": "high" if z_score > 3 else "medium",
                    }
                )

        return {
            "anomalies": anomalies,
            "statistics": {
                "mean_amount": float(mean_amount),
                "std_dev": float(std_dev),
                "threshold_used": threshold_std_dev,
            },
            "total_transactions": len(transactions),
            "anomaly_count": len(anomalies),
            "anomaly_rate": len(anomalies) / len(transactions) * 100,
        }

    # Helper methods

    def _filter_by_date(
        self,
        transactions: List[Dict[str, Any]],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> List[Dict[str, Any]]:
        """Filter transactions by date range"""
        if not start_date and not end_date:
            return transactions

        filtered = []
        for txn in transactions:
            txn_date_str = txn.get("created") or txn.get("txn_date")
            if not txn_date_str:
                continue

            # Handle both timestamp and date string formats
            if isinstance(txn_date_str, int):
                txn_date = datetime.fromtimestamp(txn_date_str)
            else:
                try:
                    txn_date = datetime.fromisoformat(txn_date_str.replace("Z", "+00:00"))
                except:
                    continue

            # Check date range
            if start_date and txn_date < start_date:
                continue
            if end_date and txn_date > end_date:
                continue

            filtered.append(txn)

        return filtered

    def _calculate_mrr(self, transactions: List[Dict[str, Any]]) -> Decimal:
        """Calculate Monthly Recurring Revenue from subscription transactions"""
        # Find active subscriptions
        subscription_amounts = defaultdict(Decimal)

        for txn in transactions:
            if txn.get("type") == "subscription" and txn.get("status") == "paid":
                subscription_id = txn.get("subscription_id")
                if subscription_id:
                    amount = Decimal(str(txn.get("amount", 0)))
                    subscription_amounts[subscription_id] = max(
                        subscription_amounts[subscription_id], amount
                    )

        return sum(subscription_amounts.values())

    async def _calculate_growth_rate(
        self,
        transactions: List[Dict[str, Any]],
        start_date: Optional[datetime],
        end_date: Optional[datetime],
    ) -> float:
        """Calculate revenue growth rate comparing to previous period"""
        if not start_date or not end_date:
            return 0.0

        period_length = (end_date - start_date).days

        # Current period revenue
        current_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in self._filter_by_date(transactions, start_date, end_date)
            if txn.get("status") in ["succeeded", "paid"]
        )

        # Previous period revenue
        prev_start = start_date - timedelta(days=period_length)
        prev_end = start_date
        previous_revenue = sum(
            Decimal(str(txn.get("amount", 0)))
            for txn in self._filter_by_date(transactions, prev_start, prev_end)
            if txn.get("status") in ["succeeded", "paid"]
        )

        # Calculate growth rate
        if previous_revenue > 0:
            growth_rate = ((current_revenue - previous_revenue) / previous_revenue) * 100
            return float(growth_rate)
        elif current_revenue > 0:
            return 100.0  # 100% growth from zero
        else:
            return 0.0

    def _calculate_daily_cash_flow(
        self, transactions: List[Dict[str, Any]], start_date: datetime, end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Calculate cash flow breakdown by day"""
        daily_data = defaultdict(lambda: {"inflow": Decimal(0), "outflow": Decimal(0)})

        for txn in transactions:
            txn_date_str = txn.get("created") or txn.get("txn_date")
            if not txn_date_str:
                continue

            # Parse date
            if isinstance(txn_date_str, int):
                txn_date = datetime.fromtimestamp(txn_date_str)
            else:
                try:
                    txn_date = datetime.fromisoformat(txn_date_str.replace("Z", "+00:00"))
                except:
                    continue

            date_key = txn_date.date().isoformat()
            amount = Decimal(str(txn.get("amount", 0)))

            # Categorize as inflow or outflow
            if txn.get("type") in ["payment", "invoice", "charge"]:
                daily_data[date_key]["inflow"] += amount
            elif txn.get("type") in ["expense", "payout", "refund"]:
                daily_data[date_key]["outflow"] += amount

        # Convert to list
        result = [
            {
                "date": date,
                "inflow": float(data["inflow"]),
                "outflow": float(data["outflow"]),
                "net": float(data["inflow"] - data["outflow"]),
            }
            for date, data in sorted(daily_data.items())
        ]

        return result

    def _extract_stripe_reference(self, qb_transaction: Dict[str, Any]) -> Optional[str]:
        """Extract Stripe payment reference from QuickBooks transaction"""
        # Check metadata
        metadata = qb_transaction.get("metadata", {})
        if isinstance(metadata, dict):
            return metadata.get("stripe_payment_id")

        # Check description
        description = qb_transaction.get("description", "")
        if description and "stripe:" in description.lower():
            # Extract Stripe ID from description
            parts = description.split("stripe:")
            if len(parts) > 1:
                return parts[1].strip().split()[0]

        return None


# Singleton instance
financial_analytics_service = FinancialAnalyticsService()
