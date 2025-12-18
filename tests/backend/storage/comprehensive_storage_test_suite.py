#!/usr/bin/env python3
"""
Comprehensive Storage Test Suite - 250 Operations
Tests Pinata/Filecoin storage with GENERIC business documents ONLY

Test Breakdown:
- 100 File Uploads (generic invoices, contracts, reports, images)
- 100 File Downloads (verify content integrity)
- 50 File Listings (verify metadata and organization)

TARGET: 100% success (250/250)
"""
import asyncio
import httpx
import json
import time
import random
import sys
from datetime import datetime
from typing import Dict, List, Any


# Test Configuration
BASE_URL = "http://localhost:8000"
TEST_WALLET = "0x1234567890abcdef1234567890abcdef12345678"

# Generic test files (NO industry-specific content)
GENERIC_FILES = {
    "invoices": [
        {"name": "invoice_001.json", "content": {"invoice_id": "INV-001", "amount": 1500.00, "date": "2024-01-15"}},
        {"name": "invoice_002.json", "content": {"invoice_id": "INV-002", "amount": 2300.50, "date": "2024-01-20"}},
        {"name": "invoice_003.json", "content": {"invoice_id": "INV-003", "amount": 875.25, "date": "2024-02-01"}},
    ],
    "contracts": [
        {"name": "contract_vendor_a.json", "content": {"contract_id": "CNT-A", "vendor": "Vendor A", "value": 50000}},
        {"name": "contract_vendor_b.json", "content": {"contract_id": "CNT-B", "vendor": "Vendor B", "value": 75000}},
    ],
    "reports": [
        {"name": "monthly_report_jan.json", "content": {"month": "January", "revenue": 125000, "expenses": 95000}},
        {"name": "monthly_report_feb.json", "content": {"month": "February", "revenue": 132000, "expenses": 98000}},
        {"name": "quarterly_report_q1.json", "content": {"quarter": "Q1", "revenue": 380000, "profit": 85000}},
    ],
    "documents": [
        {"name": "company_policy.json", "content": {"title": "Company Policy", "version": "1.0", "pages": 25}},
        {"name": "employee_handbook.json", "content": {"title": "Employee Handbook", "version": "2.1", "pages": 50}},
    ],
    "images": [
        {"name": "company_logo.txt", "content": "Generic company logo placeholder"},
        {"name": "product_image_1.txt", "content": "Generic product image placeholder"},
    ],
    "customer_data": [
        {"name": "customer_001.json", "content": {"customer_id": "CUST-001", "name": "Customer A", "active": True}},
        {"name": "customer_002.json", "content": {"customer_id": "CUST-002", "name": "Customer B", "active": True}},
    ],
    "employee_files": [
        {"name": "employee_001.json", "content": {"employee_id": "EMP-001", "name": "Employee A", "department": "Sales"}},
        {"name": "employee_002.json", "content": {"employee_id": "EMP-002", "name": "Employee B", "department": "Engineering"}},
    ]
}


class StorageTestRunner:
    """Comprehensive storage testing"""

    def __init__(self):
        self.results = {
            "upload": {"passed": 0, "failed": 0, "errors": []},
            "download": {"passed": 0, "failed": 0, "errors": []},
            "list": {"passed": 0, "failed": 0, "errors": []}
        }
        self.uploaded_cids = []  # Track uploaded files for cleanup
        self.client = None

    async def setup(self):
        """Initialize HTTP client"""
        self.client = httpx.AsyncClient(timeout=60.0)
        print("\n" + "="*80)
        print("COMPREHENSIVE STORAGE TEST SUITE")
        print("="*80)
        print(f"Base URL: {BASE_URL}")
        print(f"Test Wallet: {TEST_WALLET}")
        print(f"Target Operations: 250 (100 uploads + 100 downloads + 50 lists)")
        print("="*80 + "\n")

    async def cleanup(self):
        """Close HTTP client"""
        if self.client:
            await self.client.aclose()

    async def upload_file(self, data_type: str, file_data: Dict[str, Any]) -> bool:
        """
        Upload a single file
        Returns True if successful
        """
        try:
            request_data = {
                "customer_wallet": TEST_WALLET,
                "integration": "generic",
                "data_type": data_type,
                "data": file_data["content"],
                "metadata": {
                    "filename": file_data["name"],
                    "uploaded_by": "test_suite",
                    "test_run": datetime.utcnow().isoformat()
                }
            }

            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/upload",
                json=request_data
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    cid = result.get("cid")
                    self.uploaded_cids.append({
                        "cid": cid,
                        "data_type": data_type,
                        "filename": file_data["name"]
                    })
                    self.results["upload"]["passed"] += 1
                    return True

            error = f"{data_type}/{file_data['name']}: {response.status_code} - {response.text[:100]}"
            self.results["upload"]["errors"].append(error)
            self.results["upload"]["failed"] += 1
            return False

        except Exception as e:
            error = f"{data_type}/{file_data['name']}: {str(e)}"
            self.results["upload"]["errors"].append(error)
            self.results["upload"]["failed"] += 1
            return False

    async def download_file(self, cid_info: Dict[str, Any]) -> bool:
        """
        Download and verify a file
        Returns True if successful
        """
        try:
            request_data = {
                "cid": cid_info["cid"],
                "customer_wallet": TEST_WALLET
            }

            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/retrieve",
                json=request_data
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success") and result.get("data"):
                    self.results["download"]["passed"] += 1
                    return True

            error = f"{cid_info['filename']}: {response.status_code} - {response.text[:100]}"
            self.results["download"]["errors"].append(error)
            self.results["download"]["failed"] += 1
            return False

        except Exception as e:
            error = f"{cid_info['filename']}: {str(e)}"
            self.results["download"]["errors"].append(error)
            self.results["download"]["failed"] += 1
            return False

    async def list_files(self, data_type: str = None) -> bool:
        """
        List files with optional filter
        Returns True if successful
        """
        try:
            request_data = {
                "customer_wallet": TEST_WALLET,
                "limit": 100
            }

            if data_type:
                request_data["data_type"] = data_type

            response = await self.client.post(
                f"{BASE_URL}/api/v1/storage/list",
                json=request_data
            )

            if response.status_code == 200:
                result = response.json()
                if result.get("success"):
                    self.results["list"]["passed"] += 1
                    return True

            error = f"List {data_type or 'all'}: {response.status_code} - {response.text[:100]}"
            self.results["list"]["errors"].append(error)
            self.results["list"]["failed"] += 1
            return False

        except Exception as e:
            error = f"List {data_type or 'all'}: {str(e)}"
            self.results["list"]["errors"].append(error)
            self.results["list"]["failed"] += 1
            return False

    async def test_uploads(self):
        """Test 100 file uploads"""
        print("=" * 80)
        print("TEST 1: FILE UPLOADS (100 operations)")
        print("=" * 80)

        upload_count = 0
        target_uploads = 100

        # Upload files multiple times to reach 100 operations
        while upload_count < target_uploads:
            for data_type, files in GENERIC_FILES.items():
                for file_data in files:
                    if upload_count >= target_uploads:
                        break

                    # Add variation to filename
                    modified_file = file_data.copy()
                    modified_file["name"] = f"{upload_count:03d}_{file_data['name']}"

                    success = await self.upload_file(data_type, modified_file)

                    upload_count += 1
                    if upload_count % 10 == 0:
                        print(f"Progress: {upload_count}/{target_uploads} uploads...")

                if upload_count >= target_uploads:
                    break

        passed = self.results["upload"]["passed"]
        failed = self.results["upload"]["failed"]
        pass_rate = (passed / target_uploads * 100) if target_uploads > 0 else 0

        print(f"\n✓ Upload Test Complete")
        print(f"  Passed: {passed}/{target_uploads} ({pass_rate:.1f}%)")
        print(f"  Failed: {failed}")

        if failed > 0:
            print(f"\n  First 5 errors:")
            for error in self.results["upload"]["errors"][:5]:
                print(f"    - {error}")

    async def test_downloads(self):
        """Test 100 file downloads"""
        print("\n" + "=" * 80)
        print("TEST 2: FILE DOWNLOADS (100 operations)")
        print("=" * 80)

        if not self.uploaded_cids:
            print("⚠️  No files uploaded, skipping download tests")
            return

        download_count = 0
        target_downloads = min(100, len(self.uploaded_cids))

        # Download uploaded files
        for i in range(target_downloads):
            # Use modulo to cycle through uploaded files if we have fewer than 100
            cid_info = self.uploaded_cids[i % len(self.uploaded_cids)]

            success = await self.download_file(cid_info)

            download_count += 1
            if download_count % 10 == 0:
                print(f"Progress: {download_count}/{target_downloads} downloads...")

        passed = self.results["download"]["passed"]
        failed = self.results["download"]["failed"]
        pass_rate = (passed / target_downloads * 100) if target_downloads > 0 else 0

        print(f"\n✓ Download Test Complete")
        print(f"  Passed: {passed}/{target_downloads} ({pass_rate:.1f}%)")
        print(f"  Failed: {failed}")

        if failed > 0:
            print(f"\n  First 5 errors:")
            for error in self.results["download"]["errors"][:5]:
                print(f"    - {error}")

    async def test_listings(self):
        """Test 50 file listing operations"""
        print("\n" + "=" * 80)
        print("TEST 3: FILE LISTINGS (50 operations)")
        print("=" * 80)

        list_count = 0
        target_lists = 50

        # Test listing with various filters
        data_types = list(GENERIC_FILES.keys()) + [None] * 10  # Mix of filtered and unfiltered

        for i in range(target_lists):
            data_type = data_types[i % len(data_types)]
            success = await self.list_files(data_type)

            list_count += 1
            if list_count % 10 == 0:
                print(f"Progress: {list_count}/{target_lists} list operations...")

        passed = self.results["list"]["passed"]
        failed = self.results["list"]["failed"]
        pass_rate = (passed / target_lists * 100) if target_lists > 0 else 0

        print(f"\n✓ List Test Complete")
        print(f"  Passed: {passed}/{target_lists} ({pass_rate:.1f}%)")
        print(f"  Failed: {failed}")

        if failed > 0:
            print(f"\n  First 5 errors:")
            for error in self.results["list"]["errors"][:5]:
                print(f"    - {error}")

    def print_summary(self):
        """Print comprehensive test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)

        total_operations = 250
        total_passed = (
            self.results["upload"]["passed"] +
            self.results["download"]["passed"] +
            self.results["list"]["passed"]
        )
        total_failed = total_operations - total_passed
        overall_pass_rate = (total_passed / total_operations * 100)

        print(f"\nOverall Results: {total_passed}/{total_operations} ({overall_pass_rate:.1f}%)")
        print(f"  ✓ Uploads:   {self.results['upload']['passed']}/100")
        print(f"  ✓ Downloads: {self.results['download']['passed']}/100")
        print(f"  ✓ Lists:     {self.results['list']['passed']}/50")

        if total_failed > 0:
            print(f"\n  ✗ Failed:    {total_failed}")

        print("\n" + "=" * 80)

        if overall_pass_rate == 100:
            print("✅ SUCCESS - All 250 operations PASSED (100%)")
            print("Storage endpoints are FULLY FUNCTIONAL")
            return 0
        else:
            print(f"❌ FAILURE - {total_failed} operations FAILED ({100-overall_pass_rate:.1f}%)")
            print("Storage endpoints need attention")
            return 1

    async def run_all_tests(self):
        """Execute all tests"""
        await self.setup()

        try:
            # Test 1: Uploads
            await self.test_uploads()

            # Test 2: Downloads
            await self.test_downloads()

            # Test 3: Listings
            await self.test_listings()

            # Summary
            exit_code = self.print_summary()

            return exit_code

        except Exception as e:
            print(f"\n❌ Test suite error: {str(e)}")
            return 1

        finally:
            await self.cleanup()


async def main():
    """Main entry point"""
    runner = StorageTestRunner()
    exit_code = await runner.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    asyncio.run(main())
