"""
Testnet Contract Addresses Configuration

This module contains contract addresses for the Varity Generic Template Dashboard
deployed on Arbitrum Sepolia testnet and Varity L3 Testnet.

Deployment Information:
- Network: Varity L3 Testnet (Primary)
- Chain ID: 33529
- Deployment Date: 2025-11-16
- Deployer: 0x20B7d1426649D9a573ba7Fd10592456264220cbF
"""

from typing import Dict, Any

# ============================================================================
# CONTRACT ADDRESSES - Varity L3 Testnet (Primary Active Network)
# ============================================================================

TESTNET_CONTRACTS = {
    # Marketplace Contracts - Deployed on Varity L3 Testnet
    "ToolMarketplace": "0xa6A4c92C42a72A6946Dd304c4Ec10a84B0E98598",
    "ToolLicenseNFT": "0x56125b00de0eB47a77417c10E633B47bC631715d",
    "SubscriptionBilling": "0x055E9111520047c1f4c754269CC84908fF62157B",
    "RevenueSplitter": "0xc48f586717Cc471EddF4b87B2046280D07e460FA",

    # Supporting Tokens
    "USDC": "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
}

# Legacy Arbitrum Sepolia Deployment (Inactive)
LEGACY_SEPOLIA_CONTRACTS = {
    "ToolMarketplace": "0x4d616Fa054e319D4966aEcEDb44eaE1dc899dA57",
    "ToolLicenseNFT": "0xcCEEDA3cD3F44B11B659DBb88056ECbCeadD457B",
    "SubscriptionBilling": "0x1c49E0e2Be12358C1c61b51aFB76Db8284b1ae76",
    "RevenueSplitter": "0xEca860889662530f5608c6193526Cae6CE3a1b22",
    "USDC": "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
}


# ============================================================================
# NETWORK CONFIGURATION
# ============================================================================

NETWORK_CONFIG = {
    "testnet": {
        "name": "Varity L3 Testnet",
        "chain_id": 33529,
        "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "currency": {
            "name": "USDC",
            "symbol": "USDC",
            "decimals": 6
        }
    },
    "varity_testnet": {
        "name": "Varity L3 Testnet",
        "chain_id": 33529,
        "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "currency": {
            "name": "USDC",
            "symbol": "USDC",
            "decimals": 6
        }
    },
    "localhost": {
        "name": "Localhost",
        "chain_id": 31337,
        "rpc_url": "http://127.0.0.1:8545",
        "explorer_url": "http://localhost:8545",
        "currency": {
            "name": "Ethereum",
            "symbol": "ETH",
            "decimals": 18
        }
    }
}


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_contract_address(contract_name: str, network: str = "testnet") -> str:
    """
    Get the deployed address for a specific contract.

    Args:
        contract_name: Name of the contract (e.g., "ToolMarketplace")
        network: Network identifier ("testnet", "varity_testnet", "localhost")

    Returns:
        Contract address as a string

    Raises:
        KeyError: If contract name not found
    """
    if network == "testnet" or network == "varity_testnet":
        return TESTNET_CONTRACTS.get(contract_name, "0x0000000000000000000000000000000000000000")
    else:
        # For localhost, contracts need to be deployed separately
        return "0x0000000000000000000000000000000000000000"


def get_all_contracts(network: str = "testnet") -> Dict[str, str]:
    """
    Get all deployed contract addresses for a network.

    Args:
        network: Network identifier

    Returns:
        Dictionary mapping contract names to addresses
    """
    if network == "testnet" or network == "varity_testnet":
        return TESTNET_CONTRACTS.copy()
    else:
        return {name: "0x0000000000000000000000000000000000000000" for name in TESTNET_CONTRACTS.keys()}


def get_network_config(network: str = "testnet") -> Dict[str, Any]:
    """
    Get network configuration.

    Args:
        network: Network identifier

    Returns:
        Network configuration dictionary

    Raises:
        KeyError: If network not found
    """
    return NETWORK_CONFIG.get(network, NETWORK_CONFIG["testnet"])


def is_contract_deployed(contract_name: str, network: str = "testnet") -> bool:
    """
    Check if a contract is deployed on the specified network.

    Args:
        contract_name: Name of the contract
        network: Network identifier

    Returns:
        True if contract is deployed (non-zero address), False otherwise
    """
    address = get_contract_address(contract_name, network)
    return address != "0x0000000000000000000000000000000000000000"


# ============================================================================
# DEPLOYMENT METADATA
# ============================================================================

DEPLOYMENT_INFO = {
    "varity_testnet": {
        "network": "varity_l3_testnet",
        "chain_id": "33529",
        "deployer": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "timestamp": "2025-11-16T20:25:00.000Z",
        "usdc_address": "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
        "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "varity_treasury": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "admin": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "tools_listed": 8
    },
    "testnet": {
        "network": "varity_l3_testnet",
        "chain_id": "33529",
        "deployer": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "timestamp": "2025-11-16T20:25:00.000Z",
        "usdc_address": "0x6Fd8ee6B4C2193e9E2e0E2EC5D295689B607c0cE",
        "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
        "varity_treasury": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "admin": "0x20B7d1426649D9a573ba7Fd10592456264220cbF",
        "tools_listed": 8
    }
}


def get_deployment_info(network: str = "testnet") -> Dict[str, Any]:
    """
    Get deployment metadata for a network.

    Args:
        network: Network identifier

    Returns:
        Deployment information dictionary
    """
    return DEPLOYMENT_INFO.get(network, {})
