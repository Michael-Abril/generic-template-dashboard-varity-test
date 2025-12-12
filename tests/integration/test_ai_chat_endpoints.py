#!/usr/bin/env python3
"""
AI Chat Endpoints Testing Script
Tests both /api/v1/ai/chat and /api/v1/ai/query endpoints
"""

import requests
import json
import time
from datetime import datetime

# Test configuration
BASE_URL = "http://localhost:8001"
TEST_WALLET = "0x1234567890123456789012345678901234567890"

# Test queries for chat endpoint
CHAT_QUERIES = [
    "What is the total transaction volume for merchant ID 12345?",
    "Show me the top 5 performing merchants this month",
    "What are the recent compliance alerts?",
    "Generate a revenue forecast for next quarter",
    "How many active merchants do we have?",
    "What is the average transaction size?",
    "Show me sales rep leaderboard",
    "Which merchants have declining transactions?",
    "What are the most common transaction types?",
    "Analyze merchant churn rate",
    "What percentage of merchants are compliant?",
    "Show processing volume trends",
    "Which sales reps need training?",
    "What is the average residual per merchant?",
    "Identify high-risk merchants",
    "What are peak transaction hours?",
    "Show me merchant retention rate",
    "Which industries have highest volume?",
    "What is our total monthly revenue?",
    "Analyze failed transaction patterns",
    "What are the top revenue-generating merchants?",
    "Show me new merchant onboarding stats",
    "Which merchants need portfolio reviews?",
    "What is the average time to first transaction?",
    "Analyze chargebacks by merchant category",
    "Show me merchant lifetime value",
    "What are the most profitable merchant sizes?",
    "Identify merchants at risk of leaving",
    "What is our merchant acquisition cost?",
    "Show revenue per sales rep",
    "Which merchants increased volume recently?",
    "What are common reasons for merchant exits?",
    "Analyze transaction approval rates",
    "Show me seasonal transaction patterns",
    "Which products have highest usage?",
    "What is our net promoter score?",
    "Identify underperforming sales territories",
    "Show me merchant segmentation analysis",
    "What are key drivers of merchant satisfaction?",
    "Analyze payment method preferences",
    "Show me fraud detection metrics",
    "Which merchants need compliance training?",
    "What is the average merchant onboarding time?",
    "Show me transaction dispute trends",
    "Analyze merchant support ticket patterns",
    "What are the top merchant pain points?",
    "Show me API integration success rates",
    "Which features drive merchant engagement?",
    "What is our average response time?",
    "Analyze merchant communication preferences"
]

# Test queries for RAG endpoint
RAG_QUERIES = [
    "What are PCI compliance requirements?",
    "How do I onboard a new merchant?",
    "What is the residual calculation formula?",
    "Explain transaction processing flow",
    "What are the merchant risk categories?",
    "How does chargeback management work?",
    "What are ACH payment processing requirements?",
    "Explain sales commission structure",
    "What are KYC verification steps?",
    "How to handle merchant disputes?",
    "What are fraud prevention best practices?",
    "Explain merchant pricing tiers",
    "What are integration API endpoints?",
    "How to process refunds?",
    "What are compliance monitoring procedures?",
    "Explain merchant underwriting process",
    "What are payment gateway options?",
    "How to manage merchant relationships?",
    "What are transaction reporting requirements?",
    "Explain revenue sharing model?",
    "What are merchant support escalation procedures?",
    "How to configure payment terminals?",
    "What are security best practices?",
    "Explain merchant lifecycle management",
    "What are data retention policies?",
    "How to handle high-risk merchants?",
    "What are settlement timeframes?",
    "Explain multi-currency processing",
    "What are merchant communication templates?",
    "How to optimize transaction routing?"
]

def test_ai_chat(query: str, index: int) -> dict:
    """Test the AI chat endpoint"""
    url = f"{BASE_URL}/api/v1/ai/chat"
    payload = {
        "message": query,
        "wallet_address": TEST_WALLET,
        "use_rag": True
    }

    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=60)
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            return {
                "index": index,
                "success": True,
                "status_code": response.status_code,
                "response_time": round(elapsed * 1000, 2),
                "query": query[:50] + "...",
                "response_length": len(data.get("response", "")),
                "error": None
            }
        else:
            return {
                "index": index,
                "success": False,
                "status_code": response.status_code,
                "response_time": round(elapsed * 1000, 2),
                "query": query[:50] + "...",
                "error": response.text[:200]
            }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "index": index,
            "success": False,
            "status_code": None,
            "response_time": round(elapsed * 1000, 2),
            "query": query[:50] + "...",
            "error": str(e)[:200]
        }

def test_ai_query(query: str, index: int) -> dict:
    """Test the AI query/RAG endpoint"""
    url = f"{BASE_URL}/api/v1/ai/query"
    payload = {
        "query": query,
        "wallet_address": TEST_WALLET,
        "tools": ["quickbooks"]
    }

    start_time = time.time()
    try:
        response = requests.post(url, json=payload, timeout=60)
        elapsed = time.time() - start_time

        if response.status_code == 200:
            data = response.json()
            return {
                "index": index,
                "success": True,
                "status_code": response.status_code,
                "response_time": round(elapsed * 1000, 2),
                "query": query[:50] + "...",
                "response_length": len(data.get("response", "")),
                "rag_used": data.get("metadata", {}).get("rag_used", False),
                "error": None
            }
        else:
            return {
                "index": index,
                "success": False,
                "status_code": response.status_code,
                "response_time": round(elapsed * 1000, 2),
                "query": query[:50] + "...",
                "error": response.text[:200]
            }
    except Exception as e:
        elapsed = time.time() - start_time
        return {
            "index": index,
            "success": False,
            "status_code": None,
            "response_time": round(elapsed * 1000, 2),
            "query": query[:50] + "...",
            "error": str(e)[:200]
        }

def main():
    print("=" * 80)
    print("AI CHAT ENDPOINTS TEST - OLLAMA CONNECTIVITY VALIDATION")
    print("=" * 80)
    print(f"\nTest started at: {datetime.now().isoformat()}")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Wallet: {TEST_WALLET}")

    # Test AI Chat endpoint
    print("\n" + "=" * 80)
    print("TESTING AI CHAT ENDPOINT - 50 QUERIES")
    print("=" * 80)

    chat_results = []
    for i, query in enumerate(CHAT_QUERIES[:50], 1):
        print(f"\n[{i}/50] Testing: {query[:60]}...")
        result = test_ai_chat(query, i)
        chat_results.append(result)

        if result["success"]:
            print(f"✅ SUCCESS - {result['response_time']}ms - Response: {result['response_length']} chars")
        else:
            print(f"❌ FAILED - Status: {result['status_code']} - Error: {result['error']}")

        # Small delay to avoid overwhelming the service
        time.sleep(0.5)

    # Test AI Query/RAG endpoint
    print("\n" + "=" * 80)
    print("TESTING AI QUERY (RAG) ENDPOINT - 30 QUERIES")
    print("=" * 80)

    rag_results = []
    for i, query in enumerate(RAG_QUERIES[:30], 1):
        print(f"\n[{i}/30] Testing: {query[:60]}...")
        result = test_ai_query(query, i)
        rag_results.append(result)

        if result["success"]:
            rag_status = "✓" if result.get("rag_used") else "✗"
            print(f"✅ SUCCESS - {result['response_time']}ms - Response: {result['response_length']} chars - RAG: {rag_status}")
        else:
            print(f"❌ FAILED - Status: {result['status_code']} - Error: {result['error']}")

        # Small delay to avoid overwhelming the service
        time.sleep(0.5)

    # Calculate statistics
    print("\n" + "=" * 80)
    print("TEST RESULTS SUMMARY")
    print("=" * 80)

    # Chat endpoint stats
    chat_success = sum(1 for r in chat_results if r["success"])
    chat_failed = len(chat_results) - chat_success
    chat_success_rate = (chat_success / len(chat_results) * 100) if chat_results else 0
    chat_response_times = [r["response_time"] for r in chat_results if r["success"]]
    chat_avg_time = sum(chat_response_times) / len(chat_response_times) if chat_response_times else 0

    print(f"\n📊 AI CHAT ENDPOINT:")
    print(f"  Total Queries: {len(chat_results)}")
    print(f"  Successful: {chat_success} ({chat_success_rate:.1f}%)")
    print(f"  Failed: {chat_failed}")
    print(f"  Avg Response Time: {chat_avg_time:.2f}ms")

    # RAG endpoint stats
    rag_success = sum(1 for r in rag_results if r["success"])
    rag_failed = len(rag_results) - rag_success
    rag_success_rate = (rag_success / len(rag_results) * 100) if rag_results else 0
    rag_response_times = [r["response_time"] for r in rag_results if r["success"]]
    rag_avg_time = sum(rag_response_times) / len(rag_response_times) if rag_response_times else 0
    rag_used_count = sum(1 for r in rag_results if r.get("rag_used", False))

    print(f"\n📊 AI QUERY (RAG) ENDPOINT:")
    print(f"  Total Queries: {len(rag_results)}")
    print(f"  Successful: {rag_success} ({rag_success_rate:.1f}%)")
    print(f"  Failed: {rag_failed}")
    print(f"  RAG Context Used: {rag_used_count}/{rag_success}")
    print(f"  Avg Response Time: {rag_avg_time:.2f}ms")

    # Overall stats
    total_queries = len(chat_results) + len(rag_results)
    total_success = chat_success + rag_success
    overall_success_rate = (total_success / total_queries * 100) if total_queries else 0

    print(f"\n📈 OVERALL STATISTICS:")
    print(f"  Total Queries: {total_queries}")
    print(f"  Total Successful: {total_success} ({overall_success_rate:.1f}%)")
    print(f"  Total Failed: {chat_failed + rag_failed}")

    # Determine final status
    print("\n" + "=" * 80)
    if overall_success_rate == 100:
        print("🎉 STATUS: ALL TESTS PASSED - AI CHAT ENDPOINTS FULLY FUNCTIONAL")
    elif overall_success_rate >= 90:
        print("⚠️  STATUS: MOSTLY PASSING - MINOR ISSUES DETECTED")
    elif overall_success_rate >= 50:
        print("⚠️  STATUS: PARTIAL FAILURE - SIGNIFICANT ISSUES DETECTED")
    else:
        print("❌ STATUS: CRITICAL FAILURE - AI CHAT NOT WORKING")
    print("=" * 80)

    print(f"\nTest completed at: {datetime.now().isoformat()}")

    # Show failed queries for debugging
    if chat_failed > 0 or rag_failed > 0:
        print("\n" + "=" * 80)
        print("FAILED QUERIES DETAILS")
        print("=" * 80)

        if chat_failed > 0:
            print("\n❌ Failed Chat Queries:")
            for r in chat_results:
                if not r["success"]:
                    print(f"  [{r['index']}] {r['query']}")
                    print(f"       Error: {r['error']}\n")

        if rag_failed > 0:
            print("\n❌ Failed RAG Queries:")
            for r in rag_results:
                if not r["success"]:
                    print(f"  [{r['index']}] {r['query']}")
                    print(f"       Error: {r['error']}\n")

    # Save results to JSON
    results_file = "ai_chat_test_results.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "chat_endpoint": {
                "total": len(chat_results),
                "successful": chat_success,
                "failed": chat_failed,
                "success_rate": chat_success_rate,
                "avg_response_time_ms": chat_avg_time,
                "results": chat_results
            },
            "rag_endpoint": {
                "total": len(rag_results),
                "successful": rag_success,
                "failed": rag_failed,
                "success_rate": rag_success_rate,
                "avg_response_time_ms": rag_avg_time,
                "rag_used_count": rag_used_count,
                "results": rag_results
            },
            "overall": {
                "total_queries": total_queries,
                "total_successful": total_success,
                "overall_success_rate": overall_success_rate
            }
        }, f, indent=2)

    print(f"\n📄 Detailed results saved to: {results_file}")

if __name__ == "__main__":
    main()
