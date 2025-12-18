"""
AI Chat Endpoint Testing with Generic Business Queries
Tests 50 generic business queries + 30 RAG queries

This script tests AI chat functionality with GENERIC questions applicable
to ANY business in ANY industry (NOT industry-specific).
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List, Any

# Generic Business Queries (50 total)
GENERIC_BUSINESS_QUERIES = [
    # Financial Management (10 queries)
    "What are my top business expenses this month?",
    "Show me revenue trends for the past quarter",
    "How do I calculate my profit margins?",
    "What are the best practices for managing cash flow?",
    "How can I reduce operational costs?",
    "What KPIs should I track for my business?",
    "How do I create a business budget?",
    "What is the difference between revenue and profit?",
    "What are common business tax deductions?",
    "How can I improve my business profitability?",

    # Customer Management (10 queries)
    "How can I improve customer retention?",
    "What are effective strategies for customer acquisition?",
    "How do I handle customer complaints effectively?",
    "What are the best customer service practices?",
    "How can I increase customer satisfaction?",
    "What metrics indicate customer loyalty?",
    "How do I analyze customer feedback?",
    "What are common customer pain points?",
    "How can I personalize customer experiences?",
    "What are the benefits of customer relationship management?",

    # Operations & Productivity (10 queries)
    "What are the best practices for inventory management?",
    "How can I improve employee productivity?",
    "How can I automate business processes?",
    "What are effective supply chain strategies?",
    "How do I optimize business workflows?",
    "What tools help with project management?",
    "How can I reduce waste in operations?",
    "What are lean business principles?",
    "How do I measure operational efficiency?",
    "What are the benefits of process automation?",

    # Marketing & Growth (10 queries)
    "What are effective marketing strategies for small businesses?",
    "How can I improve my online presence?",
    "What are the benefits of email marketing?",
    "How do I analyze competitor pricing?",
    "What are effective social media strategies?",
    "How can I increase website traffic?",
    "What are the advantages of content marketing?",
    "How do I measure marketing ROI?",
    "What are effective brand building strategies?",
    "How can I reach new customer segments?",

    # Technology & Tools (10 queries)
    "What are the benefits of cloud storage for businesses?",
    "How can I improve data security?",
    "What tools help with business analytics?",
    "How do I choose the right software for my business?",
    "What are the advantages of subscription pricing?",
    "How can I protect against cyber threats?",
    "What are the benefits of mobile apps for business?",
    "How do I implement remote work policies?",
    "What tools help with team collaboration?",
    "How can I leverage AI for business growth?",
]

# Generic RAG Document Queries (30 total)
GENERIC_RAG_QUERIES = [
    # Document Search (15 queries)
    "What documents do I have about employee policies?",
    "Find information about business insurance",
    "Search for vendor contracts",
    "What are our standard operating procedures?",
    "Find customer feedback data",
    "Show me documents about office lease agreements",
    "What training materials do we have?",
    "Find information about business licenses",
    "Search for equipment maintenance records",
    "What marketing materials do we have?",
    "Find documents about supplier agreements",
    "What safety procedures are documented?",
    "Show me employee handbook information",
    "Find information about warranty policies",
    "Search for business continuity plans",

    # Data Analysis (15 queries)
    "Analyze sales trends from our documents",
    "What insights can you find in customer data?",
    "Summarize our business performance reports",
    "What patterns exist in our transaction history?",
    "Analyze employee performance metrics",
    "What do our survey results indicate?",
    "Summarize vendor performance data",
    "What trends exist in our expense reports?",
    "Analyze customer service ticket data",
    "What insights are in our meeting notes?",
    "Summarize quarterly review documents",
    "What patterns exist in our inventory data?",
    "Analyze our marketing campaign results",
    "What do our financial statements show?",
    "Summarize competitive analysis documents",
]


class AIEndpointTester:
    """Test AI chat endpoints with generic business queries"""

    def __init__(self, base_url: str = "http://localhost:8001"):
        self.base_url = base_url
        self.results = {
            "chat_endpoint": [],
            "query_endpoint": [],
            "timestamp": datetime.now().isoformat(),
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
        }
        self.test_wallet = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"

    async def test_ai_chat_endpoint(self, query: str) -> Dict[str, Any]:
        """Test /api/v1/ai/chat endpoint"""
        url = f"{self.base_url}/api/v1/ai/chat"

        payload = {
            "message": query,
            "wallet": self.test_wallet,
            "use_rag": False
        }

        start_time = datetime.now()

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    status = response.status
                    response_data = await response.json()

                    processing_time = (datetime.now() - start_time).total_seconds()

                    success = (
                        status == 200 and
                        "response" in response_data and
                        len(response_data.get("response", "")) > 0
                    )

                    return {
                        "query": query,
                        "status_code": status,
                        "success": success,
                        "processing_time_seconds": processing_time,
                        "response_length": len(response_data.get("response", "")),
                        "error": response_data.get("error") if not success else None
                    }

        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            return {
                "query": query,
                "status_code": 0,
                "success": False,
                "processing_time_seconds": processing_time,
                "response_length": 0,
                "error": str(e)
            }

    async def test_ai_query_endpoint(self, query: str) -> Dict[str, Any]:
        """Test /api/v1/ai/query endpoint (with RAG)"""
        url = f"{self.base_url}/api/v1/ai/query"

        payload = {
            "query": query,
            "wallet": self.test_wallet,
            "use_rag": True,
            "log_to_blockchain": False
        }

        start_time = datetime.now()

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60)
                ) as response:
                    status = response.status
                    response_data = await response.json()

                    processing_time = (datetime.now() - start_time).total_seconds()

                    success = (
                        status == 200 and
                        response_data.get("success") == True and
                        "response" in response_data and
                        len(response_data.get("response", "")) > 0
                    )

                    return {
                        "query": query,
                        "status_code": status,
                        "success": success,
                        "processing_time_seconds": processing_time,
                        "response_length": len(response_data.get("response", "")),
                        "rag_used": response_data.get("metadata", {}).get("rag_used", False),
                        "error": response_data.get("error") if not success else None
                    }

        except Exception as e:
            processing_time = (datetime.now() - start_time).total_seconds()
            return {
                "query": query,
                "status_code": 0,
                "success": False,
                "processing_time_seconds": processing_time,
                "response_length": 0,
                "rag_used": False,
                "error": str(e)
            }

    async def run_all_tests(self):
        """Run all AI endpoint tests"""
        print("=" * 80)
        print("AI CHAT ENDPOINT TESTING - GENERIC BUSINESS QUERIES")
        print("=" * 80)
        print(f"Test Wallet: {self.test_wallet}")
        print(f"Base URL: {self.base_url}")
        print(f"Timestamp: {self.results['timestamp']}")
        print()

        # Test 1: AI Chat Endpoint (50 queries)
        print("TEST 1: AI Chat Endpoint (/api/v1/ai/chat)")
        print("-" * 80)
        print(f"Testing {len(GENERIC_BUSINESS_QUERIES)} generic business queries...")
        print()

        for i, query in enumerate(GENERIC_BUSINESS_QUERIES, 1):
            print(f"[{i}/{len(GENERIC_BUSINESS_QUERIES)}] Testing: {query[:60]}...")
            result = await self.test_ai_chat_endpoint(query)
            self.results["chat_endpoint"].append(result)

            if result["success"]:
                print(f"    ✅ SUCCESS - {result['processing_time_seconds']:.2f}s, "
                      f"{result['response_length']} chars")
                self.results["passed_tests"] += 1
            else:
                print(f"    ❌ FAILED - {result.get('error', 'Unknown error')}")
                self.results["failed_tests"] += 1

            self.results["total_tests"] += 1

            # Small delay to avoid overwhelming the service
            await asyncio.sleep(0.5)

        print()

        # Test 2: AI Query Endpoint with RAG (30 queries)
        print("TEST 2: AI Query Endpoint with RAG (/api/v1/ai/query)")
        print("-" * 80)
        print(f"Testing {len(GENERIC_RAG_QUERIES)} generic RAG queries...")
        print()

        for i, query in enumerate(GENERIC_RAG_QUERIES, 1):
            print(f"[{i}/{len(GENERIC_RAG_QUERIES)}] Testing: {query[:60]}...")
            result = await self.test_ai_query_endpoint(query)
            self.results["query_endpoint"].append(result)

            if result["success"]:
                rag_status = "✅ RAG USED" if result["rag_used"] else "⚠️  NO RAG"
                print(f"    ✅ SUCCESS - {result['processing_time_seconds']:.2f}s, "
                      f"{result['response_length']} chars, {rag_status}")
                self.results["passed_tests"] += 1
            else:
                print(f"    ❌ FAILED - {result.get('error', 'Unknown error')}")
                self.results["failed_tests"] += 1

            self.results["total_tests"] += 1

            # Small delay to avoid overwhelming the service
            await asyncio.sleep(0.5)

        # Generate summary
        self.generate_summary()

    def generate_summary(self):
        """Generate test summary and save results"""
        print()
        print("=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)

        # Overall stats
        success_rate = (self.results["passed_tests"] / self.results["total_tests"] * 100) if self.results["total_tests"] > 0 else 0

        print(f"Total Tests: {self.results['total_tests']}")
        print(f"Passed: {self.results['passed_tests']}")
        print(f"Failed: {self.results['failed_tests']}")
        print(f"Success Rate: {success_rate:.2f}%")
        print()

        # Chat endpoint stats
        chat_passed = sum(1 for r in self.results["chat_endpoint"] if r["success"])
        chat_total = len(self.results["chat_endpoint"])
        chat_avg_time = sum(r["processing_time_seconds"] for r in self.results["chat_endpoint"]) / chat_total if chat_total > 0 else 0

        print("AI CHAT ENDPOINT (/api/v1/ai/chat):")
        print(f"  Tests: {chat_passed}/{chat_total} passed ({chat_passed/chat_total*100:.2f}%)")
        print(f"  Avg Response Time: {chat_avg_time:.2f}s")
        print()

        # Query endpoint stats
        query_passed = sum(1 for r in self.results["query_endpoint"] if r["success"])
        query_total = len(self.results["query_endpoint"])
        query_avg_time = sum(r["processing_time_seconds"] for r in self.results["query_endpoint"]) / query_total if query_total > 0 else 0
        rag_used_count = sum(1 for r in self.results["query_endpoint"] if r.get("rag_used", False))

        print("AI QUERY ENDPOINT (/api/v1/ai/query):")
        print(f"  Tests: {query_passed}/{query_total} passed ({query_passed/query_total*100:.2f}%)")
        print(f"  Avg Response Time: {query_avg_time:.2f}s")
        print(f"  RAG Used: {rag_used_count}/{query_total} queries")
        print()

        # Ollama connectivity status
        ollama_healthy = chat_passed > 0 or query_passed > 0
        print(f"OLLAMA CONNECTIVITY: {'✅ HEALTHY' if ollama_healthy else '❌ UNHEALTHY'}")
        print(f"QDRANT VECTOR DB: {'✅ HEALTHY' if rag_used_count > 0 else '⚠️  NOT VERIFIED'}")
        print()

        # Save results to JSON
        output_file = "ai_chat_test_results.json"
        with open(output_file, "w") as f:
            json.dump(self.results, f, indent=2)

        print(f"Detailed results saved to: {output_file}")
        print()

        # Final status
        if success_rate == 100:
            print("🎉 ALL TESTS PASSED! AI CHAT ENDPOINTS FULLY FUNCTIONAL!")
        elif success_rate >= 80:
            print("✅ TESTS MOSTLY PASSED - AI chat endpoints working with some issues")
        elif success_rate >= 50:
            print("⚠️  TESTS PARTIALLY PASSED - AI chat endpoints have significant issues")
        else:
            print("❌ TESTS FAILED - AI chat endpoints are not working properly")

        print("=" * 80)


async def main():
    """Main test execution"""
    tester = AIEndpointTester(base_url="http://localhost:8001")
    await tester.run_all_tests()


if __name__ == "__main__":
    asyncio.run(main())
