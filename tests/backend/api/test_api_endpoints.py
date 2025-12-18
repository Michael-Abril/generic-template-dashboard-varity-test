#!/usr/bin/env python3
"""
API Endpoint Test Suite for Generic Company Dashboard

This script tests all newly created API endpoints:
- Marketplace API
- Integrations API
- AI Chatbot API
- QuickBooks Adapter
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any


# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class APITester:
    """Test suite for API endpoints"""

    def __init__(self):
        self.results = []
        self.passed = 0
        self.failed = 0
        self.test_wallet = "0x1234567890123456789012345678901234567890"

    def log(self, message: str, color: str = Colors.OKBLUE):
        """Print colored log message"""
        print(f"{color}{message}{Colors.ENDC}")

    def test_passed(self, test_name: str, details: str = ""):
        """Record passed test"""
        self.passed += 1
        self.results.append({
            "test": test_name,
            "status": "PASS",
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        self.log(f"✓ {test_name}", Colors.OKGREEN)
        if details:
            print(f"  {details}")

    def test_failed(self, test_name: str, error: str):
        """Record failed test"""
        self.failed += 1
        self.results.append({
            "test": test_name,
            "status": "FAIL",
            "error": error,
            "timestamp": datetime.now().isoformat()
        })
        self.log(f"✗ {test_name}", Colors.FAIL)
        self.log(f"  Error: {error}", Colors.WARNING)

    async def test_marketplace_list_tools(self):
        """Test marketplace tool listing"""
        try:
            # Import marketplace module
            from app.api.v1.marketplace import list_tools

            # Test listing all tools
            tools = await list_tools()

            if not isinstance(tools, list):
                raise ValueError("Expected list of tools")

            if len(tools) == 0:
                raise ValueError("No tools returned")

            # Validate tool structure
            required_fields = ["id", "name", "category", "description", "monthlyPrice", "active"]
            for tool in tools:
                missing = [f for f in required_fields if f not in tool]
                if missing:
                    raise ValueError(f"Tool missing fields: {missing}")

            self.test_passed(
                "Marketplace: List Tools",
                f"Found {len(tools)} tools: {', '.join(t['name'] for t in tools[:3])}"
            )
            return tools

        except Exception as e:
            self.test_failed("Marketplace: List Tools", str(e))
            return []

    async def test_marketplace_get_tool(self):
        """Test getting single tool details"""
        try:
            from app.api.v1.marketplace import get_tool

            # Get QuickBooks tool (ID=1)
            tool = await get_tool(1)

            if not tool:
                raise ValueError("Tool not found")

            if tool.get("name") != "QuickBooks":
                raise ValueError(f"Expected QuickBooks, got {tool.get('name')}")

            self.test_passed(
                "Marketplace: Get Tool Details",
                f"QuickBooks - ${tool.get('monthlyPrice')}/month"
            )

        except Exception as e:
            self.test_failed("Marketplace: Get Tool Details", str(e))

    async def test_marketplace_purchase(self):
        """Test tool purchase preparation"""
        try:
            from app.api.v1.marketplace import purchase_tool, PurchaseRequest

            request = PurchaseRequest(
                tool_id=1,
                wallet_address=self.test_wallet
            )

            result = await purchase_tool(request)

            if not result.get("success"):
                raise ValueError("Purchase failed")

            if not result.get("transaction"):
                raise ValueError("No transaction data returned")

            self.test_passed(
                "Marketplace: Purchase Tool",
                f"Transaction prepared for {result.get('tool_name')}"
            )

        except Exception as e:
            self.test_failed("Marketplace: Purchase Tool", str(e))

    async def test_marketplace_licenses(self):
        """Test getting user licenses"""
        try:
            from app.api.v1.marketplace import get_user_licenses

            licenses = await get_user_licenses(self.test_wallet)

            if not isinstance(licenses, list):
                raise ValueError("Expected list of licenses")

            self.test_passed(
                "Marketplace: Get Licenses",
                f"User has {len(licenses)} active license(s)"
            )

        except Exception as e:
            self.test_failed("Marketplace: Get Licenses", str(e))

    async def test_quickbooks_adapter(self):
        """Test QuickBooks adapter data generation"""
        try:
            from adapters.quickbooks.quickbooks_adapter import QuickBooksAdapter

            adapter = QuickBooksAdapter()
            result = await adapter.sync_data(self.test_wallet)

            if not result.get("success"):
                raise ValueError(f"Sync failed: {result.get('error')}")

            summary = result.get("summary", {})

            if not summary:
                raise ValueError("No summary in sync result")

            self.test_passed(
                "QuickBooks Adapter: Sync Data",
                f"Generated {summary.get('invoice_count')} invoices, "
                f"{summary.get('expense_count')} expenses, "
                f"{summary.get('customer_count')} customers"
            )

            return result

        except Exception as e:
            self.test_failed("QuickBooks Adapter: Sync Data", str(e))
            return None

    async def test_integrations_installed(self):
        """Test getting installed integrations"""
        try:
            from app.api.v1.integrations import get_installed_integrations

            result = await get_installed_integrations(wallet_address=self.test_wallet)

            if not result.get("success"):
                raise ValueError("Failed to get installed integrations")

            tools = result.get("installed_tools", [])

            self.test_passed(
                "Integrations: Get Installed",
                f"Found {len(tools)} installed tool(s)"
            )

        except Exception as e:
            self.test_failed("Integrations: Get Installed", str(e))

    async def test_integrations_schema(self):
        """Test getting tool schema"""
        try:
            from app.api.v1.integrations import get_tool_schema

            schema = await get_tool_schema("quickbooks")

            if not schema.get("success"):
                raise ValueError("Failed to get schema")

            data_types = schema.get("data_types", {})

            if not data_types:
                raise ValueError("No data types in schema")

            self.test_passed(
                "Integrations: Get Schema",
                f"QuickBooks schema has {len(data_types)} data types"
            )

        except Exception as e:
            self.test_failed("Integrations: Get Schema", str(e))

    async def test_ai_suggestions(self):
        """Test AI query suggestions"""
        try:
            from app.api.v1.ai import get_query_suggestions

            result = await get_query_suggestions(wallet_address=self.test_wallet)

            if not result.get("success"):
                raise ValueError("Failed to get suggestions")

            suggestions = result.get("suggestions", [])

            if not suggestions:
                raise ValueError("No suggestions returned")

            self.test_passed(
                "AI: Get Query Suggestions",
                f"Generated {len(suggestions)} suggested queries"
            )

        except Exception as e:
            self.test_failed("AI: Get Query Suggestions", str(e))

    async def test_imports(self):
        """Test that all modules can be imported"""
        try:
            # Test service imports
            from app.services.filecoin_service import FilecoinService
            from app.services.encryption_service import EncryptionService
            from app.services.ai_query_service import ai_query_service
            from app.services.blockchain_service import get_blockchain_service

            # Test API imports
            from app.api.v1 import marketplace, integrations, ai

            # Test adapter imports
            from adapters.quickbooks.quickbooks_adapter import QuickBooksAdapter

            self.test_passed(
                "Module Imports",
                "All modules imported successfully"
            )

        except Exception as e:
            self.test_failed("Module Imports", str(e))

    async def run_all_tests(self):
        """Run all tests"""
        self.log("\n" + "="*70, Colors.HEADER)
        self.log("GENERIC COMPANY DASHBOARD - API TEST SUITE", Colors.HEADER)
        self.log("="*70 + "\n", Colors.HEADER)

        # Test imports first
        await self.test_imports()

        # Marketplace tests
        self.log("\n📦 MARKETPLACE API TESTS", Colors.OKCYAN)
        self.log("-" * 70, Colors.OKCYAN)
        await self.test_marketplace_list_tools()
        await self.test_marketplace_get_tool()
        await self.test_marketplace_purchase()
        await self.test_marketplace_licenses()

        # QuickBooks adapter tests
        self.log("\n💼 QUICKBOOKS ADAPTER TESTS", Colors.OKCYAN)
        self.log("-" * 70, Colors.OKCYAN)
        await self.test_quickbooks_adapter()

        # Integrations tests
        self.log("\n🔗 INTEGRATIONS API TESTS", Colors.OKCYAN)
        self.log("-" * 70, Colors.OKCYAN)
        await self.test_integrations_installed()
        await self.test_integrations_schema()

        # AI tests
        self.log("\n🤖 AI CHATBOT API TESTS", Colors.OKCYAN)
        self.log("-" * 70, Colors.OKCYAN)
        await self.test_ai_suggestions()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        total = self.passed + self.failed
        pass_rate = (self.passed / total * 100) if total > 0 else 0

        self.log("\n" + "="*70, Colors.HEADER)
        self.log("TEST SUMMARY", Colors.HEADER)
        self.log("="*70, Colors.HEADER)

        self.log(f"\nTotal Tests: {total}", Colors.BOLD)
        self.log(f"Passed: {self.passed}", Colors.OKGREEN)
        self.log(f"Failed: {self.failed}", Colors.FAIL if self.failed > 0 else Colors.OKGREEN)
        self.log(f"Pass Rate: {pass_rate:.1f}%\n", Colors.OKGREEN if pass_rate >= 90 else Colors.WARNING)

        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"test_results_{timestamp}.json"

        with open(filename, 'w') as f:
            json.dump({
                "timestamp": datetime.now().isoformat(),
                "total_tests": total,
                "passed": self.passed,
                "failed": self.failed,
                "pass_rate": pass_rate,
                "results": self.results
            }, f, indent=2)

        self.log(f"Results saved to: {filename}", Colors.OKBLUE)


async def main():
    """Main test runner"""
    tester = APITester()
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
