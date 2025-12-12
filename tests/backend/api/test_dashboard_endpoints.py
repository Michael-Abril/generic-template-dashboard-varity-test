#!/usr/bin/env python3
"""
Test script for Dashboard API endpoints

Tests all 4 dashboard endpoints without running the full server.
"""
import asyncio
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent
sys.path.insert(0, str(backend_path))

async def test_dashboard_endpoints():
    """Test all dashboard endpoints"""
    print("=" * 80)
    print("DASHBOARD API ENDPOINT TEST")
    print("=" * 80)

    # Import the router
    try:
        from app.api.v1 import dashboard
        print("\n✅ Dashboard module imported successfully")
    except Exception as e:
        print(f"\n❌ Failed to import dashboard module: {e}")
        return False

    # Check router
    print(f"\n📊 Dashboard Router Information:")
    print(f"   - Total routes: {len(dashboard.router.routes)}")

    # List all endpoints
    print("\n🔗 Registered Endpoints:")
    for route in dashboard.router.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ", ".join(route.methods) if route.methods else "N/A"
            print(f"   - {methods:6} {route.path}")

    # Verify expected endpoints
    expected_endpoints = [
        "/kpis",
        "/revenue-trend",
        "/recent-activity",
        "/top-customers"
    ]

    print("\n✓ Expected Endpoints:")
    route_paths = [route.path for route in dashboard.router.routes if hasattr(route, 'path')]

    all_found = True
    for endpoint in expected_endpoints:
        if endpoint in route_paths:
            print(f"   ✅ {endpoint}")
        else:
            print(f"   ❌ {endpoint} - NOT FOUND")
            all_found = False

    # Check response models
    print("\n📋 Response Models:")
    models = [
        "KPIMetricsResponse",
        "RevenueTrendResponse",
        "RecentActivityResponse",
        "TopCustomersResponse"
    ]

    for model_name in models:
        if hasattr(dashboard, model_name):
            model = getattr(dashboard, model_name)
            print(f"   ✅ {model_name}")
            # Print fields
            if hasattr(model, '__fields__'):
                fields = list(model.__fields__.keys())
                print(f"      Fields: {', '.join(fields)}")
        else:
            print(f"   ❌ {model_name} - NOT FOUND")

    print("\n" + "=" * 80)
    if all_found:
        print("✅ ALL TESTS PASSED")
        print("=" * 80)
        return True
    else:
        print("❌ SOME TESTS FAILED")
        print("=" * 80)
        return False

if __name__ == "__main__":
    success = asyncio.run(test_dashboard_endpoints())
    sys.exit(0 if success else 1)
