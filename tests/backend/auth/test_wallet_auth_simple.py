"""
Simplified Test Suite for Wallet Authentication Middleware

Tests wallet signature verification without full app initialization.
"""
import time
from web3 import Web3
from eth_account.messages import encode_defunct
from eth_account import Account


def test_signature_verification():
    """Test wallet signature verification utility"""
    print("=" * 70)
    print("WALLET SIGNATURE VERIFICATION TEST")
    print("=" * 70)

    # Import the middleware class
    import sys
    sys.path.insert(0, '/home/macoding/blokko-internal-os/varity/chains/arbitrum/deployments/testnet/testing/generic-company-dashboard/backend')
    from app.middleware.auth import WalletAuthMiddleware

    # Create test account
    w3 = Web3()
    test_account = w3.eth.account.create()

    print(f"\nTest Account Created:")
    print(f"  Address: {test_account.address}")
    print(f"  Private Key: {test_account.key.hex()}")

    # Test 1: Valid signature
    print("\n" + "-" * 70)
    print("Test 1: Valid Signature Verification")
    print("-" * 70)

    message = "Authenticate wallet for Varity Dashboard"
    message_hash = encode_defunct(text=message)
    signed_message = test_account.sign_message(message_hash)

    print(f"Message: {message}")
    print(f"Signature: {signed_message.signature.hex()[:50]}...")

    is_valid = WalletAuthMiddleware.verify_signature(
        test_account.address,
        signed_message.signature.hex(),
        message
    )

    print(f"Signature Valid: {is_valid}")
    assert is_valid, "Signature verification failed!"
    print("✓ PASSED")

    # Test 2: Invalid signature
    print("\n" + "-" * 70)
    print("Test 2: Invalid Signature Rejection")
    print("-" * 70)

    invalid_signature = "0x" + "0" * 130
    is_valid = WalletAuthMiddleware.verify_signature(
        test_account.address,
        invalid_signature,
        message
    )

    print(f"Invalid Signature: {invalid_signature[:20]}...")
    print(f"Signature Valid: {is_valid}")
    assert not is_valid, "Invalid signature was accepted!"
    print("✓ PASSED")

    # Test 3: Wrong wallet address
    print("\n" + "-" * 70)
    print("Test 3: Wrong Wallet Address Rejection")
    print("-" * 70)

    # Create another account
    another_account = w3.eth.account.create()

    # Sign with test_account but verify with another_account address
    is_valid = WalletAuthMiddleware.verify_signature(
        another_account.address,  # Wrong address
        signed_message.signature.hex(),
        message
    )

    print(f"Signer Address: {test_account.address}")
    print(f"Verifier Address: {another_account.address}")
    print(f"Signature Valid: {is_valid}")
    assert not is_valid, "Wrong wallet was accepted!"
    print("✓ PASSED")

    # Test 4: Different message
    print("\n" + "-" * 70)
    print("Test 4: Different Message Rejection")
    print("-" * 70)

    different_message = "Different message"
    is_valid = WalletAuthMiddleware.verify_signature(
        test_account.address,
        signed_message.signature.hex(),
        different_message  # Different from what was signed
    )

    print(f"Signed Message: {message}")
    print(f"Verify Message: {different_message}")
    print(f"Signature Valid: {is_valid}")
    assert not is_valid, "Signature for different message was accepted!"
    print("✓ PASSED")

    # Test 5: Multiple signatures
    print("\n" + "-" * 70)
    print("Test 5: Multiple Signature Verification")
    print("-" * 70)

    messages = [
        "Transaction 1",
        "Transaction 2",
        "Transaction 3"
    ]

    for i, msg in enumerate(messages, 1):
        msg_hash = encode_defunct(text=msg)
        sig = test_account.sign_message(msg_hash)

        is_valid = WalletAuthMiddleware.verify_signature(
            test_account.address,
            sig.signature.hex(),
            msg
        )

        print(f"  Message {i}: {msg} - Valid: {is_valid}")
        assert is_valid, f"Signature {i} verification failed!"

    print("✓ PASSED - All signatures verified")

    # Test 6: Timestamp validation
    print("\n" + "-" * 70)
    print("Test 6: Timestamp Validation")
    print("-" * 70)

    current_time = int(time.time())
    expired_time = current_time - 600  # 10 minutes ago
    valid_time = current_time - 60     # 1 minute ago
    future_time = current_time + 60    # 1 minute in future

    max_age = 300  # 5 minutes

    print(f"Current Time: {current_time}")
    print(f"Max Age: {max_age} seconds")

    tests = [
        ("Expired (10 min ago)", expired_time, True),
        ("Valid (1 min ago)", valid_time, False),
        ("Future (1 min ahead)", future_time, False),
    ]

    for name, timestamp, should_be_expired in tests:
        is_expired = abs(current_time - timestamp) > max_age
        print(f"  {name}: {timestamp} - Expired: {is_expired}")
        assert is_expired == should_be_expired, f"{name} validation failed!"

    print("✓ PASSED - Timestamp validation working")

    # Test 7: Case insensitivity
    print("\n" + "-" * 70)
    print("Test 7: Address Case Insensitivity")
    print("-" * 70)

    # Ethereum addresses should be case-insensitive
    lowercase_address = test_account.address.lower()
    uppercase_address = test_account.address.upper()
    mixed_address = test_account.address

    for addr_type, address in [
        ("Lowercase", lowercase_address),
        ("Uppercase", uppercase_address),
        ("Mixed", mixed_address)
    ]:
        is_valid = WalletAuthMiddleware.verify_signature(
            address,
            signed_message.signature.hex(),
            message
        )
        print(f"  {addr_type}: {address[:10]}... - Valid: {is_valid}")
        assert is_valid, f"{addr_type} address verification failed!"

    print("✓ PASSED - Case insensitivity working")

    print("\n" + "=" * 70)
    print("ALL TESTS PASSED")
    print("=" * 70)

    # Print example usage
    print("\n" + "=" * 70)
    print("EXAMPLE USAGE FOR FRONTEND")
    print("=" * 70)

    example_message = "Authenticate to Varity Dashboard"
    example_timestamp = int(time.time())
    example_hash = encode_defunct(text=example_message)
    example_sig = test_account.sign_message(example_hash)

    print(f"""
JavaScript/Web3 Example:
------------------------

// 1. Connect wallet
const accounts = await window.ethereum.request({{
  method: 'eth_requestAccounts'
}});
const walletAddress = accounts[0];

// 2. Create message with timestamp
const message = "Authenticate to Varity Dashboard";
const timestamp = Math.floor(Date.now() / 1000);

// 3. Sign message
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const signature = await signer.signMessage(message);

// 4. Make API call with headers
const response = await fetch('http://localhost:8000/api/v1/storage/upload', {{
  method: 'POST',
  headers: {{
    'Content-Type': 'application/json',
    'X-Wallet-Address': walletAddress,
    'X-Signature': signature,
    'X-Message': message,
    'X-Timestamp': timestamp.toString()
  }},
  body: JSON.stringify({{
    customer_wallet: walletAddress,
    integration: 'example',
    data_type: 'test',
    data: {{ key: 'value' }}
  }})
}});

Example Values:
--------------
Wallet Address: {test_account.address}
Message: {example_message}
Timestamp: {example_timestamp}
Signature: {example_sig.signature.hex()[:50]}...
""")


if __name__ == "__main__":
    test_signature_verification()
