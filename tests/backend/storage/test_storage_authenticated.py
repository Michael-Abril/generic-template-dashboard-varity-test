#!/usr/bin/env python3
"""
COMPREHENSIVE STORAGE ENDPOINT TEST SUITE (WITH AUTHENTICATION)
Tests all storage operations with Pinata and Lit Protocol encryption
Includes proper wallet signature authentication headers
Target: 250 operations (100 upload, 100 download, 50 list)
"""
import httpx
import asyncio
import json
import random
import time
from datetime import datetime
from typing import List, Dict, Any
from web3 import Web3
from eth_account.messages import encode_defunct

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_WALLETS = [
    "0x1234567890abcdef1234567890abcdef12345678",
    "0xabcdef1234567890abcdef1234567890abcdef12",
    "0x7890abcdef1234567890abcdef1234567890abcd"
]

# For testing, we'll use a dev private key (NEVER use in production!)
# This is just for local testing
DEV_PRIVATE_KEY = "0x" + "1" * 64  # Simple test key

# Test results tracking
test_results = {
    "upload": {"total": 0, "passed": 0, "failed": 0, "errors": []},
    "download": {"total": 0, "passed": 0, "failed": 0, "errors": []},
    "list": {"total": 0, "passed": 0, "failed": 0, "errors": []},
}

uploaded_cids = []  # Track CIDs for download tests


class StorageTester:
    """Comprehensive storage endpoint tester with wallet authentication"""

    def __init__(self):
        self.client = None
        self.w3 = Web3()
        # Create account from private key
        self.account = self.w3.eth.account.from_key(DEV_PRIVATE_KEY)

    async def __aenter__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            await self.client.aclose()

    def generate_auth_headers(self, wallet: str = None) -> dict:
        """Generate wallet authentication headers"""
        # Use test account's wallet if not specified
        if not wallet:
            wallet = self.account.address

        # Generate message with timestamp
        timestamp = int(time.time())
        message = f"Varity Dashboard Authentication - {timestamp}"

        # Sign message
        message_hash = encode_defunct(text=message)
        signed_message = self.w3.eth.account.sign_message(
            message_hash,
            private_key=DEV_PRIVATE_KEY
        )

        return {
            "X-Wallet-Address": wallet,
            "X-Signature": signed_message.signature.hex(),
            "X-Message": message,
            "X-Timestamp": str(timestamp)
        }

    async def test_upload(
        self,
        wallet: str,
        integration: str,
        data_type: str,
        data: dict,
        metadata: dict = None
    ) -> dict:
        """Test file upload to Filecoin/IPFS"""
        test_results["upload"]["total"] += 1

        try:
            # Generate auth headers
            auth_headers = self.generate_auth_headers(wallet)

            request_data = {
                "customer_wallet": wallet,
                "integration": integration,
                "data_type": data_type,
                "data": data,
                "metadata": metadata or {}
            }

            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/upload",
                json=request_data,
                headers=auth_headers
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("cid"):
                    test_results["upload"]["passed"] += 1
                    uploaded_cids.append({
                        "cid": result["cid"],
                        "wallet": wallet,
                        "integration": integration,
                        "data_type": data_type
                    })
                    return {
                        "success": True,
                        "cid": result["cid"],
                        "response": result
                    }

            # If we got here, something failed
            test_results["upload"]["failed"] += 1
            error_msg = f"Status {response.status_code}: {response.text[:200]}"
            test_results["upload"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}

        except Exception as e:
            test_results["upload"]["failed"] += 1
            error_msg = f"Exception: {str(e)}"
            test_results["upload"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}

    async def test_download(
        self,
        cid: str,
        wallet: str
    ) -> dict:
        """Test file download from Filecoin/IPFS"""
        test_results["download"]["total"] += 1

        try:
            # Generate auth headers
            auth_headers = self.generate_auth_headers(wallet)

            request_data = {
                "cid": cid,
                "customer_wallet": wallet
            }

            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/retrieve",
                json=request_data,
                headers=auth_headers
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("data"):
                    test_results["download"]["passed"] += 1
                    return {"success": True, "data": result["data"]}

            # If we got here, something failed
            test_results["download"]["failed"] += 1
            error_msg = f"Status {response.status_code}: {response.text[:200]}"
            test_results["download"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}

        except Exception as e:
            test_results["download"]["failed"] += 1
            error_msg = f"Exception: {str(e)}"
            test_results["download"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}

    async def test_list(
        self,
        wallet: str,
        integration: str = None,
        data_type: str = None
    ) -> dict:
        """Test listing files for a wallet"""
        test_results["list"]["total"] += 1

        try:
            request_data = {
                "customer_wallet": wallet,
                "integration": integration,
                "data_type": data_type,
                "limit": 100
            }

            # List endpoint might not be protected, try without auth first
            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/list",
                json=request_data
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    test_results["list"]["passed"] += 1
                    return {
                        "success": True,
                        "count": result.get("count", 0),
                        "files": result.get("files", [])
                    }

            # If we got here, something failed
            test_results["list"]["failed"] += 1
            error_msg = f"Status {response.status_code}: {response.text[:200]}"
            test_results["list"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}

        except Exception as e:
            test_results["list"]["failed"] += 1
            error_msg = f"Exception: {str(e)}"
            test_results["list"]["errors"].append(error_msg)
            return {"success": False, "error": error_msg}


async def run_upload_tests(tester: StorageTester, num_tests: int = 100):
    """Run upload tests"""
    print(f"\n{'='*80}")
    print(f"PHASE 1: FILE UPLOAD TESTS ({num_tests} operations)")
    print(f"{'='*80}\n")

    integrations = ["quickbooks", "salesforce", "google-workspace", "slack", "generic"]
    data_types = ["invoices", "customers", "emails", "documents", "credentials"]

    for i in range(num_tests):
        # Use the test account's wallet for all uploads
        wallet = tester.account.address

        integration = random.choice(integrations)
        data_type = random.choice(data_types)

        # Generate test data
        test_data = {
            "test_id": f"test-{i+1}",
            "timestamp": datetime.utcnow().isoformat(),
            "integration": integration,
            "data_type": data_type,
            "sample_data": {
                "invoice_number": f"INV-{random.randint(1000, 9999)}",
                "amount": round(random.uniform(100, 10000), 2),
                "customer": f"Customer-{random.randint(1, 100)}"
            }
        }

        result = await tester.test_upload(
            wallet=wallet,
            integration=integration,
            data_type=data_type,
            data=test_data,
            metadata={"test_number": i+1}
        )

        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{num_tests} uploads completed")

    print(f"\nUpload Tests Complete:")
    print(f"  ✅ Passed: {test_results['upload']['passed']}/{num_tests}")
    print(f"  ❌ Failed: {test_results['upload']['failed']}/{num_tests}")
    if test_results['upload']['errors']:
        print(f"\n  Sample Errors (first 3):")
        for error in test_results['upload']['errors'][:3]:
            print(f"    - {error}")


async def run_download_tests(tester: StorageTester, num_tests: int = 100):
    """Run download tests"""
    print(f"\n{'='*80}")
    print(f"PHASE 2: FILE DOWNLOAD TESTS ({num_tests} operations)")
    print(f"{'='*80}\n")

    if not uploaded_cids:
        print("⚠️  No uploaded files available for download testing")
        return

    # Download each uploaded file + duplicates to reach num_tests
    for i in range(num_tests):
        # Cycle through uploaded files
        file_info = uploaded_cids[i % len(uploaded_cids)]

        result = await tester.test_download(
            cid=file_info["cid"],
            wallet=file_info["wallet"]
        )

        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{num_tests} downloads completed")

    print(f"\nDownload Tests Complete:")
    print(f"  ✅ Passed: {test_results['download']['passed']}/{num_tests}")
    print(f"  ❌ Failed: {test_results['download']['failed']}/{num_tests}")
    if test_results['download']['errors']:
        print(f"\n  Sample Errors (first 3):")
        for error in test_results['download']['errors'][:3]:
            print(f"    - {error}")


async def run_list_tests(tester: StorageTester, num_tests: int = 50):
    """Run list file tests"""
    print(f"\n{'='*80}")
    print(f"PHASE 3: FILE LISTING TESTS ({num_tests} operations)")
    print(f"{'='*80}\n")

    integrations = ["quickbooks", "salesforce", "google-workspace", "slack", None]
    data_types = ["invoices", "customers", "emails", None]

    for i in range(num_tests):
        # Use the test account's wallet
        wallet = tester.account.address

        integration = random.choice(integrations)
        data_type = random.choice(data_types)

        result = await tester.test_list(
            wallet=wallet,
            integration=integration,
            data_type=data_type
        )

        if (i + 1) % 10 == 0:
            print(f"Progress: {i+1}/{num_tests} list operations completed")

    print(f"\nList Tests Complete:")
    print(f"  ✅ Passed: {test_results['list']['passed']}/{num_tests}")
    print(f"  ❌ Failed: {test_results['list']['failed']}/{num_tests}")
    if test_results['list']['errors']:
        print(f"\n  Sample Errors (first 3):")
        for error in test_results['list']['errors'][:3]:
            print(f"    - {error}")


async def check_server():
    """Check if server is running"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{BASE_URL}/health", timeout=5.0)
            if response.status_code == 200:
                print(f"✅ Server is running at {BASE_URL}")
                return True
    except Exception as e:
        print(f"❌ Server not accessible at {BASE_URL}: {e}")
        return False

    return False


async def main():
    """Run all storage tests"""
    print("\n" + "="*80)
    print("COMPREHENSIVE STORAGE ENDPOINT TEST SUITE (AUTHENTICATED)")
    print("Target: 250 operations (100 upload, 100 download, 50 list)")
    print("="*80)

    # Check server
    if not await check_server():
        print("\n❌ FAILED: Backend server not running. Start with: uvicorn app.main:app")
        return

    start_time = time.time()

    async with StorageTester() as tester:
        print(f"\n🔑 Using test wallet: {tester.account.address}")

        # Phase 1: Upload tests (100 operations)
        await run_upload_tests(tester, 100)

        # Phase 2: Download tests (100 operations)
        await run_download_tests(tester, 100)

        # Phase 3: List tests (50 operations)
        await run_list_tests(tester, 50)

    end_time = time.time()
    duration = end_time - start_time

    # Calculate overall results
    total_tests = (
        test_results["upload"]["total"] +
        test_results["download"]["total"] +
        test_results["list"]["total"]
    )
    total_passed = (
        test_results["upload"]["passed"] +
        test_results["download"]["passed"] +
        test_results["list"]["passed"]
    )
    total_failed = (
        test_results["upload"]["failed"] +
        test_results["download"]["failed"] +
        test_results["list"]["failed"]
    )

    success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0

    # Print final report
    print(f"\n{'='*80}")
    print("FINAL TEST RESULTS")
    print(f"{'='*80}")
    print(f"\n📊 Overall Statistics:")
    print(f"   Total Operations: {total_tests}")
    print(f"   ✅ Passed: {total_passed}")
    print(f"   ❌ Failed: {total_failed}")
    print(f"   Success Rate: {success_rate:.1f}%")
    print(f"   Duration: {duration:.2f} seconds")

    print(f"\n📋 Breakdown by Operation:")
    print(f"   Upload:   {test_results['upload']['passed']}/{test_results['upload']['total']} ({test_results['upload']['passed']/test_results['upload']['total']*100:.1f}%)")
    print(f"   Download: {test_results['download']['passed']}/{test_results['download']['total']} ({test_results['download']['passed']/test_results['download']['total']*100 if test_results['download']['total'] > 0 else 0:.1f}%)")
    print(f"   List:     {test_results['list']['passed']}/{test_results['list']['total']} ({test_results['list']['passed']/test_results['list']['total']*100 if test_results['list']['total'] > 0 else 0:.1f}%)")

    print(f"\n📝 Uploaded Files:")
    print(f"   Total CIDs stored: {len(uploaded_cids)}")
    if uploaded_cids:
        print(f"   Sample CIDs (first 5):")
        for i, file_info in enumerate(uploaded_cids[:5], 1):
            print(f"     {i}. {file_info['cid'][:20]}... ({file_info['integration']}/{file_info['data_type']})")

    # Determine final status
    if success_rate >= 100:
        print(f"\n✅ STORAGE ENDPOINTS: FULLY OPERATIONAL (100%)")
    elif success_rate >= 80:
        print(f"\n⚠️  STORAGE ENDPOINTS: MOSTLY WORKING ({success_rate:.1f}%)")
    else:
        print(f"\n❌ STORAGE ENDPOINTS: FAILING ({success_rate:.1f}%)")

    print(f"\n{'='*80}\n")

    # Save detailed results to JSON
    results_file = "storage_test_results_auth.json"
    with open(results_file, "w") as f:
        json.dump({
            "timestamp": datetime.utcnow().isoformat(),
            "duration_seconds": duration,
            "total_operations": total_tests,
            "total_passed": total_passed,
            "total_failed": total_failed,
            "success_rate_percent": success_rate,
            "breakdown": test_results,
            "uploaded_cids": uploaded_cids
        }, f, indent=2)

    print(f"📄 Detailed results saved to: {results_file}\n")


if __name__ == "__main__":
    asyncio.run(main())
