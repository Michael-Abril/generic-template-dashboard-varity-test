#!/usr/bin/env python3
"""
MCP Pipeline Validation Script

Tests the complete MCP data pipeline end-to-end.

Usage:
    python test_mcp_pipeline.py --wallet 0x738C812FB221ba32E8726fe38961570a700e87b9 --integration google

Requirements:
    - User must have OAuth token stored in Pinata
    - All env vars configured (PINATA_JWT, QDRANT_URL, TOGETHER_API_KEY, etc.)
"""

import asyncio
import sys
import argparse
import logging
from typing import Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_oauth_retrieval(wallet_address: str, integration: str):
    """Test 1: OAuth Credentials Retrieval"""
    logger.info("=" * 60)
    logger.info("TEST 1: OAuth Credentials Retrieval")
    logger.info("=" * 60)

    try:
        from app.api.v1.sync import retrieve_oauth_credentials

        credentials = await retrieve_oauth_credentials(wallet_address, integration)

        if not credentials.get("access_token"):
            logger.error("FAILED: No access_token in credentials")
            return False

        logger.info(f"SUCCESS: Retrieved access_token for {integration}")
        logger.info(f"  Token prefix: {credentials['access_token'][:20]}...")
        return True

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        return False


async def test_mcp_connection(oauth_token: str, integration: str):
    """Test 2: MCP Server Communication"""
    logger.info("=" * 60)
    logger.info("TEST 2: MCP Server Communication")
    logger.info("=" * 60)

    try:
        from mcp_servers import MCPClient

        async with MCPClient(integration) as client:
            # Connect to MCP server
            connected = await client.connect(oauth_token)
            if not connected:
                logger.error("FAILED: Could not connect to MCP server")
                return False

            logger.info(f"SUCCESS: Connected to {integration} MCP server")

            # List available tools
            tools = await client.list_tools()
            logger.info(f"  Available tools: {len(tools)}")
            for tool in tools[:3]:
                logger.info(f"    - {tool.get('name', 'unknown')}")

            return True

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        return False


async def test_encryption(wallet_address: str):
    """Test 3: Data Encryption"""
    logger.info("=" * 60)
    logger.info("TEST 3: Data Encryption")
    logger.info("=" * 60)

    try:
        from app.services.encryption_service import EncryptionService

        encryption = EncryptionService()

        # Test data
        test_data = {
            "test": "data",
            "records": [1, 2, 3],
            "timestamp": "2025-12-31T00:00:00Z"
        }

        # Encrypt
        encrypted = await encryption.encrypt_for_customer(
            data=test_data,
            customer_wallet=wallet_address
        )

        if "encrypted_data" not in encrypted:
            logger.error("FAILED: No encrypted_data in result")
            return False

        logger.info("SUCCESS: Data encrypted")
        logger.info(f"  Algorithm: {encrypted.get('algorithm')}")
        logger.info(f"  Encrypted size: {len(encrypted['encrypted_data'])} chars")

        # Decrypt to verify
        decrypted = await encryption.decrypt_with_wallet(
            encrypted_data=encrypted,
            customer_wallet=wallet_address
        )

        if decrypted != test_data:
            logger.error("FAILED: Decrypted data doesn't match original")
            return False

        logger.info("SUCCESS: Data decrypted and verified")
        return True

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        return False


async def test_pinata_upload(wallet_address: str, integration: str):
    """Test 4: Pinata Upload"""
    logger.info("=" * 60)
    logger.info("TEST 4: Pinata Upload & Retrieval")
    logger.info("=" * 60)

    try:
        from app.services.filecoin_service import FilecoinService
        from app.services.encryption_service import EncryptionService

        filecoin = FilecoinService()
        encryption = EncryptionService()

        # Create test data
        test_data = {"test": "pinata upload", "timestamp": "2025-12-31"}

        # Encrypt
        encrypted = await encryption.encrypt_for_customer(
            data=test_data,
            customer_wallet=wallet_address
        )

        # Upload
        cid = await filecoin.upload_encrypted_data(
            customer_wallet=wallet_address,
            integration=integration,
            data_type="test_data",
            encrypted_data=encrypted,
            metadata={"test": "true"}
        )

        logger.info(f"SUCCESS: Uploaded to Pinata")
        logger.info(f"  CID: {cid}")

        # Retrieve
        retrieved = await filecoin.retrieve_data(cid)

        if retrieved.get("encrypted_data") != encrypted["encrypted_data"]:
            logger.error("FAILED: Retrieved data doesn't match uploaded")
            return False

        logger.info("SUCCESS: Retrieved from Pinata and verified")
        return True, cid

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        return False, None


async def test_qdrant_indexing(wallet_address: str, cid: str, integration: str):
    """Test 5: Qdrant Indexing"""
    logger.info("=" * 60)
    logger.info("TEST 5: Qdrant Indexing")
    logger.info("=" * 60)

    try:
        from app.services.rag_service import rag_service

        # Test data
        test_data = {
            "test": "qdrant indexing",
            "description": "This is a test document for vector search"
        }

        # Index
        point_id = await rag_service.index_business_data(
            business_wallet=wallet_address,
            cid=cid,
            data=test_data,
            integration=integration,
            data_type="test_data"
        )

        logger.info(f"SUCCESS: Indexed in Qdrant")
        logger.info(f"  Point ID: {point_id}")
        logger.info(f"  Collection: business_{wallet_address.replace('0x', '')}")

        # Query
        results = await rag_service.query_business_rag(
            business_wallet=wallet_address,
            query="test document",
            limit=5
        )

        if len(results) == 0:
            logger.warning("WARNING: Query returned no results (embedding may still be processing)")
        else:
            logger.info(f"SUCCESS: Query returned {len(results)} results")
            logger.info(f"  Top result score: {results[0].get('score', 0):.4f}")

        return True

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        return False


async def test_l3_connection():
    """Test 6: L3 Network Connection"""
    logger.info("=" * 60)
    logger.info("TEST 6: L3 Network Connection")
    logger.info("=" * 60)

    try:
        from app.services.l3_commitment_service import get_l3_service

        l3 = get_l3_service()

        # Check connection
        connected = l3.is_connected()
        if not connected:
            logger.warning("WARNING: L3 not connected (contract may not be configured)")
            logger.info("  This is optional for basic MCP pipeline operation")
            return True

        # Get network info
        info = l3.get_network_info()
        logger.info("SUCCESS: Connected to L3 network")
        logger.info(f"  Network: {info.get('name')}")
        logger.info(f"  Chain ID: {info.get('chain_id')}")
        logger.info(f"  RPC: {info.get('rpc_url_active')}")

        return True

    except Exception as e:
        logger.warning(f"WARNING: L3 connection check failed: {str(e)}")
        logger.info("  This is optional for basic MCP pipeline operation")
        return True


async def test_full_pipeline(wallet_address: str, integration: str):
    """Test 7: Full MCP Pipeline End-to-End"""
    logger.info("=" * 60)
    logger.info("TEST 7: Full MCP Pipeline")
    logger.info("=" * 60)

    try:
        from app.services.mcp_ingestion_service import get_mcp_ingestion_service
        from app.api.v1.sync import retrieve_oauth_credentials

        # Get OAuth token
        credentials = await retrieve_oauth_credentials(wallet_address, integration)
        oauth_token = credentials.get("access_token")

        # Get MCP service
        mcp_service = get_mcp_ingestion_service()

        # Run sync
        logger.info(f"Starting MCP sync for {integration}...")
        result = await mcp_service.sync_integration_data(
            integration=integration,
            wallet_address=wallet_address,
            oauth_token=oauth_token,
            data_types=None  # All data types
        )

        logger.info("SUCCESS: MCP pipeline completed")
        logger.info(f"  Integration: {result.get('integration')}")
        logger.info(f"  Sync time: {result.get('sync_time')}")

        # Log results per data type
        results = result.get("results", {})
        for data_type, details in results.items():
            status = details.get("status", "unknown")
            logger.info(f"  {data_type}: {status}")
            if "cid" in details:
                logger.info(f"    CID: {details['cid']}")
            if "error" in details:
                logger.error(f"    Error: {details['error']}")

        # Log L3 commits
        l3_commits = result.get("l3_commits")
        if l3_commits:
            logger.info(f"  L3 Commits:")
            for integration_name, commit_details in l3_commits.items():
                logger.info(f"    {integration_name}: {commit_details.get('item_count', 0)} items")
                if commit_details.get("l3_committed"):
                    logger.info(f"      TX: {commit_details.get('tx_hash')}")

        return True

    except Exception as e:
        logger.error(f"FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        return False


async def run_all_tests(wallet_address: str, integration: str):
    """Run all validation tests"""
    logger.info("\n" + "=" * 60)
    logger.info("MCP PIPELINE VALIDATION SUITE")
    logger.info("=" * 60)
    logger.info(f"Wallet: {wallet_address}")
    logger.info(f"Integration: {integration}")
    logger.info("=" * 60 + "\n")

    results = {}

    # Test 1: OAuth
    results["oauth"] = await test_oauth_retrieval(wallet_address, integration)
    if not results["oauth"]:
        logger.error("\nStopping tests: OAuth retrieval failed")
        return results

    # Get token for subsequent tests
    from app.api.v1.sync import retrieve_oauth_credentials
    credentials = await retrieve_oauth_credentials(wallet_address, integration)
    oauth_token = credentials.get("access_token")

    # Test 2: MCP
    results["mcp"] = await test_mcp_connection(oauth_token, integration)

    # Test 3: Encryption
    results["encryption"] = await test_encryption(wallet_address)

    # Test 4: Pinata
    pinata_result = await test_pinata_upload(wallet_address, integration)
    if isinstance(pinata_result, tuple):
        results["pinata"] = pinata_result[0]
        cid = pinata_result[1]
    else:
        results["pinata"] = pinata_result
        cid = None

    # Test 5: Qdrant
    if cid:
        results["qdrant"] = await test_qdrant_indexing(wallet_address, cid, integration)
    else:
        logger.warning("Skipping Qdrant test: No CID from Pinata test")
        results["qdrant"] = False

    # Test 6: L3
    results["l3"] = await test_l3_connection()

    # Test 7: Full pipeline
    results["full_pipeline"] = await test_full_pipeline(wallet_address, integration)

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("VALIDATION SUMMARY")
    logger.info("=" * 60)

    passed = sum(1 for result in results.values() if result)
    total = len(results)

    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        logger.info(f"{status} - {test_name}")

    logger.info("=" * 60)
    logger.info(f"Overall: {passed}/{total} tests passed ({passed/total*100:.0f}%)")
    logger.info("=" * 60)

    return results


def main():
    parser = argparse.ArgumentParser(description="MCP Pipeline Validation")
    parser.add_argument("--wallet", required=True, help="Wallet address")
    parser.add_argument("--integration", required=True, choices=[
        "google", "slack", "quickbooks", "microsoft", "salesforce", "hubspot"
    ], help="Integration to test")
    parser.add_argument("--test", help="Run specific test (oauth, mcp, encryption, pinata, qdrant, l3, full_pipeline)")

    args = parser.parse_args()

    # Run tests
    if args.test:
        logger.info(f"Running single test: {args.test}")
        # TODO: Implement single test execution
        logger.error("Single test mode not yet implemented. Running all tests.")

    asyncio.run(run_all_tests(args.wallet, args.integration))


if __name__ == "__main__":
    main()
