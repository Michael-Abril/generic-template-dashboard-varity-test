"""
Unit tests for EncryptionService
Tests Lit Protocol encryption, wallet-based access control
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock

from app.services.encryption_service import EncryptionService


class TestEncryptionService:
    """Test suite for Lit Protocol encryption service"""

    @pytest.fixture
    def encryption_service(self):
        """Create EncryptionService instance"""
        return EncryptionService()

    @pytest.mark.asyncio
    async def test_encrypt_data(
        self,
        encryption_service,
        mock_wallet_address
    ):
        """Test encrypting data with Lit Protocol"""
        data = {"sensitive": "information"}

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "ciphertext": "encrypted_data",
                "dataToEncryptHash": "hash123"
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            encrypted = await encryption_service.encrypt_data(
                data=data,
                access_control_conditions=[{
                    "contractAddress": "",
                    "standardContractType": "",
                    "chain": "ethereum",
                    "method": "",
                    "parameters": [":userAddress"],
                    "returnValueTest": {
                        "comparator": "=",
                        "value": mock_wallet_address
                    }
                }]
            )

            assert "ciphertext" in encrypted
            assert "dataToEncryptHash" in encrypted

    @pytest.mark.asyncio
    async def test_decrypt_data(
        self,
        encryption_service,
        mock_encrypted_data,
        mock_wallet_address
    ):
        """Test decrypting data with Lit Protocol"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "decryptedData": '{"sensitive": "information"}'
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            decrypted = await encryption_service.decrypt_data(
                encrypted_data=mock_encrypted_data,
                wallet_signature="0xsignature...",
                wallet_address=mock_wallet_address
            )

            assert decrypted["sensitive"] == "information"

    @pytest.mark.asyncio
    async def test_wallet_based_access_control(
        self,
        encryption_service,
        mock_wallet_address
    ):
        """Test wallet-based access control conditions"""
        # Only owner can decrypt
        owner_conditions = encryption_service.build_owner_only_conditions(
            mock_wallet_address
        )

        assert len(owner_conditions) > 0
        assert owner_conditions[0]["parameters"][0] == ":userAddress"
        assert owner_conditions[0]["returnValueTest"]["value"] == mock_wallet_address

    @pytest.mark.asyncio
    async def test_multi_wallet_access(
        self,
        encryption_service
    ):
        """Test granting access to multiple wallets"""
        wallet1 = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        wallet2 = "0x123d35Cc6634C0532925a3b844Bc454e4438f456"

        conditions = encryption_service.build_multi_wallet_conditions(
            [wallet1, wallet2]
        )

        assert len(conditions) >= 2

    @pytest.mark.asyncio
    async def test_encryption_failure_handling(
        self,
        encryption_service
    ):
        """Test handling encryption failures"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            with pytest.raises(Exception):
                await encryption_service.encrypt_data(
                    data={"test": "data"},
                    access_control_conditions=[]
                )

    @pytest.mark.asyncio
    async def test_unauthorized_decrypt_attempt(
        self,
        encryption_service,
        mock_encrypted_data
    ):
        """Test unauthorized decryption attempt fails"""
        wrong_wallet = "0x000d35Cc6634C0532925a3b844Bc454e4438f000"

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 403
            mock_response.json.return_value = {"error": "Unauthorized"}
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            with pytest.raises(Exception):
                await encryption_service.decrypt_data(
                    encrypted_data=mock_encrypted_data,
                    wallet_signature="0xbadsignature...",
                    wallet_address=wrong_wallet
                )

    @pytest.mark.asyncio
    async def test_time_based_access_control(
        self,
        encryption_service
    ):
        """Test time-based access conditions"""
        expiry_timestamp = 1700000000

        conditions = encryption_service.build_time_limited_conditions(
            expiry_timestamp=expiry_timestamp
        )

        assert any("timestamp" in str(c).lower() for c in conditions)

    @pytest.mark.asyncio
    async def test_nft_gated_access(
        self,
        encryption_service,
        mock_wallet_address
    ):
        """Test NFT-based access control"""
        nft_contract = "0xNFTContract..."
        token_id = 123

        conditions = encryption_service.build_nft_gated_conditions(
            nft_contract=nft_contract,
            token_id=token_id
        )

        assert any(nft_contract in str(c) for c in conditions)

    @pytest.mark.asyncio
    async def test_balance_based_access(
        self,
        encryption_service,
        mock_wallet_address
    ):
        """Test token balance-based access control"""
        min_balance = 1000 * 10**18  # 1000 tokens

        conditions = encryption_service.build_balance_conditions(
            min_balance=min_balance
        )

        assert len(conditions) > 0

    @pytest.mark.asyncio
    async def test_encrypt_large_data(
        self,
        encryption_service,
        mock_wallet_address
    ):
        """Test encrypting large data payloads"""
        large_data = {"data": "x" * 1000000}  # 1MB of data

        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "ciphertext": "encrypted_large_data",
                "dataToEncryptHash": "hash123"
            }
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            encrypted = await encryption_service.encrypt_data(
                data=large_data,
                access_control_conditions=[]
            )

            assert "ciphertext" in encrypted

    @pytest.mark.asyncio
    async def test_re_encryption(
        self,
        encryption_service,
        mock_encrypted_data,
        mock_wallet_address
    ):
        """Test re-encrypting data with new access conditions"""
        new_wallet = "0x999d35Cc6634C0532925a3b844Bc454e4438f999"

        with patch.object(encryption_service, 'decrypt_data') as mock_decrypt, \
             patch.object(encryption_service, 'encrypt_data') as mock_encrypt:

            mock_decrypt.return_value = {"data": "decrypted"}
            mock_encrypt.return_value = {"ciphertext": "re-encrypted"}

            re_encrypted = await encryption_service.re_encrypt(
                encrypted_data=mock_encrypted_data,
                old_wallet=mock_wallet_address,
                new_wallet=new_wallet
            )

            assert re_encrypted["ciphertext"] == "re-encrypted"
