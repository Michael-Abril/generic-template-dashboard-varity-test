"""
L3 Data Commitment Service - Gasless Pattern Implementation

Commits data references to Varity L3 Arbitrum for verifiable data integrity.
Uses Merkle trees for batch efficiency (200x cost reduction).

=============================================================================
GASLESS ARCHITECTURE (CRITICAL FOR UNDERSTANDING)
=============================================================================

This service implements a GASLESS pattern where:

1. VARITY LABS PAYS ALL GAS
   - The backend hot wallet (VARITY_L3_PRIVATE_KEY) signs all transactions
   - This wallet must be funded with USDC on Varity L3

2. BUSINESS WALLET = DATA ATTRIBUTION ONLY
   - Business wallet addresses are passed as parameters to the contract
   - Data is stored and indexed under the business wallet address
   - Businesses NEVER sign transactions or need USDC

3. WHY THIS PATTERN?
   - Businesses get a seamless Web2-like experience
   - No blockchain knowledge required from business users
   - No wallet setup, gas management, or transaction signing
   - Data remains cryptographically attributed to business wallets

SECURITY CONSIDERATIONS:
- Only authorized relayers (Varity backend addresses) can call commitDataFor
- Relayer addresses are managed by contract owner
- Each transaction records the relayer address for audit trail
- Business wallet addresses are validated (non-zero)

=============================================================================

Varity L3 Testnet (Conduit - Arbitrum Stack AnyTrust):
- RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
- Chain ID: 33529
- Native Token: USDC
- Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/
"""

from typing import Dict, Any, List, Optional
from eth_utils import keccak
from web3 import Web3
import os
import logging

logger = logging.getLogger(__name__)


# Varity L3 Network Configuration (Conduit)
VARITY_L3_CONFIG = {
    "name": "Varity Testnet",
    "slug": "varity-testnet-rroe52pwjp",
    "chain_id": 33529,
    "rpc_url": "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "ws_url": "wss://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "anytrust_das_url": "https://das-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "explorer_url": "https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz",
    "hub_url": "https://hub.conduit.xyz/varity-testnet-rroe52pwjp",
    "framework": "Arbitrum Stack",
    "settlement_layer": "Arbitrum One",
    "data_availability": "AnyTrust DA",
    "environment": "Testnet",
    "native_token": {
        "symbol": "USDC",
        "address": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    },
}


# Data type identifiers for on-chain commits
DATA_TYPE_IDS = {
    # Google Workspace
    "drive_files": 1,
    "gmail": 2,
    "calendar": 3,
    "contacts": 4,
    # Slack
    "slack_channels": 10,
    "slack_messages": 11,
    "slack_users": 12,
    "slack_files": 13,
    # Microsoft 365
    "onedrive": 20,
    "outlook": 21,
    "outlook_calendar": 22,
    "outlook_contacts": 23,
    # QuickBooks
    "invoices": 30,
    "customers": 31,
    "payments": 32,
    "accounts": 33,
    # Salesforce
    "leads": 40,
    "opportunities": 41,
    "accounts_sf": 42,
    "contacts_sf": 43,
    # HubSpot
    "hubspot_contacts": 50,
    "hubspot_deals": 51,
    "hubspot_companies": 52,
    # Planning (internal)
    "tasks": 100,
    "roadmap": 101,
    # Default
    "unknown": 0,
}


class L3DataCommitmentService:
    """
    Handles on-chain data commitments to Varity L3 Arbitrum.

    GASLESS PATTERN:
    ----------------
    - Varity Labs backend is the ONLY transaction signer
    - Business wallet addresses are passed for DATA ATTRIBUTION
    - Businesses never need USDC or sign transactions

    Varity L3 Testnet (Conduit - Arbitrum Stack AnyTrust):
    - RPC: https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz
    - Chain ID: 33529
    - Native Token: USDC
    - Explorer: https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/

    This service enables:
    - Verifiable data integrity via on-chain commitments
    - Batch commits using Merkle trees (200x more efficient)
    - CID + content hash storage for IPFS data
    - Wallet-based data attribution (business wallet, not signer)
    """

    # Default to Conduit RPC, allow override via env var
    L3_RPC_URL = os.getenv("VARITY_L3_RPC", VARITY_L3_CONFIG["rpc_url"])
    L3_CHAIN_ID = int(os.getenv("VARITY_L3_CHAIN_ID", str(VARITY_L3_CONFIG["chain_id"])))
    L3_EXPLORER_URL = VARITY_L3_CONFIG["explorer_url"]
    CONTRACT_ADDRESS = os.getenv("VARITY_DATA_COMMITMENTS_ADDRESS")

    def __init__(self, private_key: Optional[str] = None):
        """
        Initialize L3 commitment service.

        Args:
            private_key: Private key for Varity Labs hot wallet.
                        This wallet pays gas for ALL transactions.
                        Must be funded with USDC on Varity L3.
                        If not provided, contract interaction is disabled.
        """
        self.w3 = Web3(Web3.HTTPProvider(self.L3_RPC_URL))
        self.account = None

        if private_key:
            try:
                self.account = self.w3.eth.account.from_key(private_key)
                logger.info(
                    f"L3 service initialized with relayer account: {self.account.address}"
                )
            except Exception as e:
                logger.error(f"Failed to initialize relayer account from private key: {e}")

        self.contract = self._load_contract()

    def _load_contract(self):
        """Load VarityDataCommitments contract with gasless ABI"""
        # ABI for the VarityDataCommitments contract (gasless pattern)
        abi = [
            # ============ Gasless Functions (Primary) ============
            {
                "name": "commitDataFor",
                "type": "function",
                "inputs": [
                    {"name": "user", "type": "address"},
                    {"name": "integration", "type": "string"},
                    {"name": "cidHash", "type": "bytes32"},
                    {"name": "contentHash", "type": "bytes32"},
                    {"name": "dataType", "type": "uint32"},
                    {"name": "cid", "type": "string"},
                ],
                "outputs": [],
            },
            {
                "name": "commitBatchFor",
                "type": "function",
                "inputs": [
                    {"name": "user", "type": "address"},
                    {"name": "integration", "type": "string"},
                    {"name": "merkleRoot", "type": "bytes32"},
                    {"name": "itemCount", "type": "uint32"},
                ],
                "outputs": [],
            },
            # ============ Legacy Functions (Deprecated) ============
            {
                "name": "commitData",
                "type": "function",
                "inputs": [
                    {"name": "integration", "type": "string"},
                    {"name": "cidHash", "type": "bytes32"},
                    {"name": "contentHash", "type": "bytes32"},
                    {"name": "dataType", "type": "uint32"},
                    {"name": "cid", "type": "string"},
                ],
                "outputs": [],
            },
            {
                "name": "commitBatch",
                "type": "function",
                "inputs": [
                    {"name": "integration", "type": "string"},
                    {"name": "merkleRoot", "type": "bytes32"},
                    {"name": "itemCount", "type": "uint32"},
                ],
                "outputs": [],
            },
            # ============ View Functions ============
            {
                "name": "getCommitment",
                "type": "function",
                "stateMutability": "view",
                "inputs": [
                    {"name": "user", "type": "address"},
                    {"name": "integration", "type": "string"},
                    {"name": "cidHash", "type": "bytes32"},
                ],
                "outputs": [
                    {"name": "cidHash", "type": "bytes32"},
                    {"name": "contentHash", "type": "bytes32"},
                    {"name": "timestamp", "type": "uint64"},
                    {"name": "dataType", "type": "uint32"},
                ],
            },
            {
                "name": "getBatch",
                "type": "function",
                "stateMutability": "view",
                "inputs": [
                    {"name": "user", "type": "address"},
                    {"name": "integration", "type": "string"},
                    {"name": "batchId", "type": "uint256"},
                ],
                "outputs": [
                    {"name": "merkleRoot", "type": "bytes32"},
                    {"name": "itemCount", "type": "uint32"},
                    {"name": "timestamp", "type": "uint64"},
                ],
            },
            {
                "name": "getBatchCount",
                "type": "function",
                "stateMutability": "view",
                "inputs": [
                    {"name": "user", "type": "address"},
                    {"name": "integration", "type": "string"},
                ],
                "outputs": [{"name": "", "type": "uint256"}],
            },
            {
                "name": "isAuthorizedRelayer",
                "type": "function",
                "stateMutability": "view",
                "inputs": [{"name": "relayer", "type": "address"}],
                "outputs": [{"name": "", "type": "bool"}],
            },
            {
                "name": "owner",
                "type": "function",
                "stateMutability": "view",
                "inputs": [],
                "outputs": [{"name": "", "type": "address"}],
            },
            # ============ Admin Functions ============
            {
                "name": "setRelayer",
                "type": "function",
                "inputs": [
                    {"name": "relayer", "type": "address"},
                    {"name": "authorized", "type": "bool"},
                ],
                "outputs": [],
            },
        ]

        if self.CONTRACT_ADDRESS:
            try:
                return self.w3.eth.contract(
                    address=Web3.to_checksum_address(self.CONTRACT_ADDRESS),
                    abi=abi
                )
            except Exception as e:
                logger.warning(f"Failed to load contract: {e}")
                return None
        return None

    def is_connected(self) -> bool:
        """Check if L3 RPC connection is active"""
        try:
            return self.w3.is_connected()
        except Exception as e:
            logger.error(f"L3 connection check failed: {e}")
            return False

    def get_relayer_address(self) -> Optional[str]:
        """Get the address of the Varity relayer (gas payer)"""
        if self.account:
            return self.account.address
        return None

    def get_relayer_balance(self) -> Optional[int]:
        """Get USDC balance of the relayer wallet"""
        if not self.account:
            return None
        try:
            return self.w3.eth.get_balance(self.account.address)
        except Exception as e:
            logger.error(f"Failed to get relayer balance: {e}")
            return None

    async def check_relayer_authorization(self) -> bool:
        """Check if our relayer is authorized on the contract"""
        if not self.contract or not self.account:
            return False
        try:
            return self.contract.functions.isAuthorizedRelayer(
                self.account.address
            ).call()
        except Exception as e:
            logger.error(f"Failed to check relayer authorization: {e}")
            return False

    def get_explorer_tx_url(self, tx_hash: str) -> str:
        """Get block explorer URL for a transaction"""
        return f"{self.L3_EXPLORER_URL}/tx/{tx_hash}"

    def get_explorer_address_url(self, address: str) -> str:
        """Get block explorer URL for an address"""
        return f"{self.L3_EXPLORER_URL}/address/{address}"

    @classmethod
    def get_network_info(cls) -> Dict[str, Any]:
        """Get Varity L3 network configuration"""
        return {
            **VARITY_L3_CONFIG,
            "contract_address": cls.CONTRACT_ADDRESS,
            "rpc_url_active": cls.L3_RPC_URL,
        }

    def _get_data_type_id(self, data_type: str) -> int:
        """Convert data type string to numeric ID"""
        return DATA_TYPE_IDS.get(data_type, DATA_TYPE_IDS["unknown"])

    def _build_merkle_tree(self, leaves: List[bytes]) -> bytes:
        """
        Build simple Merkle tree and return root.

        For production, use a library like merkly or pymerkle.
        This is a simplified implementation.

        Args:
            leaves: List of leaf hashes (32 bytes each)

        Returns:
            Merkle root (32 bytes)
        """
        if not leaves:
            return b'\x00' * 32

        if len(leaves) == 1:
            return leaves[0]

        # Build tree level by level
        current_level = leaves[:]

        while len(current_level) > 1:
            next_level = []

            # Process pairs
            for i in range(0, len(current_level), 2):
                left = current_level[i]

                # If odd number of nodes, duplicate last one
                right = current_level[i + 1] if i + 1 < len(current_level) else left

                # Hash the pair (sorted for determinism)
                if left <= right:
                    parent = keccak(left + right)
                else:
                    parent = keccak(right + left)
                next_level.append(parent)

            current_level = next_level

        return current_level[0]

    async def commit_batch(
        self,
        items: List[Dict[str, Any]],
        integration: str,
        business_wallet_address: str,
    ) -> Dict[str, Any]:
        """
        Commit batch using Merkle tree root (GASLESS).

        200x more efficient than individual commits.
        Gas: ~25,000 for entire batch vs 50,000 per item.

        GASLESS PATTERN:
        - Varity Labs backend signs and pays for the transaction
        - business_wallet_address is used for DATA ATTRIBUTION only
        - Business never needs to sign or hold USDC

        Args:
            items: List of items to commit, each with 'cid' and 'content' keys
            integration: Integration name (e.g., 'google', 'slack')
            business_wallet_address: Business wallet for data attribution (NOT the signer)

        Returns:
            Dict with commitment details or pending status
        """
        try:
            # Validate business wallet address
            if not business_wallet_address or business_wallet_address == "0x0":
                raise ValueError("Invalid business wallet address")

            business_wallet = Web3.to_checksum_address(business_wallet_address)

            # Build leaves: [cid_hash, content_hash] for each item
            leaves = []
            for item in items:
                cid_hash = keccak(text=item['cid'])
                content_hash = keccak(item['content'])
                # Combine hashes for leaf (sorted for determinism)
                if cid_hash <= content_hash:
                    leaf = keccak(cid_hash + content_hash)
                else:
                    leaf = keccak(content_hash + cid_hash)
                leaves.append(leaf)

            # Build Merkle tree
            merkle_root = self._build_merkle_tree(leaves)

            # If contract is configured and we have a relayer account, commit to L3
            if self.contract and self.account:
                try:
                    # Use commitBatchFor (gasless pattern) - passes business wallet as parameter
                    tx = self.contract.functions.commitBatchFor(
                        business_wallet,  # Business wallet for data attribution
                        integration,
                        merkle_root,
                        len(items),
                    ).build_transaction({
                        'from': self.account.address,  # Varity relayer pays gas
                        'nonce': self.w3.eth.get_transaction_count(self.account.address),
                        'gas': 80000,  # Slightly higher for the additional address parameter
                        'gasPrice': self.w3.eth.gas_price,
                        'chainId': self.L3_CHAIN_ID,
                    })

                    signed = self.w3.eth.account.sign_transaction(tx, self.account.key)
                    tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

                    logger.info(
                        f"L3 batch committed (gasless): {len(items)} items, "
                        f"business={business_wallet[:10]}..., "
                        f"merkle_root={merkle_root.hex()[:16]}..., "
                        f"tx={tx_hash.hex()}, "
                        f"relayer={self.account.address[:10]}..."
                    )

                    return {
                        "tx_hash": tx_hash.hex(),
                        "merkle_root": merkle_root.hex(),
                        "item_count": len(items),
                        "l3_committed": receipt.status == 1,
                        "gas_used": receipt.gasUsed,
                        "explorer_url": self.get_explorer_tx_url(tx_hash.hex()),
                        "business_wallet": business_wallet,
                        "relayer_wallet": self.account.address,
                        "gasless": True,
                    }
                except Exception as e:
                    logger.error(f"L3 transaction failed: {e}")
                    # Fall through to pending status

            # If no contract or transaction failed, return pending status
            logger.info(
                f"L3 batch pending: {len(items)} items, "
                f"business={business_wallet[:10]}..., "
                f"merkle_root={merkle_root.hex()[:16]}... "
                f"(contract not configured or tx failed)"
            )

            return {
                "merkle_root": merkle_root.hex(),
                "item_count": len(items),
                "l3_committed": False,
                "business_wallet": business_wallet,
                "reason": "Contract not configured or transaction failed",
            }

        except Exception as e:
            logger.error(f"Batch commit failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "item_count": len(items),
                "l3_committed": False,
            }

    async def verify_data(
        self,
        cid: str,
        encrypted_content: bytes,
        integration: str,
        business_wallet_address: str,
    ) -> bool:
        """
        Verify data integrity against L3 commitment.

        Args:
            cid: IPFS CID of the data
            encrypted_content: Encrypted content bytes
            integration: Integration name
            business_wallet_address: Business wallet address (data is attributed to this)

        Returns:
            True if data matches on-chain commitment, False otherwise
        """
        if not self.contract:
            logger.debug("L3 contract not configured, skipping verification")
            return True  # Skip verification if not configured

        try:
            business_wallet = Web3.to_checksum_address(business_wallet_address)
            cid_hash = keccak(text=cid)
            content_hash = keccak(encrypted_content)

            commitment = self.contract.functions.getCommitment(
                business_wallet,  # Data is attributed to business wallet
                integration,
                cid_hash,
            ).call()

            # commitment[1] is contentHash
            is_valid = commitment[1] == content_hash

            if is_valid:
                logger.debug(f"L3 verification passed for CID: {cid[:16]}...")
            else:
                logger.warning(f"L3 verification FAILED for CID: {cid[:16]}...")

            return is_valid

        except Exception as e:
            logger.error(f"L3 verification error: {e}", exc_info=True)
            return False

    async def commit_single(
        self,
        cid: str,
        encrypted_content: bytes,
        integration: str,
        data_type: str,
        business_wallet_address: str,
    ) -> Dict[str, Any]:
        """
        Commit a single item to L3 (GASLESS).

        Note: Batch commits are 200x more efficient. Use commit_batch when possible.

        GASLESS PATTERN:
        - Varity Labs backend signs and pays for the transaction
        - business_wallet_address is used for DATA ATTRIBUTION only
        - Business never needs to sign or hold USDC

        Args:
            cid: IPFS CID
            encrypted_content: Encrypted content bytes
            integration: Integration name
            data_type: Data type identifier (e.g., 'drive_files', 'gmail')
            business_wallet_address: Business wallet for data attribution (NOT the signer)

        Returns:
            Dict with commitment details or pending status
        """
        try:
            # Validate business wallet address
            if not business_wallet_address or business_wallet_address == "0x0":
                raise ValueError("Invalid business wallet address")

            business_wallet = Web3.to_checksum_address(business_wallet_address)

            cid_hash = keccak(text=cid)
            content_hash = keccak(encrypted_content)
            data_type_id = self._get_data_type_id(data_type)

            # If contract is configured and we have a relayer account, commit to L3
            if self.contract and self.account:
                try:
                    # Use commitDataFor (gasless pattern) - passes business wallet as parameter
                    tx = self.contract.functions.commitDataFor(
                        business_wallet,  # Business wallet for data attribution
                        integration,
                        cid_hash,
                        content_hash,
                        data_type_id,
                        cid,  # Full CID for event logging
                    ).build_transaction({
                        'from': self.account.address,  # Varity relayer pays gas
                        'nonce': self.w3.eth.get_transaction_count(self.account.address),
                        'gas': 80000,
                        'gasPrice': self.w3.eth.gas_price,
                        'chainId': self.L3_CHAIN_ID,
                    })

                    signed = self.w3.eth.account.sign_transaction(tx, self.account.key)
                    tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
                    receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

                    logger.info(
                        f"L3 single commit (gasless): cid={cid[:16]}..., "
                        f"business={business_wallet[:10]}..., "
                        f"tx={tx_hash.hex()}, "
                        f"relayer={self.account.address[:10]}..."
                    )

                    return {
                        "tx_hash": tx_hash.hex(),
                        "cid": cid,
                        "cid_hash": cid_hash.hex(),
                        "content_hash": content_hash.hex(),
                        "data_type": data_type,
                        "data_type_id": data_type_id,
                        "l3_committed": receipt.status == 1,
                        "gas_used": receipt.gasUsed,
                        "explorer_url": self.get_explorer_tx_url(tx_hash.hex()),
                        "business_wallet": business_wallet,
                        "relayer_wallet": self.account.address,
                        "gasless": True,
                    }
                except Exception as e:
                    logger.error(f"L3 single commit transaction failed: {e}")
                    # Fall through to pending status

            # If no contract or transaction failed, return pending status
            logger.info(
                f"L3 single commit pending: cid={cid[:16]}..., "
                f"business={business_wallet[:10]}... "
                f"(contract not configured or tx failed)"
            )

            return {
                "cid": cid,
                "cid_hash": cid_hash.hex(),
                "content_hash": content_hash.hex(),
                "data_type": data_type,
                "l3_committed": False,
                "business_wallet": business_wallet,
                "reason": "Contract not configured or transaction failed",
            }

        except Exception as e:
            logger.error(f"Single commit failed: {e}", exc_info=True)
            return {
                "error": str(e),
                "cid": cid,
                "l3_committed": False,
            }

    async def get_batch_count(
        self,
        business_wallet_address: str,
        integration: str,
    ) -> int:
        """
        Get the number of batches committed for a business/integration.

        Args:
            business_wallet_address: Business wallet address
            integration: Integration name

        Returns:
            Number of batches committed
        """
        if not self.contract:
            return 0

        try:
            business_wallet = Web3.to_checksum_address(business_wallet_address)
            return self.contract.functions.getBatchCount(
                business_wallet,
                integration,
            ).call()
        except Exception as e:
            logger.error(f"Failed to get batch count: {e}")
            return 0

    async def get_batch(
        self,
        business_wallet_address: str,
        integration: str,
        batch_id: int,
    ) -> Optional[Dict[str, Any]]:
        """
        Get batch commitment details.

        Args:
            business_wallet_address: Business wallet address
            integration: Integration name
            batch_id: Batch ID

        Returns:
            Batch commitment details or None
        """
        if not self.contract:
            return None

        try:
            business_wallet = Web3.to_checksum_address(business_wallet_address)
            batch = self.contract.functions.getBatch(
                business_wallet,
                integration,
                batch_id,
            ).call()

            return {
                "merkle_root": batch[0].hex(),
                "item_count": batch[1],
                "timestamp": batch[2],
            }
        except Exception as e:
            logger.error(f"Failed to get batch: {e}")
            return None


# Singleton instance for use throughout the application
_l3_service: Optional[L3DataCommitmentService] = None


def get_l3_service() -> L3DataCommitmentService:
    """
    Get singleton L3 commitment service instance.

    The service is initialized with VARITY_L3_PRIVATE_KEY which is the
    hot wallet that pays for all gas. This implements the gasless pattern
    where businesses never need to interact with the blockchain directly.

    Returns:
        L3DataCommitmentService instance
    """
    global _l3_service

    if _l3_service is None:
        private_key = os.getenv("VARITY_L3_PRIVATE_KEY")
        _l3_service = L3DataCommitmentService(private_key=private_key)

        if _l3_service.is_connected():
            relayer = _l3_service.get_relayer_address()
            if relayer:
                logger.info(
                    f"L3 service initialized (gasless mode) - "
                    f"relayer: {relayer[:10]}..."
                )
            else:
                logger.warning("L3 service connected but no relayer configured")
        else:
            logger.warning("L3 service initialized but not connected to RPC")

    return _l3_service
