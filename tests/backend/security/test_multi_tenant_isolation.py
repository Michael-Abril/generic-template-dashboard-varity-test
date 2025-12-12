#!/usr/bin/env python3
"""
Multi-Tenant RAG Infrastructure Test Script

This test demonstrates complete business isolation:
- Business A uploads data to Filecoin → indexed in Qdrant collection A
- Business B uploads data to Filecoin → indexed in Qdrant collection B
- Business A queries AI → gets ONLY Business A's data
- Business B queries AI → gets ONLY Business B's data
- Business A CANNOT access Business B's data (and vice versa)

Run this test to verify multi-tenant architecture is working correctly.
"""
import asyncio
import json
import sys
import os
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.filecoin_service import FilecoinMultiTenantService
from app.services.rag_service import BusinessRAGService
from app.services.ollama_service import OllamaBusinessService
from app.services.encryption_service import EncryptionService


# Test wallets
BUSINESS_A_WALLET = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
BUSINESS_B_WALLET = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
BUSINESS_C_WALLET = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"

# Test data
BUSINESS_A_DATA = {
    "company": "Acme Corp",
    "industry": "Manufacturing",
    "revenue": "$5M",
    "employees": 50,
    "products": ["Widget A", "Widget B", "Widget C"],
    "top_customer": "BigBox Retail",
    "recent_sales": [
        {"product": "Widget A", "amount": "$50,000", "customer": "BigBox Retail"},
        {"product": "Widget B", "amount": "$30,000", "customer": "SmallMart"}
    ]
}

BUSINESS_B_DATA = {
    "company": "TechStart Inc",
    "industry": "SaaS",
    "revenue": "$2M",
    "employees": 15,
    "products": ["CloudSync Pro", "DataVault"],
    "top_customer": "Enterprise Corp",
    "recent_sales": [
        {"product": "CloudSync Pro", "amount": "$100,000", "customer": "Enterprise Corp"},
        {"product": "DataVault", "amount": "$75,000", "customer": "FinTech LLC"}
    ]
}

BUSINESS_C_DATA = {
    "company": "Restaurant Group LLC",
    "industry": "Food Service",
    "revenue": "$8M",
    "employees": 120,
    "locations": ["Downtown", "Uptown", "Beachside"],
    "top_menu_items": ["Signature Burger", "Truffle Fries", "Craft Beer"],
    "recent_orders": [
        {"item": "Signature Burger", "quantity": 500, "revenue": "$7,500"},
        {"item": "Truffle Fries", "quantity": 300, "revenue": "$3,000"}
    ]
}


class MultiTenantTest:
    """Multi-tenant isolation test suite"""

    def __init__(self):
        self.filecoin_service = FilecoinMultiTenantService()
        self.rag_service = BusinessRAGService()
        self.ollama_service = OllamaBusinessService()
        self.encryption_service = EncryptionService()

        self.results = {
            "passed": [],
            "failed": [],
            "total_tests": 0
        }

    def log(self, message: str, level: str = "INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        prefix = {
            "INFO": "ℹ️ ",
            "SUCCESS": "✅",
            "ERROR": "❌",
            "WARNING": "⚠️ "
        }.get(level, "")
        print(f"[{timestamp}] {prefix} {message}")

    async def test_1_health_checks(self):
        """Test 1: Verify all services are healthy"""
        self.log("TEST 1: Health Checks", "INFO")
        self.results["total_tests"] += 1

        try:
            # Check Qdrant
            qdrant_healthy = await self.rag_service.health_check()
            if not qdrant_healthy:
                raise Exception("Qdrant is not healthy")

            # Check Ollama + Qdrant together
            health = await self.ollama_service.health_check()
            if not health["overall"]:
                raise Exception(f"Services unhealthy: {health}")

            self.log("All services are healthy", "SUCCESS")
            self.results["passed"].append("Health checks")
            return True

        except Exception as e:
            self.log(f"Health check failed: {e}", "ERROR")
            self.results["failed"].append(f"Health checks: {e}")
            return False

    async def test_2_upload_and_index_business_data(self):
        """Test 2: Upload and index data for three businesses"""
        self.log("TEST 2: Upload and Index Business Data", "INFO")
        self.results["total_tests"] += 1

        try:
            businesses = [
                (BUSINESS_A_WALLET, BUSINESS_A_DATA, "Acme Corp"),
                (BUSINESS_B_WALLET, BUSINESS_B_DATA, "TechStart Inc"),
                (BUSINESS_C_WALLET, BUSINESS_C_DATA, "Restaurant Group LLC")
            ]

            cids = {}

            for wallet, data, name in businesses:
                self.log(f"Uploading data for {name} ({wallet[:10]}...)")

                # Encrypt data
                encrypted = await self.encryption_service.encrypt_with_wallet(
                    data=json.dumps(data),
                    customer_wallet=wallet
                )

                # Upload to Filecoin
                cid = await self.filecoin_service.upload_business_data(
                    business_wallet=wallet,
                    integration="quickbooks",
                    data_type="company_info",
                    data=data,
                    encrypted_data=encrypted
                )

                self.log(f"  → Uploaded to Filecoin: CID={cid}")

                # Index in Qdrant
                point_id = await self.rag_service.index_business_data(
                    business_wallet=wallet,
                    cid=cid,
                    data=data,
                    integration="quickbooks",
                    data_type="company_info"
                )

                self.log(f"  → Indexed in Qdrant: point_id={point_id}")
                cids[wallet] = cid

            self.log(f"Successfully indexed data for {len(businesses)} businesses", "SUCCESS")
            self.results["passed"].append("Data upload and indexing")
            return cids

        except Exception as e:
            self.log(f"Data upload/indexing failed: {e}", "ERROR")
            self.results["failed"].append(f"Data upload/indexing: {e}")
            return None

    async def test_3_verify_collection_isolation(self):
        """Test 3: Verify each business has isolated Qdrant collection"""
        self.log("TEST 3: Verify Collection Isolation", "INFO")
        self.results["total_tests"] += 1

        try:
            for wallet, name in [
                (BUSINESS_A_WALLET, "Acme Corp"),
                (BUSINESS_B_WALLET, "TechStart Inc"),
                (BUSINESS_C_WALLET, "Restaurant Group LLC")
            ]:
                stats = await self.rag_service.get_collection_stats(wallet)

                if not stats["exists"]:
                    raise Exception(f"Collection for {name} doesn't exist")

                if stats["count"] < 1:
                    raise Exception(f"Collection for {name} has no data")

                self.log(f"  → {name}: {stats['count']} documents indexed")

            self.log("All businesses have isolated collections", "SUCCESS")
            self.results["passed"].append("Collection isolation")
            return True

        except Exception as e:
            self.log(f"Collection isolation verification failed: {e}", "ERROR")
            self.results["failed"].append(f"Collection isolation: {e}")
            return False

    async def test_4_business_a_queries_own_data(self):
        """Test 4: Business A queries and gets ONLY Business A's data"""
        self.log("TEST 4: Business A Queries Own Data", "INFO")
        self.results["total_tests"] += 1

        try:
            query = "What are my top products?"

            result = await self.ollama_service.query_business_ai(
                business_wallet=BUSINESS_A_WALLET,
                user_query=query
            )

            answer = result["answer"].lower()

            # Check that answer contains Business A's products
            if "widget" not in answer:
                raise Exception(f"Answer doesn't mention Business A's products: {answer[:200]}")

            # Check that answer does NOT contain Business B's products
            if "cloudsync" in answer or "datavault" in answer:
                raise Exception(f"Answer incorrectly contains Business B's data: {answer[:200]}")

            # Check that answer does NOT contain Business C's data
            if "burger" in answer or "fries" in answer or "restaurant" in answer:
                raise Exception(f"Answer incorrectly contains Business C's data: {answer[:200]}")

            self.log(f"  → Query: {query}")
            self.log(f"  → Answer contains Business A's data only", "SUCCESS")
            self.results["passed"].append("Business A data isolation")
            return True

        except Exception as e:
            self.log(f"Business A query failed: {e}", "ERROR")
            self.results["failed"].append(f"Business A query: {e}")
            return False

    async def test_5_business_b_queries_own_data(self):
        """Test 5: Business B queries and gets ONLY Business B's data"""
        self.log("TEST 5: Business B Queries Own Data", "INFO")
        self.results["total_tests"] += 1

        try:
            query = "What software products do I sell?"

            result = await self.ollama_service.query_business_ai(
                business_wallet=BUSINESS_B_WALLET,
                user_query=query
            )

            answer = result["answer"].lower()

            # Check that answer contains Business B's products
            if "cloudsync" not in answer and "datavault" not in answer:
                raise Exception(f"Answer doesn't mention Business B's products: {answer[:200]}")

            # Check that answer does NOT contain Business A's products
            if "widget" in answer:
                raise Exception(f"Answer incorrectly contains Business A's data: {answer[:200]}")

            # Check that answer does NOT contain Business C's data
            if "burger" in answer or "restaurant" in answer:
                raise Exception(f"Answer incorrectly contains Business C's data: {answer[:200]}")

            self.log(f"  → Query: {query}")
            self.log(f"  → Answer contains Business B's data only", "SUCCESS")
            self.results["passed"].append("Business B data isolation")
            return True

        except Exception as e:
            self.log(f"Business B query failed: {e}", "ERROR")
            self.results["failed"].append(f"Business B query: {e}")
            return False

    async def test_6_cross_business_access_denied(self):
        """Test 6: Verify Business A cannot access Business B's Filecoin data"""
        self.log("TEST 6: Cross-Business Access Control", "INFO")
        self.results["total_tests"] += 1

        try:
            # Get Business B's files
            business_b_files = await self.filecoin_service.query_business_data(
                business_wallet=BUSINESS_B_WALLET
            )

            if not business_b_files:
                raise Exception("No Business B files found")

            business_b_cid = business_b_files[0]["cid"]

            # Try to retrieve Business B's data with Business A's wallet
            retrieved_data = await self.filecoin_service.retrieve_business_data(
                business_wallet=BUSINESS_A_WALLET,
                cid=business_b_cid
            )

            # Should return None (access denied)
            if retrieved_data is not None:
                raise Exception("Business A was able to access Business B's data!")

            self.log("  → Cross-business access correctly denied", "SUCCESS")
            self.results["passed"].append("Cross-business access control")
            return True

        except Exception as e:
            if "access correctly denied" in str(e):
                # This is actually a pass
                self.log(str(e), "SUCCESS")
                self.results["passed"].append("Cross-business access control")
                return True
            else:
                self.log(f"Access control test failed: {e}", "ERROR")
                self.results["failed"].append(f"Access control: {e}")
                return False

    async def test_7_rag_stats_verification(self):
        """Test 7: Verify RAG stats for all businesses"""
        self.log("TEST 7: RAG Statistics Verification", "INFO")
        self.results["total_tests"] += 1

        try:
            for wallet, name in [
                (BUSINESS_A_WALLET, "Acme Corp"),
                (BUSINESS_B_WALLET, "TechStart Inc"),
                (BUSINESS_C_WALLET, "Restaurant Group LLC")
            ]:
                stats = await self.rag_service.get_collection_stats(wallet)
                self.log(f"  → {name}: {stats['count']} docs, status={stats['status']}")

            self.log("RAG stats verified for all businesses", "SUCCESS")
            self.results["passed"].append("RAG stats verification")
            return True

        except Exception as e:
            self.log(f"RAG stats verification failed: {e}", "ERROR")
            self.results["failed"].append(f"RAG stats: {e}")
            return False

    async def run_all_tests(self):
        """Run complete test suite"""
        self.log("=" * 60)
        self.log("MULTI-TENANT RAG INFRASTRUCTURE TEST SUITE")
        self.log("=" * 60)
        self.log("")

        # Run tests sequentially
        await self.test_1_health_checks()
        await self.test_2_upload_and_index_business_data()
        await self.test_3_verify_collection_isolation()
        await self.test_4_business_a_queries_own_data()
        await self.test_5_business_b_queries_own_data()
        await self.test_6_cross_business_access_denied()
        await self.test_7_rag_stats_verification()

        # Print summary
        self.log("")
        self.log("=" * 60)
        self.log("TEST SUMMARY")
        self.log("=" * 60)
        self.log(f"Total Tests: {self.results['total_tests']}")
        self.log(f"Passed: {len(self.results['passed'])}", "SUCCESS")
        self.log(f"Failed: {len(self.results['failed'])}", "ERROR" if self.results['failed'] else "INFO")

        if self.results["passed"]:
            self.log("")
            self.log("Passed Tests:", "SUCCESS")
            for test in self.results["passed"]:
                self.log(f"  ✓ {test}")

        if self.results["failed"]:
            self.log("")
            self.log("Failed Tests:", "ERROR")
            for test in self.results["failed"]:
                self.log(f"  ✗ {test}")

        self.log("")
        if len(self.results["passed"]) == self.results["total_tests"]:
            self.log("ALL TESTS PASSED! Multi-tenant isolation is working correctly.", "SUCCESS")
            return 0
        else:
            self.log("SOME TESTS FAILED. Review errors above.", "ERROR")
            return 1


async def main():
    """Main test runner"""
    test_suite = MultiTenantTest()
    exit_code = await test_suite.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
