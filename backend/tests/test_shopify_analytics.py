"""
Tests for Shopify analytics module
"""
import pytest
from datetime import datetime, timedelta
from app.adapters.shopify.analytics import (
    ShopifyAnalytics,
    InventoryForecast,
    AbandonedCartMetrics,
    SalesPerformance,
)


class TestShopifyAnalytics:
    """Test suite for Shopify analytics"""

    @pytest.fixture
    def analytics(self):
        """Create analytics instance"""
        return ShopifyAnalytics()

    @pytest.fixture
    def sample_products(self):
        """Sample product data"""
        return [
            {
                "id": "1",
                "title": "Product A",
                "inventory_quantity": 100,
                "variants": [{"inventory_quantity": 100}],
            },
            {
                "id": "2",
                "title": "Product B",
                "inventory_quantity": 50,
                "variants": [{"inventory_quantity": 50}],
            },
            {
                "id": "3",
                "title": "Product C",
                "inventory_quantity": 10,
                "variants": [{"inventory_quantity": 10}],
            },
        ]

    @pytest.fixture
    def sample_orders(self):
        """Sample order data with varying dates"""
        orders = []
        for i in range(30):
            date = datetime.utcnow() - timedelta(days=i)
            orders.append(
                {
                    "id": f"order_{i}",
                    "created_at": date.isoformat() + "Z",
                    "total_price": "100.00",
                    "line_items": [
                        {"product_id": "1", "quantity": 2, "price": "25.00", "name": "Product A"},
                        {"product_id": "2", "quantity": 1, "price": "50.00", "name": "Product B"},
                    ],
                }
            )
        return orders

    @pytest.fixture
    def sample_checkouts(self):
        """Sample checkout data (abandoned carts)"""
        checkouts = []
        for i in range(10):
            hours_ago = 24 + (i * 2)
            date = datetime.utcnow() - timedelta(hours=hours_ago)
            checkouts.append(
                {
                    "id": f"checkout_{i}",
                    "created_at": date.isoformat() + "Z",
                    "completed_at": None,  # Not completed = abandoned
                    "email": f"customer{i}@example.com",
                    "total_price": str(50 + (i * 10)),
                    "line_items": [
                        {"title": f"Product {i}", "quantity": 1, "price": str(50 + (i * 10))}
                    ],
                }
            )
        return checkouts

    @pytest.mark.asyncio
    async def test_inventory_forecast_basic(self, analytics, sample_products, sample_orders):
        """Test basic inventory forecasting"""
        forecasts = await analytics.forecast_inventory(
            products=sample_products, orders=sample_orders, forecast_days=30
        )

        assert len(forecasts) == 3
        assert all(isinstance(f, InventoryForecast) for f in forecasts)

        # First forecast should have lowest stock
        assert forecasts[0].predicted_stock_7_days <= forecasts[1].predicted_stock_7_days

    @pytest.mark.asyncio
    async def test_inventory_forecast_stockout_prediction(
        self, analytics, sample_products, sample_orders
    ):
        """Test stockout date prediction"""
        forecasts = await analytics.forecast_inventory(
            products=sample_products, orders=sample_orders, forecast_days=30
        )

        # Product C has low stock (10 units), should predict stockout
        product_c_forecast = next(f for f in forecasts if f.product_id == "3")
        assert product_c_forecast.current_stock == 10

        # Should have a stockout prediction if sales are happening
        if product_c_forecast.average_daily_sales > 0:
            assert product_c_forecast.predicted_stockout_date is not None

    @pytest.mark.asyncio
    async def test_inventory_forecast_reorder_recommendations(
        self, analytics, sample_products, sample_orders
    ):
        """Test reorder quantity recommendations"""
        forecasts = await analytics.forecast_inventory(
            products=sample_products, orders=sample_orders, forecast_days=30
        )

        for forecast in forecasts:
            # Reorder quantity should be non-negative
            assert forecast.recommended_reorder_quantity >= 0

            # If predicted to stock out, should recommend reorder
            if forecast.predicted_stockout_date:
                assert forecast.recommended_reorder_quantity > 0

    @pytest.mark.asyncio
    async def test_abandoned_cart_analysis(self, analytics, sample_checkouts):
        """Test abandoned cart tracking"""
        carts, summary = await analytics.analyze_abandoned_carts(
            checkouts=sample_checkouts, recovery_threshold_hours=24
        )

        assert len(carts) > 0
        assert all(isinstance(c, AbandonedCartMetrics) for c in carts)

        # Verify summary metrics
        assert summary["total_abandoned_carts"] == len(carts)
        assert summary["total_abandoned_value"] > 0
        assert summary["average_cart_value"] > 0
        assert summary["potential_revenue"] > 0

    @pytest.mark.asyncio
    async def test_abandoned_cart_recovery_probability(self, analytics, sample_checkouts):
        """Test cart recovery probability calculation"""
        carts, _ = await analytics.analyze_abandoned_carts(
            checkouts=sample_checkouts, recovery_threshold_hours=24
        )

        for cart in carts:
            # Probability should be between 0 and 1
            assert 0 <= cart.recovery_probability <= 1

        # Carts should be sorted by recovery probability (highest first)
        for i in range(len(carts) - 1):
            assert carts[i].recovery_probability >= carts[i + 1].recovery_probability

    @pytest.mark.asyncio
    async def test_sales_performance_analysis(self, analytics, sample_orders):
        """Test sales performance analytics"""
        performance = await analytics.analyze_sales_performance(
            orders=sample_orders, period_days=30
        )

        assert isinstance(performance, SalesPerformance)
        assert performance.total_revenue > 0
        assert performance.total_orders == 30
        assert performance.average_order_value > 0
        assert len(performance.top_products) > 0

    @pytest.mark.asyncio
    async def test_sales_performance_top_products(self, analytics, sample_orders):
        """Test top products calculation"""
        performance = await analytics.analyze_sales_performance(
            orders=sample_orders, period_days=30
        )

        # Should identify Product A as top seller (2 units per order)
        top_product = performance.top_products[0]
        assert top_product["product_id"] == "1"
        assert top_product["revenue"] > 0
        assert top_product["units_sold"] == 60  # 2 units × 30 orders

    @pytest.mark.asyncio
    async def test_sales_trend_detection(self, analytics):
        """Test sales trend detection"""
        # Increasing trend
        increasing_data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        trend = analytics._detect_trend(increasing_data)
        assert trend == "increasing"

        # Decreasing trend
        decreasing_data = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
        trend = analytics._detect_trend(decreasing_data)
        assert trend == "decreasing"

        # Stable trend
        stable_data = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
        trend = analytics._detect_trend(stable_data)
        assert trend == "stable"

    def test_confidence_calculation(self, analytics):
        """Test forecast confidence calculation"""
        # Consistent data = high confidence
        consistent_data = [5, 5, 5, 5, 5, 5, 5, 5]
        confidence = analytics._calculate_confidence(consistent_data)
        assert confidence > 0.7

        # Variable data = lower confidence
        variable_data = [1, 10, 2, 9, 3, 8, 4, 7]
        confidence = analytics._calculate_confidence(variable_data)
        assert confidence < 0.7

    def test_recovery_probability_factors(self, analytics):
        """Test cart recovery probability factors"""
        # High value cart = higher probability
        high_value_prob = analytics._calculate_recovery_probability(
            cart_value=250, item_count=5, hours_since_abandon=1
        )

        low_value_prob = analytics._calculate_recovery_probability(
            cart_value=25, item_count=1, hours_since_abandon=48
        )

        assert high_value_prob > low_value_prob

    @pytest.mark.asyncio
    async def test_empty_data_handling(self, analytics):
        """Test handling of empty data sets"""
        # Empty products
        forecasts = await analytics.forecast_inventory(products=[], orders=[], forecast_days=30)
        assert len(forecasts) == 0

        # Empty checkouts
        carts, summary = await analytics.analyze_abandoned_carts(
            checkouts=[], recovery_threshold_hours=24
        )
        assert len(carts) == 0
        assert summary["total_abandoned_carts"] == 0

        # Empty orders
        performance = await analytics.analyze_sales_performance(orders=[], period_days=30)
        assert performance.total_revenue == 0
        assert performance.total_orders == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
