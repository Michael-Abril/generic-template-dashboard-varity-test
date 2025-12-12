#!/usr/bin/env python3
"""
Direct Pinata API Test
Tests Pinata credentials and API access directly
"""
import asyncio
import httpx
import json
import sys
from datetime import datetime

# Credentials from .env
PINATA_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5MmI3MWNjOC00ODhiLTQxNWQtODk4Ny1jNWM2M2I5ODEyOGMiLCJlbWFpbCI6InNpcmVuaWMuY3NAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImE5ZTMwYWUwZTExNjE5MGE2MDg5Iiwic2NvcGVkS2V5U2VjcmV0IjoiZTczZDI1OWMwOTdhYzE1MzlkOGNjYTQ3M2I5ODEyMGVhNjJjOTg5NThmMjBhMjVjZDNmODM3Y2Q0OTNhMWYxNCIsImV4cCI6MTc5NDc2Njc3OX0.sbBDt7P2DEgqwPSWjCJTi0xtJzCfMftg6Neyx4JD2FQ"
PINATA_API_KEY = "a9e30ae0e116190a6089"
PINATA_SECRET_KEY = "e73d259c097ac1539d8cca473b98120ea62c98958f20a25cd3f837cd493a1f14"
PINATA_API_URL = "https://api.pinata.cloud"
PINATA_GATEWAY_URL = "https://gateway.pinata.cloud"


async def test_authentication():
    """Test 1: Authentication"""
    print("\n" + "="*60)
    print("TEST 1: Pinata Authentication")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {PINATA_JWT}"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{PINATA_API_URL}/data/testAuthentication",
                headers=headers,
                timeout=10.0
            )

            if response.status_code == 200:
                print("✅ Authentication SUCCESSFUL")
                print(f"   Response: {response.json()}")
                return True
            else:
                print(f"❌ Authentication FAILED")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Authentication ERROR: {str(e)}")
            return False


async def test_pinning_scopes():
    """Test 2: Check pinning permissions"""
    print("\n" + "="*60)
    print("TEST 2: Pinning Permissions")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {PINATA_JWT}",
        "Content-Type": "application/json"
    }

    test_data = {
        "pinataContent": {
            "test": "permissions_check",
            "timestamp": datetime.utcnow().isoformat()
        },
        "pinataMetadata": {
            "name": "varity-permissions-test"
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PINATA_API_URL}/pinning/pinJSONToIPFS",
                json=test_data,
                headers=headers,
                timeout=15.0
            )

            if response.status_code == 200:
                result = response.json()
                print("✅ Pinning permissions CONFIRMED")
                print(f"   Test CID: {result.get('IpfsHash')}")

                # Clean up test file
                test_cid = result.get('IpfsHash')
                if test_cid:
                    await unpin_file(test_cid)
                    print(f"   Cleaned up test file")

                return True
            elif response.status_code == 403:
                print(f"❌ Pinning permissions DENIED")
                print(f"   Response: {response.text}")

                error_data = response.json()
                if "NO_SCOPES_FOUND" in str(error_data):
                    print("\n⚠️  ISSUE: API key missing required scopes")
                    print("   Required scopes:")
                    print("   - pinFileToIPFS")
                    print("   - pinJSONToIPFS")
                    print("   - pinList")
                    print("   - unpin")

                return False
            else:
                print(f"❌ Pinning test FAILED")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Pinning test ERROR: {str(e)}")
            return False


async def unpin_file(cid: str):
    """Helper: Unpin a file from Pinata"""
    headers = {
        "Authorization": f"Bearer {PINATA_JWT}"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.delete(
                f"{PINATA_API_URL}/pinning/unpin/{cid}",
                headers=headers,
                timeout=10.0
            )
            return response.status_code == 200
        except:
            return False


async def test_file_upload():
    """Test 3: Upload actual file"""
    print("\n" + "="*60)
    print("TEST 3: File Upload")
    print("="*60)

    # Create test file content
    test_content = b"This is a test file for Pinata upload verification."

    headers = {
        "Authorization": f"Bearer {PINATA_JWT}"
    }

    files = {
        "file": ("test-file.txt", test_content)
    }

    metadata = {
        "pinataMetadata": json.dumps({
            "name": "varity-file-upload-test",
            "keyvalues": {
                "test": "true",
                "timestamp": datetime.utcnow().isoformat()
            }
        })
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{PINATA_API_URL}/pinning/pinFileToIPFS",
                files=files,
                data=metadata,
                headers=headers,
                timeout=30.0
            )

            if response.status_code == 200:
                result = response.json()
                print("✅ File upload SUCCESSFUL")
                print(f"   CID: {result.get('IpfsHash')}")
                print(f"   Size: {result.get('PinSize')} bytes")

                # Clean up
                test_cid = result.get('IpfsHash')
                if test_cid:
                    await unpin_file(test_cid)
                    print(f"   Cleaned up test file")

                return True
            else:
                print(f"❌ File upload FAILED")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ File upload ERROR: {str(e)}")
            return False


async def test_file_listing():
    """Test 4: List files"""
    print("\n" + "="*60)
    print("TEST 4: File Listing")
    print("="*60)

    headers = {
        "Authorization": f"Bearer {PINATA_JWT}"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{PINATA_API_URL}/data/pinList",
                params={"pageLimit": 10, "status": "pinned"},
                headers=headers,
                timeout=10.0
            )

            if response.status_code == 200:
                result = response.json()
                count = result.get('count', 0)
                print(f"✅ File listing SUCCESSFUL")
                print(f"   Total files: {count}")

                if count > 0:
                    print(f"   Recent files:")
                    for pin in result.get('rows', [])[:3]:
                        print(f"     - {pin.get('metadata', {}).get('name', 'unnamed')}")
                        print(f"       CID: {pin.get('ipfs_pin_hash')}")

                return True
            else:
                print(f"❌ File listing FAILED")
                print(f"   Status Code: {response.status_code}")
                print(f"   Response: {response.text}")
                return False

        except Exception as e:
            print(f"❌ File listing ERROR: {str(e)}")
            return False


async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("PINATA API DIAGNOSTIC TEST")
    print("="*60)
    print(f"API URL: {PINATA_API_URL}")
    print(f"Gateway URL: {PINATA_GATEWAY_URL}")
    print(f"Using JWT authentication")

    results = {
        "authentication": False,
        "pinning_scopes": False,
        "file_upload": False,
        "file_listing": False
    }

    # Run tests sequentially
    results["authentication"] = await test_authentication()

    if results["authentication"]:
        results["pinning_scopes"] = await test_pinning_scopes()
        results["file_upload"] = await test_file_upload()
        results["file_listing"] = await test_file_listing()
    else:
        print("\n⚠️  Skipping remaining tests due to authentication failure")

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    total_tests = len(results)
    passed_tests = sum(1 for v in results.values() if v)

    for test_name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {test_name.replace('_', ' ').title()}")

    print(f"\nPassed: {passed_tests}/{total_tests}")

    if passed_tests == total_tests:
        print("\n✅ All tests PASSED - Pinata API is fully functional")
        sys.exit(0)
    else:
        print(f"\n❌ {total_tests - passed_tests} test(s) FAILED")

        if not results["authentication"]:
            print("\n🔧 ROOT CAUSE: Authentication failure")
            print("   Solution: Verify PINATA_JWT is valid and not expired")
        elif not results["pinning_scopes"]:
            print("\n🔧 ROOT CAUSE: Missing pinning permissions")
            print("   Solution: Regenerate Pinata API key with all required scopes")

        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
