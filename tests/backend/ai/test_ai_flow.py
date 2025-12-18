"""
Test AI Query Flow - Comprehensive Verification

Tests:
1. Ollama connection and model availability
2. Qdrant connection and health
3. RAG service initialization
4. AI query service end-to-end flow
5. Multi-tenant isolation
"""
import asyncio
import httpx
import json
from datetime import datetime


class AIFlowTester:
    """Comprehensive AI flow tester"""

    def __init__(self):
        self.ollama_url = "http://localhost:11435"
        self.qdrant_url = "http://localhost:6334"
        self.test_wallet_a = "0xTestBusinessA000000000000000000000000000001"
        self.test_wallet_b = "0xTestBusinessB000000000000000000000000000002"
        self.results = []

    def log_test(self, test_name: str, passed: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    {details}")
        self.results.append({
            "test": test_name,
            "passed": passed,
            "details": details
        })

    async def test_ollama_connection(self):
        """Test 1: Verify Ollama is running and models are loaded"""
        print("\n=== TEST 1: Ollama Connection ===")
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.ollama_url}/api/tags")

                if response.status_code == 200:
                    data = response.json()
                    models = data.get("models", [])
                    model_names = [m["name"] for m in models]

                    has_mistral = any("mistral" in name for name in model_names)
                    has_nomic = any("nomic-embed-text" in name for name in model_names)

                    self.log_test(
                        "Ollama Connection",
                        True,
                        f"Found {len(models)} models: {', '.join(model_names)}"
                    )
                    self.log_test(
                        "Mistral Model Available",
                        has_mistral,
                        "mistral:latest loaded" if has_mistral else "Missing mistral model"
                    )
                    self.log_test(
                        "Embedding Model Available",
                        has_nomic,
                        "nomic-embed-text loaded" if has_nomic else "Missing embedding model"
                    )

                    return has_mistral and has_nomic
                else:
                    self.log_test("Ollama Connection", False, f"Status: {response.status_code}")
                    return False

        except Exception as e:
            self.log_test("Ollama Connection", False, str(e))
            return False

    async def test_qdrant_connection(self):
        """Test 2: Verify Qdrant is running"""
        print("\n=== TEST 2: Qdrant Connection ===")
        try:
            async with httpx.AsyncClient() as client:
                # Test health endpoint
                response = await client.get(f"{self.qdrant_url}/health")
                health_ok = response.status_code == 200

                self.log_test(
                    "Qdrant Health",
                    health_ok,
                    "Qdrant is healthy" if health_ok else f"Status: {response.status_code}"
                )

                # Test collections endpoint
                response = await client.get(f"{self.qdrant_url}/collections")
                if response.status_code == 200:
                    data = response.json()
                    collections = data.get("result", {}).get("collections", [])

                    self.log_test(
                        "Qdrant Collections",
                        True,
                        f"Found {len(collections)} collections"
                    )

                    return True
                else:
                    self.log_test("Qdrant Collections", False, f"Status: {response.status_code}")
                    return False

        except Exception as e:
            self.log_test("Qdrant Connection", False, str(e))
            return False

    async def test_ollama_generate(self):
        """Test 3: Test Ollama text generation"""
        print("\n=== TEST 3: Ollama Text Generation ===")
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                payload = {
                    "model": "mistral",
                    "prompt": "What is 2+2? Answer in one sentence.",
                    "stream": False
                }

                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json=payload
                )

                if response.status_code == 200:
                    result = response.json()
                    generated = result.get("response", "")

                    self.log_test(
                        "Ollama Generate",
                        len(generated) > 0,
                        f"Generated {len(generated)} chars: '{generated[:100]}...'"
                    )
                    return True
                else:
                    self.log_test("Ollama Generate", False, f"Status: {response.status_code}")
                    return False

        except Exception as e:
            self.log_test("Ollama Generate", False, str(e))
            return False

    async def test_ollama_embeddings(self):
        """Test 4: Test Ollama embedding generation"""
        print("\n=== TEST 4: Ollama Embeddings ===")
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                payload = {
                    "model": "nomic-embed-text",
                    "prompt": "Hello world"
                }

                response = await client.post(
                    f"{self.ollama_url}/api/embeddings",
                    json=payload
                )

                if response.status_code == 200:
                    result = response.json()
                    embedding = result.get("embedding", [])

                    self.log_test(
                        "Ollama Embeddings",
                        len(embedding) == 768,
                        f"Generated embedding with {len(embedding)} dimensions"
                    )
                    return len(embedding) == 768
                else:
                    self.log_test("Ollama Embeddings", False, f"Status: {response.status_code}")
                    return False

        except Exception as e:
            self.log_test("Ollama Embeddings", False, str(e))
            return False

    async def test_rag_service_import(self):
        """Test 5: Test RAG service can be imported"""
        print("\n=== TEST 5: RAG Service Import ===")
        try:
            from app.services.rag_service import BusinessRAGService

            rag_service = BusinessRAGService()

            self.log_test(
                "RAG Service Import",
                rag_service is not None,
                "BusinessRAGService initialized successfully"
            )

            # Test health check
            health = await rag_service.health_check()
            self.log_test(
                "RAG Service Health",
                health,
                "RAG service is healthy" if health else "RAG service unhealthy"
            )

            return health

        except Exception as e:
            self.log_test("RAG Service Import", False, str(e))
            return False

    async def test_ai_query_service_import(self):
        """Test 6: Test AI Query Service can be imported"""
        print("\n=== TEST 6: AI Query Service Import ===")
        try:
            from app.services.ai_query_service import AIQueryService

            ai_service = AIQueryService()

            self.log_test(
                "AI Query Service Import",
                ai_service is not None,
                f"AIQueryService initialized (Ollama: {ai_service.ollama_url})"
            )

            # Test health check
            health = await ai_service.health_check()
            overall_health = health.get("healthy", False)

            self.log_test(
                "AI Query Service Health",
                overall_health,
                f"Components: Ollama={health['components']['ollama']['status']}, "
                f"RAG={health['components']['rag']['status']}"
            )

            return overall_health

        except Exception as e:
            self.log_test("AI Query Service Import", False, str(e))
            return False

    async def test_rag_collection_creation(self):
        """Test 7: Test RAG collection creation for businesses"""
        print("\n=== TEST 7: RAG Collection Creation ===")
        try:
            from app.services.rag_service import BusinessRAGService

            rag_service = BusinessRAGService()

            # Create collections for both test wallets
            collection_a = await rag_service.create_business_collection(self.test_wallet_a)
            collection_b = await rag_service.create_business_collection(self.test_wallet_b)

            self.log_test(
                "Create Collection A",
                collection_a,
                f"Collection created for {self.test_wallet_a[:10]}..."
            )

            self.log_test(
                "Create Collection B",
                collection_b,
                f"Collection created for {self.test_wallet_b[:10]}..."
            )

            return collection_a and collection_b

        except Exception as e:
            self.log_test("RAG Collection Creation", False, str(e))
            return False

    async def test_rag_indexing(self):
        """Test 8: Test indexing data into RAG"""
        print("\n=== TEST 8: RAG Data Indexing ===")
        try:
            from app.services.rag_service import BusinessRAGService

            rag_service = BusinessRAGService()

            # Index sample data for Business A
            test_data_a = {
                "type": "invoice",
                "customer": "ACME Corp",
                "amount": 5000,
                "status": "paid",
                "date": "2025-11-15"
            }

            point_id_a = await rag_service.index_business_data(
                business_wallet=self.test_wallet_a,
                cid="QmTestCID123",
                data=test_data_a,
                integration="quickbooks",
                data_type="invoices"
            )

            self.log_test(
                "Index Business A Data",
                point_id_a is not None,
                f"Indexed invoice for Business A: {point_id_a}"
            )

            # Index different data for Business B
            test_data_b = {
                "type": "expense",
                "vendor": "Office Supplies Inc",
                "amount": 500,
                "category": "office",
                "date": "2025-11-16"
            }

            point_id_b = await rag_service.index_business_data(
                business_wallet=self.test_wallet_b,
                cid="QmTestCID456",
                data=test_data_b,
                integration="quickbooks",
                data_type="expenses"
            )

            self.log_test(
                "Index Business B Data",
                point_id_b is not None,
                f"Indexed expense for Business B: {point_id_b}"
            )

            return point_id_a is not None and point_id_b is not None

        except Exception as e:
            self.log_test("RAG Data Indexing", False, str(e))
            return False

    async def test_rag_query_isolation(self):
        """Test 9: Test that Business A cannot access Business B's data"""
        print("\n=== TEST 9: Multi-Tenant Isolation ===")
        try:
            from app.services.rag_service import BusinessRAGService

            rag_service = BusinessRAGService()

            # Business A queries for invoices (should find their invoice, not B's expense)
            results_a = await rag_service.query_business_rag(
                business_wallet=self.test_wallet_a,
                query="Show me invoices from ACME Corp",
                limit=10
            )

            # Check that Business A got results
            has_results_a = len(results_a) > 0

            # Verify the results are from Business A's collection only
            isolation_ok = True
            for result in results_a:
                if result.get("data", {}).get("type") == "expense":
                    isolation_ok = False  # Found Business B's expense in A's results!
                    break

            self.log_test(
                "Business A Query",
                has_results_a and isolation_ok,
                f"Found {len(results_a)} results for Business A (isolation OK: {isolation_ok})"
            )

            # Business B queries for expenses (should find their expense, not A's invoice)
            results_b = await rag_service.query_business_rag(
                business_wallet=self.test_wallet_b,
                query="Show me office expenses",
                limit=10
            )

            has_results_b = len(results_b) > 0

            # Verify Business B's isolation
            isolation_b_ok = True
            for result in results_b:
                if result.get("data", {}).get("type") == "invoice":
                    isolation_b_ok = False  # Found Business A's invoice in B's results!
                    break

            self.log_test(
                "Business B Query",
                has_results_b and isolation_b_ok,
                f"Found {len(results_b)} results for Business B (isolation OK: {isolation_b_ok})"
            )

            # Final isolation check
            full_isolation = has_results_a and isolation_ok and has_results_b and isolation_b_ok

            self.log_test(
                "Multi-Tenant Isolation",
                full_isolation,
                "✅ CRITICAL: Business A and B data are properly isolated" if full_isolation
                else "❌ CRITICAL: Data leakage detected!"
            )

            return full_isolation

        except Exception as e:
            self.log_test("Multi-Tenant Isolation", False, str(e))
            return False

    async def test_ollama_business_service(self):
        """Test 10: Test full AI query with RAG context"""
        print("\n=== TEST 10: End-to-End AI Query ===")
        try:
            from app.services.ollama_service import OllamaBusinessService

            ollama_service = OllamaBusinessService()

            # Business A asks about their invoice
            result_a = await ollama_service.query_business_ai(
                business_wallet=self.test_wallet_a,
                user_query="What invoices do I have from ACME Corp?",
                max_context_items=5
            )

            has_answer_a = len(result_a.get("answer", "")) > 0
            has_context_a = result_a.get("context_used", False)

            self.log_test(
                "Business A AI Query",
                has_answer_a,
                f"Generated {len(result_a['answer'])} char response, "
                f"context_used={has_context_a}, sources={len(result_a['sources'])}"
            )

            # Business B asks about their expenses
            result_b = await ollama_service.query_business_ai(
                business_wallet=self.test_wallet_b,
                user_query="What office expenses do I have?",
                max_context_items=5
            )

            has_answer_b = len(result_b.get("answer", "")) > 0
            has_context_b = result_b.get("context_used", False)

            self.log_test(
                "Business B AI Query",
                has_answer_b,
                f"Generated {len(result_b['answer'])} char response, "
                f"context_used={has_context_b}, sources={len(result_b['sources'])}"
            )

            return has_answer_a and has_answer_b

        except Exception as e:
            self.log_test("End-to-End AI Query", False, str(e))
            return False

    async def run_all_tests(self):
        """Run all tests in sequence"""
        print("=" * 60)
        print("AI CHATBOT & RAG VERIFICATION TEST SUITE")
        print("=" * 60)

        # Infrastructure tests
        await self.test_ollama_connection()
        await self.test_qdrant_connection()
        await self.test_ollama_generate()
        await self.test_ollama_embeddings()

        # Service tests
        await self.test_rag_service_import()
        await self.test_ai_query_service_import()

        # RAG functionality tests
        await self.test_rag_collection_creation()
        await self.test_rag_indexing()
        await self.test_rag_query_isolation()

        # End-to-end test
        await self.test_ollama_business_service()

        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)

        passed = sum(1 for r in self.results if r["passed"])
        total = len(self.results)

        print(f"\nTotal Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")

        # Failed tests detail
        failed_tests = [r for r in self.results if not r["passed"]]
        if failed_tests:
            print("\n❌ FAILED TESTS:")
            for test in failed_tests:
                print(f"  - {test['test']}: {test['details']}")
        else:
            print("\n✅ ALL TESTS PASSED!")

        print("\n" + "=" * 60)

        return passed == total


async def main():
    """Run the test suite"""
    tester = AIFlowTester()
    success = await tester.run_all_tests()

    if success:
        print("\n✅ AI CHATBOT & RAG SYSTEM: FULLY FUNCTIONAL")
        return 0
    else:
        print("\n❌ AI CHATBOT & RAG SYSTEM: ISSUES DETECTED")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
