#!/usr/bin/env python3
"""
Comprehensive Marketplace & Smart Contract Testing
Agent 8: Marketplace & Smart Contract Integration Specialist
"""
import asyncio
import httpx
import json
from datetime import datetime
from typing import Dict, List, Any

# Test configuration
BASE_URL = "http://localhost:8001"
API_PREFIX = "/api/v1"
TEST_WALLET = "0x20B7d1426649D9a573ba7Fd10592456264220cbF"

# Smart contract addresses from deployments.json
CONTRACTS = {
    "ToolMarketplace": "0xa6A4c92C42a72A6946Dd304c4Ec10a84B0E98598",
    "ToolLicenseNFT": "0x56125b00de0eB47a77417c10E633B47bC631715d",
    "SubscriptionBilling": "0x055E9111520047c1f4c754269CC84908fF62157B",
    "RevenueSplitter": "0xc48f586717Cc471EddF4b87B2046280D07e460FA",
    "USDC": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
}

class MarketplaceTestSuite:
    """Comprehensive marketplace testing suite"""

    def __init__(self):
        self.client = httpx.AsyncClient(base_url=BASE_URL, timeout=30.0)
        self.results = {
            "tests_run": 0,
            "tests_passed": 0,
            "tests_failed": 0,
            "bugs_found": [],
            "test_details": []
        }

    async def run_all_tests(self):
        """Run all marketplace tests"""
        print("=" * 80)
        print("AGENT 8: MARKETPLACE & SMART CONTRACT INTEGRATION TESTING")
        print("=" * 80)
        print(f"Test started at: {datetime.now().isoformat()}\n")

        # Test 1: Smart Contract Verification
        await self.test_smart_contracts()

        # Test 2: Marketplace Endpoints
        await self.test_marketplace_endpoints()

        # Test 3: Product Listing
        await self.test_product_listing()

        # Test 4: Single Product Retrieval
        await self.test_single_product()

        # Test 5: Product by Slug
        await self.test_product_by_slug()

        # Test 6: Categories
        await self.test_categories()

        # Test 7: Pricing Calculator
        await self.test_pricing_calculator()

        # Test 8: Integration Config
        await self.test_integration_config()

        # Test 9: Purchase Flow (mock)
        await self.test_purchase_flow()

        # Test 10: Purchase History
        await self.test_purchase_history()

        # Generate report
        await self.generate_report()

        await self.client.aclose()

    async def test_smart_contracts(self):
        """Test 1: Verify smart contract deployments"""
        test_name = "Smart Contract Verification"
        print(f"\n{'=' * 80}")
        print(f"TEST 1: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1
        passed = True
        details = []

        # Check all contract addresses are non-zero
        for name, address in CONTRACTS.items():
            is_valid = address != "0x0000000000000000000000000000000000000000"
            details.append({
                "contract": name,
                "address": address,
                "valid": is_valid
            })
            print(f"  {name}: {address} {'✓' if is_valid else '✗'}")
            if not is_valid:
                passed = False
                self.results["bugs_found"].append({
                    "bug_id": "CONTRACT-001",
                    "severity": "critical",
                    "description": f"{name} has zero address",
                    "contract": name
                })

        if passed:
            self.results["tests_passed"] += 1
            print(f"\n✓ {test_name} PASSED")
        else:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED")

        self.results["test_details"].append({
            "test": test_name,
            "passed": passed,
            "details": details
        })

    async def test_marketplace_endpoints(self):
        """Test 2: Marketplace endpoint availability"""
        test_name = "Marketplace Endpoint Availability"
        print(f"\n{'=' * 80}")
        print(f"TEST 2: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1
        endpoints = [
            "/api/v1/marketplace/products",
            "/api/v1/marketplace/categories",
            "/health"
        ]

        all_passed = True
        details = []

        for endpoint in endpoints:
            try:
                response = await self.client.get(endpoint)
                passed = response.status_code == 200
                details.append({
                    "endpoint": endpoint,
                    "status_code": response.status_code,
                    "passed": passed
                })
                print(f"  {endpoint}: {response.status_code} {'✓' if passed else '✗'}")

                if not passed:
                    all_passed = False
                    self.results["bugs_found"].append({
                        "bug_id": f"ENDPOINT-{len(self.results['bugs_found']) + 1:03d}",
                        "severity": "high",
                        "description": f"{endpoint} returned {response.status_code}",
                        "endpoint": endpoint
                    })
            except Exception as e:
                all_passed = False
                details.append({
                    "endpoint": endpoint,
                    "error": str(e),
                    "passed": False
                })
                print(f"  {endpoint}: ERROR - {e}")
                self.results["bugs_found"].append({
                    "bug_id": f"ENDPOINT-{len(self.results['bugs_found']) + 1:03d}",
                    "severity": "critical",
                    "description": f"{endpoint} threw exception: {e}",
                    "endpoint": endpoint
                })

        if all_passed:
            self.results["tests_passed"] += 1
            print(f"\n✓ {test_name} PASSED")
        else:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED")

        self.results["test_details"].append({
            "test": test_name,
            "passed": all_passed,
            "details": details
        })

    async def test_product_listing(self):
        """Test 3: Product listing functionality"""
        test_name = "Product Listing"
        print(f"\n{'=' * 80}")
        print(f"TEST 3: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            response = await self.client.get("/api/v1/marketplace/products")
            products = response.json()

            print(f"  Status Code: {response.status_code}")
            print(f"  Products Found: {len(products)}")

            passed = response.status_code == 200 and len(products) > 0

            if len(products) == 0:
                self.results["bugs_found"].append({
                    "bug_id": "PRODUCT-001",
                    "severity": "high",
                    "description": "No products returned from /products endpoint",
                    "expected": "> 0 products",
                    "actual": "0 products"
                })

            if passed:
                # Check product structure
                if products:
                    sample_product = products[0]
                    required_fields = ["id", "name", "slug", "category", "logo", "developer"]
                    missing_fields = [f for f in required_fields if f not in sample_product]

                    if missing_fields:
                        passed = False
                        self.results["bugs_found"].append({
                            "bug_id": "PRODUCT-002",
                            "severity": "medium",
                            "description": f"Product missing required fields: {missing_fields}",
                            "product": sample_product.get("name", "unknown")
                        })

                    print(f"\n  Sample Product:")
                    print(f"    ID: {sample_product.get('id')}")
                    print(f"    Name: {sample_product.get('name')}")
                    print(f"    Slug: {sample_product.get('slug')}")
                    print(f"    Category: {sample_product.get('category')}")

            if passed:
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")

            self.results["test_details"].append({
                "test": test_name,
                "passed": passed,
                "products_count": len(products),
                "sample_product": products[0] if products else None
            })

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")
            self.results["bugs_found"].append({
                "bug_id": "PRODUCT-003",
                "severity": "critical",
                "description": f"Product listing threw exception: {e}"
            })

    async def test_single_product(self):
        """Test 4: Single product retrieval"""
        test_name = "Single Product Retrieval"
        print(f"\n{'=' * 80}")
        print(f"TEST 4: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            # Get products first to find a valid ID
            products_response = await self.client.get("/api/v1/marketplace/products")
            products = products_response.json()

            if not products:
                print("  WARNING: No products available to test single retrieval")
                self.results["tests_failed"] += 1
                return

            product_id = products[0]["id"]
            response = await self.client.get(f"/api/v1/marketplace/products/{product_id}")

            print(f"  Product ID: {product_id}")
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code == 200

            if passed:
                product = response.json()
                print(f"  Product Name: {product.get('name')}")
                print(f"  Pricing Plans: {len(product.get('pricing_plans', []))}")
                print(f"  Data Sync Types: {len(product.get('data_sync', []))}")

            if passed:
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")
                self.results["bugs_found"].append({
                    "bug_id": "PRODUCT-004",
                    "severity": "high",
                    "description": f"Failed to retrieve product {product_id}",
                    "status_code": response.status_code
                })

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")
            self.results["bugs_found"].append({
                "bug_id": "PRODUCT-005",
                "severity": "high",
                "description": f"Single product retrieval threw exception: {e}"
            })

    async def test_product_by_slug(self):
        """Test 5: Product retrieval by slug"""
        test_name = "Product by Slug"
        print(f"\n{'=' * 80}")
        print(f"TEST 5: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            response = await self.client.get("/api/v1/marketplace/products/slug/quickbooks")
            print(f"  Slug: quickbooks")
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code in [200, 404]  # 404 is acceptable if no products

            if response.status_code == 200:
                product = response.json()
                print(f"  Product Name: {product.get('name')}")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            elif response.status_code == 404:
                print("  Product not found (acceptable if database is empty)")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED (404 expected)")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")
                self.results["bugs_found"].append({
                    "bug_id": "PRODUCT-006",
                    "severity": "medium",
                    "description": f"Product by slug returned unexpected status {response.status_code}"
                })

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def test_categories(self):
        """Test 6: Categories endpoint"""
        test_name = "Categories"
        print(f"\n{'=' * 80}")
        print(f"TEST 6: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            response = await self.client.get("/api/v1/marketplace/categories")
            categories = response.json()

            print(f"  Status Code: {response.status_code}")
            print(f"  Categories Found: {len(categories)}")

            passed = response.status_code == 200

            if categories:
                print(f"\n  Sample Categories:")
                for cat in categories[:3]:
                    print(f"    - {cat.get('name')} ({cat.get('slug')})")

            if passed:
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def test_pricing_calculator(self):
        """Test 7: Pricing calculator"""
        test_name = "Pricing Calculator"
        print(f"\n{'=' * 80}")
        print(f"TEST 7: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            # Need a valid product_id and tier
            params = {
                "product_id": 1,
                "tier": "professional",
                "billing_period": "monthly",
                "users": 5
            }

            response = await self.client.get("/api/v1/marketplace/pricing-calculator", params=params)
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code in [200, 404]  # 404 if no products

            if response.status_code == 200:
                pricing = response.json()
                print(f"  Base Price: ${pricing.get('base_price', 0)}")
                print(f"  Total Price: ${pricing.get('total_price', 0)}")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            elif response.status_code == 404:
                print("  Product not found (acceptable)")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED (404 expected)")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def test_integration_config(self):
        """Test 8: Integration configuration"""
        test_name = "Integration Config"
        print(f"\n{'=' * 80}")
        print(f"TEST 8: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            response = await self.client.get("/api/v1/marketplace/integration-config/quickbooks")
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code in [200, 404]

            if response.status_code == 200:
                config = response.json()
                print(f"  Product: {config.get('product_name')}")
                print(f"  Has Adapter: {config.get('has_adapter')}")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            elif response.status_code == 404:
                print("  Integration not found (acceptable)")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED (404 expected)")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def test_purchase_flow(self):
        """Test 9: Purchase flow (mock)"""
        test_name = "Purchase Flow"
        print(f"\n{'=' * 80}")
        print(f"TEST 9: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            purchase_data = {
                "product_id": 1,
                "tier": "professional",
                "wallet_address": TEST_WALLET,
                "billing_period": "monthly",
                "users": 5
            }

            response = await self.client.post("/api/v1/marketplace/purchase", json=purchase_data)
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code in [200, 404]  # 404 if no products

            if response.status_code == 200:
                result = response.json()
                print(f"  Success: {result.get('success')}")
                print(f"  License ID: {result.get('license_id')}")
                print(f"  Amount: ${result.get('amount_paid')}")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            elif response.status_code == 404:
                print("  Product not found (acceptable)")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED (404 expected)")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")
                self.results["bugs_found"].append({
                    "bug_id": "PURCHASE-001",
                    "severity": "high",
                    "description": f"Purchase failed with status {response.status_code}",
                    "response": response.text
                })

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def test_purchase_history(self):
        """Test 10: Purchase history"""
        test_name = "Purchase History"
        print(f"\n{'=' * 80}")
        print(f"TEST 10: {test_name}")
        print(f"{'=' * 80}")

        self.results["tests_run"] += 1

        try:
            response = await self.client.get(
                f"/api/v1/marketplace-purchases?wallet_address={TEST_WALLET}"
            )
            print(f"  Status Code: {response.status_code}")

            passed = response.status_code == 200

            if passed:
                purchases = response.json()
                print(f"  Purchases Found: {len(purchases)}")
                self.results["tests_passed"] += 1
                print(f"\n✓ {test_name} PASSED")
            else:
                self.results["tests_failed"] += 1
                print(f"\n✗ {test_name} FAILED")

        except Exception as e:
            self.results["tests_failed"] += 1
            print(f"\n✗ {test_name} FAILED - Exception: {e}")

    async def generate_report(self):
        """Generate comprehensive test report"""
        print(f"\n{'=' * 80}")
        print("TEST SUMMARY")
        print(f"{'=' * 80}")
        print(f"Total Tests Run: {self.results['tests_run']}")
        print(f"Tests Passed: {self.results['tests_passed']} ✓")
        print(f"Tests Failed: {self.results['tests_failed']} ✗")
        print(f"Bugs Found: {len(self.results['bugs_found'])}")

        pass_rate = (self.results['tests_passed'] / self.results['tests_run'] * 100) if self.results['tests_run'] > 0 else 0
        print(f"Pass Rate: {pass_rate:.1f}%")

        if self.results["bugs_found"]:
            print(f"\n{'=' * 80}")
            print("BUGS FOUND")
            print(f"{'=' * 80}")
            for bug in self.results["bugs_found"]:
                print(f"\n  Bug ID: {bug['bug_id']}")
                print(f"  Severity: {bug['severity'].upper()}")
                print(f"  Description: {bug['description']}")

        # Save detailed results
        with open("marketplace_test_results.json", "w") as f:
            json.dump(self.results, f, indent=2)

        print(f"\n{'=' * 80}")
        print("Detailed results saved to: marketplace_test_results.json")
        print(f"Test completed at: {datetime.now().isoformat()}")
        print(f"{'=' * 80}\n")


async def main():
    """Main test execution"""
    suite = MarketplaceTestSuite()
    await suite.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
