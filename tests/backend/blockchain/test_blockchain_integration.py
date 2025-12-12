#!/usr/bin/env python3
"""
Test script to verify blockchain service integration with marketplace contracts.

This script tests that:
1. Contract ABIs are loaded correctly
2. Contract instances are created with correct addresses
3. Web3 connection to Arbitrum Sepolia works
4. Basic contract read methods work
"""

import sys
import os
import asyncio

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

from services.blockchain_service import BlockchainService
from core.testnet_addresses import TESTNET_CONTRACTS, get_network_config


def test_connection():
    """Test Web3 connection to Arbitrum Sepolia."""
    print("\n" + "="*70)
    print("TEST 1: Web3 Connection")
    print("="*70)

    service = BlockchainService(network="testnet")

    is_connected = service.is_connected()
    print(f"✓ Connected to RPC: {is_connected}")

    if is_connected:
        chain_id = service.get_chain_id()
        block_number = service.get_block_number()
        print(f"✓ Chain ID: {chain_id}")
        print(f"✓ Latest Block: {block_number}")

        expected_chain_id = 421614  # Arbitrum Sepolia
        if chain_id == expected_chain_id:
            print(f"✓ Chain ID matches Arbitrum Sepolia ({expected_chain_id})")
        else:
            print(f"✗ WARNING: Chain ID {chain_id} does not match expected {expected_chain_id}")

    return is_connected


def test_contract_abis():
    """Test that contract ABIs are loaded."""
    print("\n" + "="*70)
    print("TEST 2: Contract ABI Loading")
    print("="*70)

    service = BlockchainService(network="testnet")

    expected_contracts = ["ToolMarketplace", "ToolLicenseNFT", "SubscriptionBilling", "RevenueSplitter"]

    all_loaded = True
    for contract_name in expected_contracts:
        if contract_name in service.abis and len(service.abis[contract_name]) > 0:
            print(f"✓ {contract_name} ABI loaded ({len(service.abis[contract_name])} items)")
        else:
            print(f"✗ {contract_name} ABI NOT loaded")
            all_loaded = False

    return all_loaded


def test_contract_instances():
    """Test that contract instances are created with correct addresses."""
    print("\n" + "="*70)
    print("TEST 3: Contract Instance Creation")
    print("="*70)

    service = BlockchainService(network="testnet")

    all_initialized = True
    for contract_name, expected_address in TESTNET_CONTRACTS.items():
        if contract_name == "USDC":  # Skip USDC token
            continue

        if contract_name in service.contracts:
            contract = service.contracts[contract_name]
            actual_address = contract.address
            print(f"✓ {contract_name}:")
            print(f"  Address: {actual_address}")

            if actual_address.lower() == expected_address.lower():
                print(f"  ✓ Address matches testnet_addresses.py")
            else:
                print(f"  ✗ Address mismatch!")
                print(f"    Expected: {expected_address}")
                print(f"    Actual:   {actual_address}")
                all_initialized = False
        else:
            print(f"✗ {contract_name} NOT initialized")
            all_initialized = False

    return all_initialized


async def test_marketplace_methods():
    """Test marketplace contract read methods."""
    print("\n" + "="*70)
    print("TEST 4: Marketplace Contract Methods")
    print("="*70)

    service = BlockchainService(network="testnet")

    all_passed = True

    # Test 1: Get active tools
    try:
        print("\nTest 4.1: get_active_tools()")
        active_tools = await service.get_active_tools()
        print(f"✓ Active tools: {active_tools}")
        print(f"  Count: {len(active_tools)}")
    except Exception as e:
        print(f"✗ get_active_tools() failed: {e}")
        all_passed = False

    # Test 2: Check license ownership (test wallet)
    try:
        print("\nTest 4.2: has_license()")
        test_wallet = "0x20B7d1426649D9a573ba7Fd10592456264220cbF"  # Deployer wallet
        test_tool_id = 1
        has_license = await service.has_license(test_wallet, test_tool_id)
        print(f"✓ Wallet {test_wallet[:10]}... has license for tool {test_tool_id}: {has_license}")
    except Exception as e:
        print(f"✗ has_license() failed: {e}")
        all_passed = False

    # Test 3: Get user licenses
    try:
        print("\nTest 4.3: get_user_licenses()")
        test_wallet = "0x20B7d1426649D9a573ba7Fd10592456264220cbF"
        licenses = await service.get_user_licenses(test_wallet)
        print(f"✓ Wallet {test_wallet[:10]}... owns licenses: {licenses}")
    except Exception as e:
        print(f"✗ get_user_licenses() failed: {e}")
        all_passed = False

    # Test 4: Check subscription status
    try:
        print("\nTest 4.4: has_active_subscription()")
        test_wallet = "0x20B7d1426649D9a573ba7Fd10592456264220cbF"
        test_tool_id = 1
        has_subscription = await service.has_active_subscription(test_wallet, test_tool_id)
        print(f"✓ Wallet {test_wallet[:10]}... has active subscription for tool {test_tool_id}: {has_subscription}")
    except Exception as e:
        print(f"✗ has_active_subscription() failed: {e}")
        all_passed = False

    # Test 5: Get tool metadata (if tool exists)
    try:
        print("\nTest 4.5: get_tool_metadata()")
        test_tool_id = 1
        metadata = await service.get_tool_metadata(test_tool_id)
        if metadata:
            print(f"✓ Tool {test_tool_id} metadata:")
            print(f"  Name: {metadata.get('name', 'N/A')}")
            print(f"  Price: {metadata.get('price', 0)} ETH")
            print(f"  Active: {metadata.get('is_active', False)}")
        else:
            print(f"  Tool {test_tool_id} not found (this is OK if no tools registered)")
    except Exception as e:
        print(f"✗ get_tool_metadata() failed: {e}")
        all_passed = False

    return all_passed


def test_network_info():
    """Test network information methods."""
    print("\n" + "="*70)
    print("TEST 5: Network Information")
    print("="*70)

    service = BlockchainService(network="testnet")

    network_info = service.get_network_info()
    print(f"Network: {network_info['network']}")
    print(f"Chain ID: {network_info['chain_id']}")
    print(f"RPC URL: {network_info['rpc_url']}")
    print(f"Connected: {network_info['is_connected']}")
    print(f"Block Number: {network_info['block_number']}")
    print(f"Contracts: {', '.join(network_info['contracts'])}")

    contract_addresses = service.get_contract_addresses()
    print("\nContract Addresses:")
    for name, address in contract_addresses.items():
        if name != "USDC":
            print(f"  {name}: {address}")

    return True


async def main():
    """Run all tests."""
    print("\n" + "="*70)
    print("BLOCKCHAIN SERVICE INTEGRATION TESTS")
    print("Generic Company Dashboard - Marketplace Contracts")
    print("="*70)

    results = {}

    # Run tests
    results["connection"] = test_connection()
    results["abis"] = test_contract_abis()
    results["instances"] = test_contract_instances()
    results["methods"] = await test_marketplace_methods()
    results["network_info"] = test_network_info()

    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)

    all_passed = True
    for test_name, passed in results.items():
        status = "✓ PASSED" if passed else "✗ FAILED"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "="*70)
    if all_passed:
        print("ALL TESTS PASSED ✓")
    else:
        print("SOME TESTS FAILED ✗")
    print("="*70 + "\n")

    return 0 if all_passed else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
