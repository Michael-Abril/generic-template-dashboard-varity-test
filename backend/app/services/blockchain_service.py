"""
Blockchain Service for Generic Company Dashboard

This service provides comprehensive blockchain integration using web3.py to interact
with deployed marketplace smart contracts on Arbitrum Sepolia testnet.

Features:
- Web3 client initialization and connection management
- Contract instance creation for marketplace contracts (ToolMarketplace, ToolLicenseNFT, etc.)
- Read methods for querying blockchain state (NFT ownership, licenses, subscriptions)
- Write methods for transaction submission (future implementation)
- Error handling and retry logic
- Network configuration management
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from decimal import Decimal

from web3 import Web3
from web3.contract import Contract
from web3.exceptions import ContractLogicError, TimeExhausted
from eth_typing import Address, ChecksumAddress

from app.core.testnet_addresses import (
    get_contract_address,
    get_all_contracts,
    get_network_config,
    TESTNET_CONTRACTS,
    NETWORK_CONFIG
)

logger = logging.getLogger(__name__)


class BlockchainService:
    """
    Comprehensive blockchain service for interacting with ISO Dashboard smart contracts.

    This service manages Web3 connections and provides methods to read/write data
    from deployed smart contracts on Arbitrum Sepolia.
    """

    def __init__(self, network: str = None, rpc_url: str = None):
        """
        Initialize the blockchain service.

        Args:
            network: Network mode ("localhost", "testnet", "mainnet")
            rpc_url: Custom RPC URL (overrides network default)
        """
        self.network = network or os.getenv("NETWORK_MODE", "testnet")
        self.network_config = get_network_config(self.network)

        # Use custom RPC URL or default from network config
        # Check VARITY_L3_RPC first, then BLOCKCHAIN_RPC_URL, then network config
        self.rpc_url = rpc_url or os.getenv("VARITY_L3_RPC") or os.getenv("BLOCKCHAIN_RPC_URL") or self.network_config["rpc_url"]

        # Initialize Web3 instance
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))

        # Contract instances
        self.contracts: Dict[str, Contract] = {}

        # Load contract ABIs
        self.abis = self._load_contract_abis()

        # Initialize contract instances
        self._initialize_contracts()

        logger.info(f"Blockchain service initialized for {self.network} network")
        logger.info(f"Connected to RPC: {self.rpc_url}")
        logger.info(f"Chain ID: {self.network_config['chain_id']}")
        logger.info(f"Is connected: {self.w3.is_connected()}")

    def _load_contract_abis(self) -> Dict[str, List[Dict]]:
        """
        Load contract ABIs from JSON files.

        Returns:
            Dictionary mapping contract names to their ABIs
        """
        abis = {}
        contracts_dir = Path(__file__).parent.parent / "contracts" / "abis"

        # Marketplace smart contracts
        contract_files = {
            "ToolMarketplace": "ToolMarketplace.json",
            "ToolLicenseNFT": "ToolLicenseNFT.json",
            "SubscriptionBilling": "SubscriptionBilling.json",
            "RevenueSplitter": "RevenueSplitter.json",
        }

        for contract_name, filename in contract_files.items():
            filepath = contracts_dir / filename
            try:
                with open(filepath, 'r') as f:
                    contract_data = json.load(f)
                    # Check if it's already an ABI array or wrapped in an object
                    if isinstance(contract_data, list):
                        abis[contract_name] = contract_data
                    elif isinstance(contract_data, dict) and "abi" in contract_data:
                        abis[contract_name] = contract_data["abi"]
                    else:
                        abis[contract_name] = contract_data
                logger.info(f"Loaded ABI for {contract_name} ({len(abis[contract_name])} items)")
            except Exception as e:
                logger.error(f"Failed to load ABI for {contract_name}: {e}")
                abis[contract_name] = []

        return abis

    def _initialize_contracts(self) -> None:
        """
        Initialize contract instances with addresses and ABIs.
        """
        contract_addresses = get_all_contracts(self.network)

        for contract_name, address in contract_addresses.items():
            if address == "0x0000000000000000000000000000000000000000":
                logger.warning(f"Skipping {contract_name} - not deployed yet")
                continue

            if contract_name not in self.abis:
                logger.warning(f"No ABI found for {contract_name}")
                continue

            try:
                checksum_address = self.w3.to_checksum_address(address)
                self.contracts[contract_name] = self.w3.eth.contract(
                    address=checksum_address,
                    abi=self.abis[contract_name]
                )
                logger.info(f"Initialized {contract_name} at {checksum_address}")
            except Exception as e:
                logger.error(f"Failed to initialize {contract_name}: {e}")

    # ==================== Connection Methods ====================

    def is_connected(self) -> bool:
        """Check if Web3 is connected to the blockchain."""
        return self.w3.is_connected()

    def get_block_number(self) -> int:
        """Get the latest block number."""
        try:
            return self.w3.eth.block_number
        except Exception as e:
            logger.error(f"Failed to get block number: {e}")
            return 0

    def get_chain_id(self) -> int:
        """Get the chain ID."""
        try:
            return self.w3.eth.chain_id
        except Exception as e:
            logger.error(f"Failed to get chain ID: {e}")
            return 0

    # ==================== ToolMarketplace Methods ====================

    async def get_active_tools(self) -> List[int]:
        """
        Get list of all active tool IDs from the marketplace.

        Returns:
            List of active tool IDs
        """
        try:
            contract = self.contracts.get("ToolMarketplace")
            if not contract:
                logger.error("ToolMarketplace contract not initialized")
                return []

            # Call getActiveTools function
            tool_ids = contract.functions.getActiveTools().call()
            return [int(tool_id) for tool_id in tool_ids]

        except Exception as e:
            logger.error(f"Error getting active tools: {e}")
            return []

    async def get_tool_metadata(self, tool_id: int) -> Optional[Dict[str, Any]]:
        """
        Get tool metadata including price and details from ToolLicenseNFT contract.

        Args:
            tool_id: The tool's unique ID

        Returns:
            Dictionary containing tool metadata or None if not found
        """
        try:
            contract = self.contracts.get("ToolLicenseNFT")
            if not contract:
                logger.error("ToolLicenseNFT contract not initialized")
                return None

            # Call getToolMetadata function
            metadata = contract.functions.getToolMetadata(tool_id).call()

            return {
                "tool_id": tool_id,
                "name": metadata[0] if len(metadata) > 0 else "",
                "description": metadata[1] if len(metadata) > 1 else "",
                "price": self.w3.from_wei(metadata[2], 'ether') if len(metadata) > 2 else 0,
                "creator": metadata[3] if len(metadata) > 3 else "",
                "is_active": metadata[4] if len(metadata) > 4 else False,
            }

        except Exception as e:
            logger.error(f"Error getting tool metadata for tool {tool_id}: {e}")
            return None

    # ==================== ToolLicenseNFT Methods ====================

    async def has_license(self, customer_wallet: str, tool_id: int) -> bool:
        """
        Check if customer owns license NFT for a specific tool.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool's ID

        Returns:
            True if customer owns the license NFT, False otherwise
        """
        try:
            contract = self.contracts.get("ToolLicenseNFT")
            if not contract:
                logger.error("ToolLicenseNFT contract not initialized")
                return False

            checksum_address = self.w3.to_checksum_address(customer_wallet)

            # Call balanceOf(address, uint256) - ERC-1155 function
            balance = contract.functions.balanceOf(checksum_address, tool_id).call()

            return int(balance) > 0

        except Exception as e:
            logger.error(f"Error checking license for wallet {customer_wallet}, tool {tool_id}: {e}")
            return False

    async def get_user_licenses(self, customer_wallet: str) -> List[int]:
        """
        Get all tool IDs that user has licenses for.

        Args:
            customer_wallet: Customer's wallet address

        Returns:
            List of tool IDs that user owns licenses for
        """
        try:
            contract = self.contracts.get("ToolLicenseNFT")
            if not contract:
                logger.error("ToolLicenseNFT contract not initialized")
                return []

            checksum_address = self.w3.to_checksum_address(customer_wallet)

            # Call getUserLicenses function
            tool_ids = contract.functions.getUserLicenses(checksum_address).call()
            return [int(tool_id) for tool_id in tool_ids]

        except Exception as e:
            logger.error(f"Error getting licenses for wallet {customer_wallet}: {e}")
            return []

    async def get_license_balance(self, customer_wallet: str, tool_id: int) -> int:
        """
        Get the balance of license NFTs for a specific tool.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool's ID

        Returns:
            Balance of license NFTs (usually 0 or 1)
        """
        try:
            contract = self.contracts.get("ToolLicenseNFT")
            if not contract:
                logger.error("ToolLicenseNFT contract not initialized")
                return 0

            checksum_address = self.w3.to_checksum_address(customer_wallet)
            balance = contract.functions.balanceOf(checksum_address, tool_id).call()

            return int(balance)

        except Exception as e:
            logger.error(f"Error getting balance for wallet {customer_wallet}, tool {tool_id}: {e}")
            return 0

    # ==================== SubscriptionBilling Methods ====================

    async def has_active_subscription(self, customer_wallet: str, tool_id: int) -> bool:
        """
        Check if subscription is active and not expired.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool's ID

        Returns:
            True if subscription is active, False otherwise
        """
        try:
            contract = self.contracts.get("SubscriptionBilling")
            if not contract:
                logger.error("SubscriptionBilling contract not initialized")
                return False

            checksum_address = self.w3.to_checksum_address(customer_wallet)

            # Call hasActiveSubscription function
            is_active = contract.functions.hasActiveSubscription(checksum_address, tool_id).call()

            return bool(is_active)

        except Exception as e:
            logger.error(f"Error checking subscription for wallet {customer_wallet}, tool {tool_id}: {e}")
            return False

    async def get_subscription_expiry(self, customer_wallet: str, tool_id: int) -> Optional[int]:
        """
        Get the subscription expiry timestamp.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool's ID

        Returns:
            Expiry timestamp (Unix epoch) or None if no subscription
        """
        try:
            contract = self.contracts.get("SubscriptionBilling")
            if not contract:
                logger.error("SubscriptionBilling contract not initialized")
                return None

            checksum_address = self.w3.to_checksum_address(customer_wallet)

            # Call getSubscriptionExpiry function
            expiry = contract.functions.getSubscriptionExpiry(checksum_address, tool_id).call()

            return int(expiry) if expiry > 0 else None

        except Exception as e:
            logger.error(f"Error getting subscription expiry for wallet {customer_wallet}, tool {tool_id}: {e}")
            return None

    # ==================== RevenueSplitter Methods ====================

    async def get_revenue_split(self, tool_id: int) -> Optional[Dict[str, Any]]:
        """
        Get revenue split configuration for a tool.

        Args:
            tool_id: The tool's ID

        Returns:
            Dictionary containing revenue split percentages or None if not found
        """
        try:
            contract = self.contracts.get("RevenueSplitter")
            if not contract:
                logger.error("RevenueSplitter contract not initialized")
                return None

            # Call getRevenueSplit function
            split = contract.functions.getRevenueSplit(tool_id).call()

            return {
                "tool_id": tool_id,
                "creator_percentage": int(split[0]) / 100 if len(split) > 0 else 0,  # Basis points to percentage
                "platform_percentage": int(split[1]) / 100 if len(split) > 1 else 0,
                "treasury_percentage": int(split[2]) / 100 if len(split) > 2 else 0,
            }

        except Exception as e:
            logger.error(f"Error getting revenue split for tool {tool_id}: {e}")
            return None

    # ==================== Write Methods (Transaction Submission) ====================

    async def mint_license_nft(
        self,
        customer_wallet: str,
        tool_id: int,
        purchase_id: int,
        admin_private_key: Optional[str] = None
    ) -> Tuple[str, Optional[int]]:
        """
        Mint a license NFT to customer wallet.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool/product ID
            purchase_id: Database purchase record ID for tracking
            admin_private_key: Admin's private key for signing (from environment if not provided)

        Returns:
            Tuple of (transaction_hash, token_id)

        Raises:
            Exception: If minting fails
        """
        try:
            contract = self.contracts.get("ToolLicenseNFT")
            if not contract:
                raise Exception("ToolLicenseNFT contract not initialized")

            # Get admin private key from environment
            if not admin_private_key:
                admin_private_key = os.getenv("ADMIN_PRIVATE_KEY")
                if not admin_private_key:
                    raise Exception("ADMIN_PRIVATE_KEY not found in environment")

            # Create account from private key
            from eth_account import Account
            admin_account = Account.from_key(admin_private_key)
            admin_wallet = admin_account.address

            checksum_customer_address = self.w3.to_checksum_address(customer_wallet)

            logger.info(f"Minting NFT for tool {tool_id} to customer {checksum_customer_address}")

            # Build the transaction
            nonce = self.w3.eth.get_transaction_count(admin_wallet)
            gas_price = self.w3.eth.gas_price

            # Estimate gas
            gas_estimate = contract.functions.mint(
                checksum_customer_address,
                tool_id
            ).estimate_gas({'from': admin_wallet})

            # Add 20% buffer to gas estimate
            gas_limit = int(gas_estimate * 1.2)

            # Build transaction
            tx = contract.functions.mint(
                checksum_customer_address,
                tool_id
            ).build_transaction({
                'from': admin_wallet,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'nonce': nonce,
                'chainId': self.get_chain_id()
            })

            # Sign transaction
            signed_tx = admin_account.sign_transaction(tx)

            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()

            logger.info(f"NFT minting transaction sent: {tx_hash_hex}")

            # Wait for transaction receipt (with timeout)
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] != 1:
                raise Exception(f"Transaction failed with status {receipt['status']}")

            # Parse event logs to get token ID
            token_id = self._get_token_id_from_receipt(receipt, contract)

            logger.info(f"NFT minted successfully! Token ID: {token_id}, TX: {tx_hash_hex}")

            return tx_hash_hex, token_id

        except Exception as e:
            logger.error(f"NFT minting failed: {e}", exc_info=True)
            raise Exception(f"NFT minting failed: {str(e)}")

    def _get_token_id_from_receipt(self, receipt: Dict[str, Any], contract: Contract) -> Optional[int]:
        """
        Extract token ID from TransferSingle event in transaction receipt.

        Args:
            receipt: Transaction receipt
            contract: ToolLicenseNFT contract instance

        Returns:
            Token ID if found, None otherwise
        """
        try:
            # Get TransferSingle event
            transfer_events = contract.events.TransferSingle().process_receipt(receipt)

            if transfer_events and len(transfer_events) > 0:
                # Return the token ID from the first TransferSingle event
                token_id = transfer_events[0]['args']['id']
                return int(token_id)

            logger.warning("No TransferSingle event found in receipt")
            return None

        except Exception as e:
            logger.error(f"Failed to parse token ID from receipt: {e}")
            return None

    async def wait_for_transaction(self, tx_hash: str, timeout: int = 120) -> Dict[str, Any]:
        """
        Wait for transaction confirmation.

        Args:
            tx_hash: Transaction hash
            timeout: Maximum time to wait in seconds

        Returns:
            Transaction receipt

        Raises:
            TimeExhausted: If transaction not confirmed within timeout
        """
        try:
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=timeout)
            return dict(receipt)
        except TimeExhausted:
            raise Exception(f"Transaction {tx_hash} not confirmed within {timeout} seconds")

    async def distribute_revenue(
        self,
        tool_id: int,
        purchase_amount: float,
        admin_private_key: Optional[str] = None
    ) -> str:
        """
        Distribute revenue between platform and developer via RevenueSplitter contract.

        Args:
            tool_id: The tool/product ID
            purchase_amount: Total purchase amount in USDC (human-readable, e.g., 100.50)
            admin_private_key: Admin's private key for signing

        Returns:
            Transaction hash

        Raises:
            Exception: If distribution fails
        """
        try:
            revenue_contract = self.contracts.get("RevenueSplitter")
            usdc_contract = self.contracts.get("USDC")  # Assuming USDC key exists

            if not revenue_contract or not usdc_contract:
                raise Exception("RevenueSplitter or USDC contract not initialized")

            # Get admin private key from environment
            if not admin_private_key:
                admin_private_key = os.getenv("ADMIN_PRIVATE_KEY")
                if not admin_private_key:
                    raise Exception("ADMIN_PRIVATE_KEY not found in environment")

            from eth_account import Account
            admin_account = Account.from_key(admin_private_key)
            admin_wallet = admin_account.address

            # Convert USDC amount to 6 decimals (CRITICAL: USDC uses 6 decimals, NOT 18!)
            usdc_amount = int(purchase_amount * 10**6)

            logger.info(f"Distributing revenue for tool {tool_id}: {purchase_amount} USDC ({usdc_amount} smallest units)")

            # Build transaction
            nonce = self.w3.eth.get_transaction_count(admin_wallet)
            gas_price = self.w3.eth.gas_price

            # Estimate gas
            gas_estimate = revenue_contract.functions.distributeRevenue(
                tool_id,
                usdc_amount
            ).estimate_gas({'from': admin_wallet})

            gas_limit = int(gas_estimate * 1.2)

            # Build transaction
            tx = revenue_contract.functions.distributeRevenue(
                tool_id,
                usdc_amount
            ).build_transaction({
                'from': admin_wallet,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'nonce': nonce,
                'chainId': self.get_chain_id()
            })

            # Sign and send
            signed_tx = admin_account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            tx_hash_hex = tx_hash.hex()

            logger.info(f"Revenue distribution transaction sent: {tx_hash_hex}")

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt['status'] != 1:
                raise Exception(f"Revenue distribution failed with status {receipt['status']}")

            logger.info(f"Revenue distributed successfully! TX: {tx_hash_hex}")

            return tx_hash_hex

        except Exception as e:
            logger.error(f"Revenue distribution failed: {e}", exc_info=True)
            raise Exception(f"Revenue distribution failed: {str(e)}")

    # ==================== Utility Methods ====================

    def verify_customer_access(self, customer_wallet: str, tool_id: int) -> bool:
        """
        Comprehensive check to verify if customer has access to a tool.
        Checks both NFT ownership AND active subscription.

        Args:
            customer_wallet: Customer's wallet address
            tool_id: The tool's ID

        Returns:
            True if customer has access (owns NFT AND has active subscription), False otherwise
        """
        import asyncio

        async def check_access():
            has_nft = await self.has_license(customer_wallet, tool_id)
            has_subscription = await self.has_active_subscription(customer_wallet, tool_id)
            return has_nft and has_subscription

        return asyncio.run(check_access())

    # ==================== Network Info Methods ====================

    def get_contract_addresses(self) -> Dict[str, str]:
        """
        Get all deployed contract addresses for current network.

        Returns:
            Dictionary of contract addresses
        """
        return get_all_contracts(self.network)

    def get_network_info(self) -> Dict[str, Any]:
        """
        Get current network information.

        Returns:
            Dictionary containing network details
        """
        return {
            "network": self.network,
            "chain_id": self.get_chain_id(),
            "rpc_url": self.rpc_url,
            "is_connected": self.is_connected(),
            "block_number": self.get_block_number(),
            "contracts": list(self.contracts.keys()),
        }


# ==================== Singleton Instance ====================

_blockchain_service: Optional[BlockchainService] = None


def get_blockchain_service() -> BlockchainService:
    """
    Get or create the singleton blockchain service instance.

    Returns:
        BlockchainService instance
    """
    global _blockchain_service

    if _blockchain_service is None:
        _blockchain_service = BlockchainService()

    return _blockchain_service
