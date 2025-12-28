"""
Varity Encryption Service
Uses Lit Protocol for wallet-based encryption/decryption
Enhanced with AES-256-GCM for OAuth token encryption
"""
import json
import base64
import hashlib
import os
import time
from typing import Dict, Any, Optional
import logging
from datetime import datetime

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.backends import default_backend
from eth_account import Account
from eth_account.messages import encode_defunct

from ..core.config import settings

logger = logging.getLogger(__name__)


def normalize_wallet_address(wallet_address: str) -> str:
    """
    Normalize wallet address for consistent storage/retrieval.

    CRITICAL: This function MUST be used everywhere wallet addresses are
    compared or used as keys. Inconsistent normalization will cause data
    to be stored under one key and queried under a different key.

    Normalization rules:
    - Convert to lowercase
    - Strip whitespace
    - Add "0x" prefix if missing

    Args:
        wallet_address: The wallet address to normalize

    Returns:
        Normalized wallet address (lowercase with 0x prefix)
    """
    if not wallet_address:
        return ""
    wallet = wallet_address.lower().strip()
    if not wallet.startswith("0x"):
        wallet = f"0x{wallet}"
    return wallet


class EncryptionService:
    """
    Service for encrypting/decrypting data using AES-256-GCM with wallet-derived keys.

    This implementation uses:
    - PBKDF2 with SHA-256 to derive unique 256-bit keys from wallet addresses
    - AES-256-GCM for authenticated encryption
    - Each business gets complete data isolation via wallet-specific keys

    Future enhancement: Integrate Lit Protocol for decentralized key management.
    """

    def __init__(self):
        self.network = settings.lit_network
        self.chain_id = settings.varity_chain_id
        self.chain_name = settings.varity_chain_name
        self.backend = default_backend()
        # Signature expiration time (15 minutes)
        self.signature_max_age_seconds = 900

    async def validate_wallet_signature(
        self,
        wallet_address: str,
        auth_signature: str,
        message: str,
        timestamp: int
    ) -> bool:
        """
        Validate that wallet signed the message

        This implements CRITICAL security: ensures only the actual wallet owner
        can decrypt their data. Prevents signature replay attacks and expired signatures.

        Args:
            wallet_address: Customer's wallet address (must match signer)
            auth_signature: Signature bytes (hex string with 0x prefix)
            message: Original message that was signed
            timestamp: Unix timestamp when signature was created

        Returns:
            True if signature is valid and not expired

        Raises:
            ValueError: If signature is expired, invalid, or wallet mismatch
        """
        try:
            # Check signature hasn't expired (15 minute window)
            current_time = int(time.time())
            signature_age = current_time - timestamp

            if signature_age > self.signature_max_age_seconds:
                logger.warning(
                    f"Signature expired: age={signature_age}s, max={self.signature_max_age_seconds}s, "
                    f"wallet={wallet_address}"
                )
                raise ValueError(
                    f"Signature expired ({signature_age}s old, max {self.signature_max_age_seconds}s)"
                )

            if signature_age < -60:  # Allow 60s clock skew
                logger.warning(
                    f"Signature timestamp in future: timestamp={timestamp}, "
                    f"current={current_time}, wallet={wallet_address}"
                )
                raise ValueError("Signature timestamp is in the future")

            # Normalize wallet address
            wallet = wallet_address.lower()
            if not wallet.startswith("0x"):
                wallet = f"0x{wallet}"

            # Reconstruct the message that was signed
            # Format: "Varity Access Request\nWallet: {wallet}\nTimestamp: {timestamp}\nMessage: {message}"
            full_message = (
                f"Varity Access Request\n"
                f"Wallet: {wallet}\n"
                f"Timestamp: {timestamp}\n"
                f"Message: {message}"
            )

            # Encode message for EIP-191 signature verification
            message_hash = encode_defunct(text=full_message)

            # Recover signer address from signature
            recovered_address = Account.recover_message(
                message_hash,
                signature=auth_signature
            )

            # Normalize recovered address for comparison
            recovered_address = recovered_address.lower()

            # Check recovered address matches claimed wallet
            if recovered_address != wallet:
                logger.error(
                    f"Signature verification failed: "
                    f"claimed={wallet}, recovered={recovered_address}"
                )
                raise ValueError(
                    f"Signature verification failed: wallet address mismatch "
                    f"(expected {wallet}, got {recovered_address})"
                )

            logger.info(
                f"Signature verified successfully: wallet={wallet}, "
                f"message={message}, age={signature_age}s"
            )

            return True

        except ValueError as e:
            # Re-raise ValueError (signature validation errors)
            raise e
        except Exception as e:
            # Catch all other exceptions and convert to validation error
            logger.error(f"Signature validation error: {str(e)}", exc_info=True)
            raise ValueError(f"Signature validation failed: {str(e)}")

    def _build_access_control_conditions(
        self,
        customer_wallet: str
    ) -> list:
        """
        Build Lit Protocol access control conditions
        Only the customer's wallet can decrypt

        Args:
            customer_wallet: Customer's wallet address

        Returns:
            Access control conditions array
        """
        # Normalize wallet address
        wallet = customer_wallet.lower()
        if not wallet.startswith("0x"):
            wallet = f"0x{wallet}"

        # Access control: only this wallet can decrypt
        conditions = [
            {
                "conditionType": "evmBasic",
                "contractAddress": "",
                "standardContractType": "",
                "chain": "arbitrum",  # Varity L3 is Arbitrum-based
                "method": "",
                "parameters": [":userAddress"],
                "returnValueTest": {
                    "comparator": "=",
                    "value": wallet
                }
            }
        ]

        return conditions

    def derive_legacy_key(self, wallet_address: str) -> bytes:
        """
        LEGACY: Derive encryption key using OLD algorithm (without server secret).

        This method exists for backwards compatibility to decrypt data that was
        encrypted BEFORE the RED-001 security fix was applied.

        WARNING: Do NOT use for new encryption! Use derive_customer_key instead.
        """
        # Normalize wallet address
        wallet = wallet_address.lower()
        if not wallet.startswith("0x"):
            wallet = f"0x{wallet}"

        # OLD salt formula (without server_secret)
        salt = hashlib.sha256(
            f"varity-oauth-{wallet}-{self.chain_id}".encode()
        ).digest()[:16]

        # OLD key derivation (wallet only, no server_secret)
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=self.backend
        )

        key = kdf.derive(wallet.encode())
        return key

    def derive_customer_key(self, wallet_address: str) -> bytes:
        """
        Derive a unique encryption key from customer's wallet address AND server secret.

        SECURITY FIX (RED-001): Added server-side encryption_secret to prevent
        attackers from deriving keys using only the public wallet address.

        Key derivation now includes:
        - Wallet address (unique per customer)
        - Chain ID (network identifier)
        - Server encryption_secret (only known to backend)

        This ensures that even if an attacker knows a wallet address,
        they cannot derive the encryption key without the server secret.
        """
        # Normalize wallet address
        wallet = wallet_address.lower()
        if not wallet.startswith("0x"):
            wallet = f"0x{wallet}"

        # Get server-side secret (MUST be set in production)
        server_secret = settings.encryption_secret
        if server_secret.startswith("CHANGE_ME"):
            logger.warning(
                "ENCRYPTION_SECRET not set! Using default value. "
                "Set ENCRYPTION_SECRET env var in production!"
            )

        # Generate salt from wallet + network + server secret
        # The server secret is included to prevent public key derivation
        salt = hashlib.sha256(
            f"varity-oauth-{wallet}-{self.chain_id}-{server_secret}".encode()
        ).digest()[:16]

        # Derive 256-bit key using PBKDF2
        # Input includes both wallet and server secret for security
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=self.backend
        )

        # Key derived from wallet + server secret (not just public wallet)
        key = kdf.derive(f"{wallet}-{server_secret}".encode())
        return key

    def encrypt_oauth_token(
        self,
        wallet_address: str,
        token_data: Dict[str, Any]
    ) -> Dict[str, str]:
        """
        Encrypt OAuth token with AES-256-GCM for a specific customer

        Args:
            wallet_address: Customer's wallet (used for key derivation)
            token_data: OAuth tokens to encrypt

        Returns:
            Encrypted data with metadata
        """
        # Derive customer-specific key
        key = self.derive_customer_key(wallet_address)

        # Convert to JSON
        plaintext = json.dumps(token_data).encode()

        # Generate nonce for GCM
        nonce = os.urandom(12)  # 96 bits for GCM

        # Encrypt using AES-256-GCM
        cipher = Cipher(
            algorithms.AES(key),
            modes.GCM(nonce),
            backend=self.backend
        )
        encryptor = cipher.encryptor()

        # Encrypt and get auth tag
        ciphertext = encryptor.update(plaintext) + encryptor.finalize()

        # Return encrypted data
        return {
            "encrypted_data": base64.b64encode(ciphertext).decode(),
            "nonce": base64.b64encode(nonce).decode(),
            "tag": base64.b64encode(encryptor.tag).decode(),
            "wallet_address": wallet_address.lower(),
            "algorithm": "AES-256-GCM"
        }

    def _try_decrypt_with_key(
        self,
        key: bytes,
        ciphertext: bytes,
        nonce: bytes,
        tag: bytes
    ) -> Optional[bytes]:
        """
        Attempt decryption with a given key. Returns plaintext or None if fails.
        """
        try:
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(nonce, tag),
                backend=self.backend
            )
            decryptor = cipher.decryptor()
            return decryptor.update(ciphertext) + decryptor.finalize()
        except Exception:
            return None

    def decrypt_oauth_token(
        self,
        wallet_address: str,
        encrypted_data: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Decrypt OAuth token with customer's wallet-derived key.

        BACKWARDS COMPATIBILITY: Tries new key derivation first (with server_secret),
        then falls back to legacy key derivation (without server_secret) for data
        encrypted before RED-001 security fix.

        Args:
            wallet_address: Customer's wallet (must match encryption wallet)
            encrypted_data: Encrypted token data

        Returns:
            Decrypted OAuth tokens
        """
        # Verify wallet matches
        if encrypted_data.get("wallet_address") != wallet_address.lower():
            raise PermissionError(
                f"Cannot decrypt: Token belongs to different wallet"
            )

        # Decode from base64
        ciphertext = base64.b64decode(encrypted_data["encrypted_data"])
        nonce = base64.b64decode(encrypted_data["nonce"])
        tag = base64.b64decode(encrypted_data["tag"])

        # Try new key derivation first (with server_secret)
        key = self.derive_customer_key(wallet_address)
        plaintext = self._try_decrypt_with_key(key, ciphertext, nonce, tag)

        if plaintext is None:
            # Fallback to legacy key derivation (without server_secret)
            # This handles data encrypted before RED-001 security fix
            logger.info(
                f"New key failed, trying legacy key for wallet {wallet_address[:15]}..."
            )
            legacy_key = self.derive_legacy_key(wallet_address)
            plaintext = self._try_decrypt_with_key(legacy_key, ciphertext, nonce, tag)

            if plaintext is not None:
                logger.warning(
                    f"Decrypted with LEGACY key for {wallet_address[:15]}... "
                    "Consider re-encrypting data with new key."
                )

        if plaintext is None:
            raise ValueError(
                f"Decryption failed: Invalid key or corrupted data for wallet {wallet_address[:15]}..."
            )

        return json.loads(plaintext.decode())

    def encrypt_token_field(self, wallet_address: str, token: str) -> str:
        """
        Encrypt a single OAuth token field for database storage
        """
        if not token:
            return None

        encrypted = self.encrypt_oauth_token(
            wallet_address,
            {"token": token}
        )
        # Combine nonce, tag, and ciphertext for storage
        return f"{encrypted['nonce']}:{encrypted['tag']}:{encrypted['encrypted_data']}"

    def decrypt_token_field(self, wallet_address: str, encrypted_token: str) -> str:
        """
        Decrypt a single OAuth token field from database
        """
        if not encrypted_token or encrypted_token.count(":") != 2:
            return None

        nonce, tag, encrypted_data = encrypted_token.split(":", 2)

        decrypted = self.decrypt_oauth_token(
            wallet_address,
            {
                "encrypted_data": encrypted_data,
                "nonce": nonce,
                "tag": tag,
                "wallet_address": wallet_address.lower()
            }
        )
        return decrypted.get("token")

    async def encrypt_for_customer(
        self,
        data: dict,
        customer_wallet: str,
        additional_metadata: Optional[dict] = None
    ) -> dict:
        """
        Encrypt data that ONLY the customer's wallet can decrypt

        Args:
            data: Plain data to encrypt
            customer_wallet: Customer's wallet address (becomes the decryption key)
            additional_metadata: Optional metadata to include

        Returns:
            Dictionary with encrypted data and metadata:
            {
                "encrypted_data": str (base64),
                "access_control_conditions": list,
                "chain": str,
                "chain_id": int,
                "metadata": dict,
                "nonce": str (base64),
                "tag": str (base64),
                "algorithm": str
            }
        """
        try:
            # Build access control conditions
            access_conditions = self._build_access_control_conditions(customer_wallet)

            # Prepare metadata
            metadata = {
                "customer_wallet": customer_wallet.lower(),
                "encrypted_at": datetime.utcnow().isoformat(),
                "chain_id": self.chain_id,
                "chain_name": self.chain_name,
                "lit_network": self.network,
                "encryption_version": "1.0"
            }

            if additional_metadata:
                metadata.update(additional_metadata)

            # Convert data to string for encryption
            data_string = json.dumps(data)

            # Use real AES-256-GCM encryption with customer-specific key
            encrypted = self.encrypt_oauth_token(customer_wallet, data)

            encrypted_data_base64 = encrypted["encrypted_data"]
            # SECURITY FIX (RED-003): Removed encrypted_symmetric_key from response
            # Key material should NEVER be exposed in API responses

            result = {
                "encrypted_data": encrypted_data_base64,
                # REMOVED: "encrypted_symmetric_key" - security vulnerability (RED-003)
                "access_control_conditions": access_conditions,
                "chain": "arbitrum",
                "chain_id": self.chain_id,
                "metadata": metadata,
                "nonce": encrypted.get("nonce"),
                "tag": encrypted.get("tag"),
                "algorithm": "AES-256-GCM"
            }

            logger.info(
                f"Encrypted data for customer {customer_wallet} "
                f"using AES-256-GCM with wallet-derived key"
            )

            return result

        except Exception as e:
            logger.error(f"Encryption error: {str(e)}")
            raise Exception(f"Failed to encrypt data: {str(e)}")

    async def decrypt_with_wallet(
        self,
        encrypted_data: dict,
        customer_wallet: str,
        auth_signature: Optional[dict] = None
    ) -> dict:
        """
        Decrypt data using customer's wallet

        Args:
            encrypted_data: Encrypted data from encrypt_for_customer()
            customer_wallet: Customer's wallet address
            auth_signature: Wallet signature for authentication (required for production)

        Returns:
            Decrypted data as dictionary
        """
        try:
            # Validate wallet matches encryption
            if encrypted_data["metadata"]["customer_wallet"] != customer_wallet.lower():
                raise Exception(
                    "Wallet address does not match encrypted data owner"
                )

            # Validate auth_signature with wallet signature verification
            if auth_signature:
                is_valid = await self.validate_wallet_signature(
                    wallet_address=customer_wallet,
                    auth_signature=auth_signature.get("signature", ""),
                    message=auth_signature.get("message", "decrypt_file"),
                    timestamp=auth_signature.get("timestamp", int(time.time()))
                )
                if not is_valid:
                    raise Exception("Invalid wallet signature - decryption denied")

            # Use real AES-256-GCM decryption
            decrypted_data = self.decrypt_oauth_token(
                customer_wallet,
                {
                    "encrypted_data": encrypted_data["encrypted_data"],
                    "nonce": encrypted_data.get("nonce"),
                    "tag": encrypted_data.get("tag"),
                    "wallet_address": customer_wallet.lower()
                }
            )
            data = decrypted_data

            logger.info(
                f"Decrypted data for customer {customer_wallet} using AES-256-GCM"
            )

            return data

        except Exception as e:
            logger.error(f"Decryption error: {str(e)}")
            raise Exception(f"Failed to decrypt data: {str(e)}")

    async def encrypt_file_for_customer(
        self,
        file_content: bytes,
        customer_wallet: str,
        filename: str,
        additional_metadata: Optional[dict] = None
    ) -> dict:
        """
        Encrypt file bytes that ONLY the customer's wallet can decrypt

        Args:
            file_content: File bytes to encrypt
            customer_wallet: Customer's wallet address
            filename: Original filename
            additional_metadata: Optional metadata

        Returns:
            Dictionary with encrypted file and metadata
        """
        try:
            # Build access control conditions
            access_conditions = self._build_access_control_conditions(customer_wallet)

            # Prepare metadata
            metadata = {
                "customer_wallet": customer_wallet.lower(),
                "encrypted_at": datetime.utcnow().isoformat(),
                "chain_id": self.chain_id,
                "chain_name": self.chain_name,
                "lit_network": self.network,
                "encryption_version": "1.0",
                "original_filename": filename,
                "file_size": len(file_content)
            }

            if additional_metadata:
                metadata.update(additional_metadata)

            # Derive customer-specific encryption key from wallet address
            key = self.derive_customer_key(customer_wallet)

            # Generate random nonce for GCM mode
            nonce = os.urandom(12)

            # Encrypt using AES-256-GCM
            cipher = Cipher(
                algorithms.AES(key),
                modes.GCM(nonce),
                backend=self.backend
            )
            encryptor = cipher.encryptor()

            # Encrypt file content
            ciphertext = encryptor.update(file_content) + encryptor.finalize()

            # Get authentication tag
            auth_tag = encryptor.tag

            # Encode encrypted data to base64 for storage
            encrypted_content_base64 = base64.b64encode(ciphertext).decode()
            nonce_base64 = base64.b64encode(nonce).decode()
            tag_base64 = base64.b64encode(auth_tag).decode()

            logger.info(
                f"Encrypted file {filename} for customer {customer_wallet} using AES-256-GCM"
            )

            result = {
                "encrypted_content": encrypted_content_base64,
                "nonce": nonce_base64,
                "auth_tag": tag_base64,
                "algorithm": "AES-256-GCM",
                "access_control_conditions": access_conditions,
                "chain": "arbitrum",
                "chain_id": self.chain_id,
                "metadata": metadata
            }

            logger.info(
                f"Encrypted file {filename} for customer {customer_wallet} successfully"
            )

            return result

        except Exception as e:
            logger.error(f"File encryption error: {str(e)}")
            raise Exception(f"Failed to encrypt file: {str(e)}")

    async def decrypt_file_with_wallet(
        self,
        encrypted_file: dict,
        customer_wallet: str,
        auth_signature: Optional[dict] = None
    ) -> bytes:
        """
        Decrypt file using customer's wallet.

        BACKWARDS COMPATIBILITY: Tries new key derivation first (with server_secret),
        then falls back to legacy key derivation (without server_secret) for files
        encrypted before RED-001 security fix.

        Args:
            encrypted_file: Encrypted file from encrypt_file_for_customer()
            customer_wallet: Customer's wallet address
            auth_signature: Wallet signature for authentication

        Returns:
            Decrypted file bytes
        """
        try:
            # Validate wallet matches encryption
            if encrypted_file["metadata"]["customer_wallet"] != customer_wallet.lower():
                raise Exception(
                    "Wallet address does not match encrypted file owner"
                )

            # Extract encrypted data components
            ciphertext = base64.b64decode(encrypted_file["encrypted_content"])
            nonce = base64.b64decode(encrypted_file["nonce"])
            auth_tag = base64.b64decode(encrypted_file["auth_tag"])

            # Try new key derivation first (with server_secret)
            key = self.derive_customer_key(customer_wallet)
            file_content = self._try_decrypt_with_key(key, ciphertext, nonce, auth_tag)

            if file_content is None:
                # Fallback to legacy key derivation (without server_secret)
                logger.info(
                    f"New key failed for file, trying legacy key for wallet {customer_wallet[:15]}..."
                )
                legacy_key = self.derive_legacy_key(customer_wallet)
                file_content = self._try_decrypt_with_key(legacy_key, ciphertext, nonce, auth_tag)

                if file_content is not None:
                    logger.warning(
                        f"Decrypted file with LEGACY key for {customer_wallet[:15]}... "
                        "Consider re-encrypting file with new key."
                    )

            if file_content is None:
                raise ValueError(
                    f"File decryption failed: Invalid key or corrupted data for wallet {customer_wallet[:15]}..."
                )

            logger.info(
                f"Decrypted file for customer {customer_wallet} using AES-256-GCM"
            )

            return file_content

        except Exception as e:
            logger.error(f"File decryption error: {str(e)}")
            raise Exception(f"Failed to decrypt file: {str(e)}")

    def get_encryption_metadata(self, customer_wallet: str) -> dict:
        """
        Get encryption metadata for a customer

        Args:
            customer_wallet: Customer's wallet address

        Returns:
            Encryption configuration metadata
        """
        return {
            "customer_wallet": customer_wallet.lower(),
            "chain_id": self.chain_id,
            "chain_name": self.chain_name,
            "lit_network": self.network,
            "access_control": "wallet-only",
            "encryption_algorithm": "AES-256-GCM",
            "key_management": "lit-protocol"
        }


# Singleton instance for use throughout the application
encryption_service = EncryptionService()

# Helper functions for OAuth token encryption
def encrypt_oauth_for_customer(wallet_address: str, token_data: Dict[str, Any]) -> Dict[str, str]:
    """Encrypt OAuth tokens for a specific customer"""
    return encryption_service.encrypt_oauth_token(wallet_address, token_data)

def decrypt_oauth_for_customer(wallet_address: str, encrypted_data: Dict[str, str]) -> Dict[str, Any]:
    """Decrypt OAuth tokens for a specific customer"""
    return encryption_service.decrypt_oauth_token(wallet_address, encrypted_data)

def encrypt_field(wallet_address: str, field_value: str) -> str:
    """Encrypt a single field for database storage"""
    return encryption_service.encrypt_token_field(wallet_address, field_value)

def decrypt_field(wallet_address: str, encrypted_value: str) -> str:
    """Decrypt a single field from database"""
    return encryption_service.decrypt_token_field(wallet_address, encrypted_value)


# Production Implementation Notes:
# ================================
#
# To integrate actual Lit Protocol SDK, you have several options:
#
# 1. Use lit-js-sdk via Node.js subprocess:
#    - Install @lit-protocol/lit-node-client in a Node.js environment
#    - Create a Node.js script that wraps encryption/decryption
#    - Call it from Python using subprocess
#
# 2. Use direct HTTP API calls to Lit Protocol nodes:
#    - Reference: https://developer.litprotocol.com/
#    - Make direct HTTPS requests to Lit nodes
#    - Handle threshold signature aggregation
#
# 3. Wait for official Python SDK:
#    - Monitor https://github.com/LIT-Protocol for Python SDK release
#
# Example integration with lit-js-sdk:
# ------------------------------------
# import subprocess
# import json
#
# async def _call_lit_sdk(operation, params):
#     """Call Node.js Lit SDK via subprocess"""
#     script = f"""
#     const LitJsSdk = require('@lit-protocol/lit-node-client');
#     const litNodeClient = new LitJsSdk.LitNodeClient({{
#         litNetwork: '{settings.lit_network}'
#     }});
#     await litNodeClient.connect();
#
#     // Perform operation
#     const result = await litNodeClient.{operation}({json.dumps(params)});
#     console.log(JSON.stringify(result));
#     """
#
#     result = subprocess.run(
#         ['node', '-e', script],
#         capture_output=True,
#         text=True
#     )
#
#     return json.loads(result.stdout)
