#!/usr/bin/env python3
"""
Test AI Chat Endpoint with Proper Wallet Authentication
"""
import time
import requests
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct

# Configuration
API_URL = "http://localhost:8001"
PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"  # Test private key
account = Account.from_key(PRIVATE_KEY)
WALLET_ADDRESS = account.address

def sign_message(message: str) -> str:
    """Sign a message with the test wallet"""
    w3 = Web3()
    message_hash = encode_defunct(text=message)
    signed_message = w3.eth.account.sign_message(message_hash, private_key=PRIVATE_KEY)
    return signed_message.signature.hex()

def test_ai_chat():
    """Test the AI chat endpoint with proper authentication"""
    # Prepare authentication
    timestamp = int(time.time())
    message = f"Authentication request at {timestamp}"
    signature = sign_message(message)

    # Request headers
    headers = {
        "Content-Type": "application/json",
        "X-Wallet-Address": WALLET_ADDRESS,
        "X-Signature": signature,
        "X-Message": message,
        "X-Timestamp": str(timestamp)
    }

    # Request body
    payload = {
        "message": "What is Varity?",
        "wallet_address": WALLET_ADDRESS
    }

    print(f"Testing AI Chat Endpoint")
    print(f"Wallet: {WALLET_ADDRESS}")
    print(f"Timestamp: {timestamp}")
    print(f"Signature: {signature[:20]}...")
    print(f"Message: {message}")
    print()

    # Make request
    response = requests.post(
        f"{API_URL}/api/v1/ai/chat",
        headers=headers,
        json=payload
    )

    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(response.json())

    return response

if __name__ == "__main__":
    test_ai_chat()
