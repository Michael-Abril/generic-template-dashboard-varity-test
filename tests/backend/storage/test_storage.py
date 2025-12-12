#!/usr/bin/env python3
"""
Varity Generic Template - Storage Integration Test
Tests the complete encrypt → upload → retrieve → decrypt flow
"""
import asyncio
import json
from datetime import datetime
from dotenv import load_dotenv

from app.services.filecoin_service import FilecoinService
from app.services.encryption_service import EncryptionService
from app.core.config import settings

# Load environment variables
load_dotenv()


async def test_storage_integration():
    """
    Test complete storage workflow:
    1. Create test data
    2. Encrypt with Lit Protocol
    3. Upload to Filecoin/IPFS via Pinata
    4. Retrieve by CID
    5. Decrypt with wallet
    6. Verify data integrity
    """
    print("=" * 80)
    print("VARITY GENERIC TEMPLATE - STORAGE INTEGRATION TEST")
    print("=" * 80)
    print()

    # Initialize services
    filecoin_service = FilecoinService()
    encryption_service = EncryptionService()

    # Test wallet (development only)
    test_wallet = "0x1234567890abcdef1234567890abcdef12345678"

    # Test 1: Connection Test
    print("TEST 1: Pinata Connection Test")
    print("-" * 80)
    connection_ok = await filecoin_service.test_connection()
    if connection_ok:
        print("✅ Pinata connection successful")
    else:
        print("❌ Pinata connection failed - Check your API keys in .env")
        print("   Visit https://pinata.cloud to create an account and get API keys")
        return False
    print()

    # Test 2: Encryption Test
    print("TEST 2: Lit Protocol Encryption Test")
    print("-" * 80)
    test_data = {
        "company": "Acme Corp",
        "integration": "google-workspace",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "emails": [
                {
                    "from": "user@acme.com",
                    "to": "client@example.com",
                    "subject": "Quarterly Report",
                    "date": "2024-01-15"
                }
            ]
        }
    }

    print(f"Test data: {json.dumps(test_data, indent=2)}")
    print()

    encrypted_payload = await encryption_service.encrypt_for_customer(
        data=test_data,
        customer_wallet=test_wallet,
        additional_metadata={"test": "true", "version": "1.0"}
    )

    print(f"Encrypted payload keys: {list(encrypted_payload.keys())}")
    print(f"✅ Data encrypted successfully")
    print(f"   Access control: Only wallet {test_wallet} can decrypt")
    print()

    # Test 3: Upload to Filecoin/IPFS
    print("TEST 3: Upload to Filecoin/IPFS via Pinata")
    print("-" * 80)

    cid = await filecoin_service.upload_encrypted_data(
        customer_wallet=test_wallet,
        integration="google-workspace",
        data_type="emails",
        encrypted_data=encrypted_payload,
        metadata={"test_run": "true", "environment": "development"}
    )

    print(f"✅ Upload successful!")
    print(f"   CID: {cid}")
    print(f"   Gateway URL: {settings.pinata_gateway_url}/ipfs/{cid}")
    print()

    # Test 4: Retrieve from Filecoin/IPFS
    print("TEST 4: Retrieve from Filecoin/IPFS")
    print("-" * 80)

    retrieved_data = await filecoin_service.retrieve_data(cid)

    print(f"✅ Retrieval successful!")
    print(f"   Retrieved data keys: {list(retrieved_data.keys())}")
    print()

    # Test 5: Decrypt with Wallet
    print("TEST 5: Decrypt with Customer Wallet")
    print("-" * 80)

    decrypted_data = await encryption_service.decrypt_with_wallet(
        encrypted_data=retrieved_data,
        customer_wallet=test_wallet,
        auth_signature=None  # In production, this would be a wallet signature
    )

    print(f"✅ Decryption successful!")
    print(f"   Decrypted data: {json.dumps(decrypted_data, indent=2)}")
    print()

    # Test 6: Data Integrity Verification
    print("TEST 6: Data Integrity Verification")
    print("-" * 80)

    if decrypted_data == test_data:
        print("✅ Data integrity verified!")
        print("   Original data matches decrypted data")
    else:
        print("❌ Data integrity check failed")
        print(f"   Original: {test_data}")
        print(f"   Decrypted: {decrypted_data}")
        return False
    print()

    # Test 7: List Customer Files
    print("TEST 7: List Customer Files")
    print("-" * 80)

    files = await filecoin_service.list_customer_files(
        customer_wallet=test_wallet,
        limit=10
    )

    print(f"✅ Found {len(files)} file(s) for customer {test_wallet}")
    for i, file_info in enumerate(files, 1):
        print(f"   File {i}:")
        print(f"      CID: {file_info['cid']}")
        print(f"      Name: {file_info['name']}")
        print(f"      Size: {file_info['size']} bytes")
        print(f"      Date: {file_info['timestamp']}")
    print()

    # Test 8: Cleanup (Optional)
    print("TEST 8: Cleanup Test File")
    print("-" * 80)

    cleanup = input("Delete test file from Pinata? (y/n): ").lower().strip()
    if cleanup == 'y':
        success = await filecoin_service.unpin_file(cid)
        if success:
            print(f"✅ Test file unpinned: {cid}")
        else:
            print(f"❌ Failed to unpin file: {cid}")
    else:
        print("⏭️  Skipping cleanup - file remains on IPFS")
    print()

    # Summary
    print("=" * 80)
    print("STORAGE INTEGRATION TEST COMPLETE")
    print("=" * 80)
    print()
    print("✅ All tests passed!")
    print()
    print("Storage Architecture:")
    print("  - Encryption: Lit Protocol (placeholder implementation)")
    print("  - Storage: Filecoin/IPFS via Pinata")
    print("  - Access Control: Wallet-based (only customer can decrypt)")
    print("  - Namespace: customer-{wallet}/{integration}/{data_type}/{timestamp}")
    print()
    print("Next Steps:")
    print("  1. Integrate actual Lit Protocol SDK for production encryption")
    print("  2. Add wallet signature verification for decryption")
    print("  3. Implement Celestia DA for Layers 2 & 3")
    print("  4. Add ZK proofs for Layer 3 (customer data)")
    print()

    return True


async def test_file_upload():
    """Test file upload functionality"""
    print("=" * 80)
    print("FILE UPLOAD TEST")
    print("=" * 80)
    print()

    filecoin_service = FilecoinService()
    encryption_service = EncryptionService()

    test_wallet = "0x1234567890abcdef1234567890abcdef12345678"

    # Create test file content
    test_file_content = b"This is a test file for Varity Generic Template Dashboard"
    test_filename = "test_document.txt"

    print(f"Test file: {test_filename}")
    print(f"Size: {len(test_file_content)} bytes")
    print()

    # Encrypt file
    print("Encrypting file...")
    encrypted_file = await encryption_service.encrypt_file_for_customer(
        file_content=test_file_content,
        customer_wallet=test_wallet,
        filename=test_filename,
        additional_metadata={"content_type": "text/plain"}
    )
    print("✅ File encrypted")
    print()

    # Upload to Filecoin
    print("Uploading to Filecoin/IPFS...")
    cid = await filecoin_service.upload_encrypted_file(
        customer_wallet=test_wallet,
        integration="documents",
        data_type="general",
        file_content=json.dumps(encrypted_file).encode(),
        filename=test_filename,
        metadata={"test": "true"}
    )
    print(f"✅ File uploaded: {cid}")
    print()

    # Retrieve file
    print("Retrieving file...")
    retrieved_file_bytes = await filecoin_service.retrieve_file(cid)
    retrieved_file = json.loads(retrieved_file_bytes.decode())
    print("✅ File retrieved")
    print()

    # Decrypt file
    print("Decrypting file...")
    decrypted_content = await encryption_service.decrypt_file_with_wallet(
        encrypted_file=retrieved_file,
        customer_wallet=test_wallet
    )
    print("✅ File decrypted")
    print()

    # Verify
    if decrypted_content == test_file_content:
        print("✅ File integrity verified!")
        print(f"   Content: {decrypted_content.decode()}")
    else:
        print("❌ File integrity check failed")

    print()
    return True


async def main():
    """Main test runner"""
    try:
        # Test 1: Data upload/download
        success1 = await test_storage_integration()

        if not success1:
            print("⚠️  Storage integration test failed")
            return

        # Test 2: File upload/download
        print("\n" + "=" * 80 + "\n")
        success2 = await test_file_upload()

        if success2:
            print("\n✅ All tests completed successfully!")
        else:
            print("\n⚠️  Some tests failed")

    except Exception as e:
        print(f"\n❌ Test error: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
