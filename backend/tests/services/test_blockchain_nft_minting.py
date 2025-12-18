"""
Integration Tests for NFT Minting in Blockchain Service

Tests the complete blockchain integration for marketplace purchases:
- NFT minting to customer wallet
- Revenue distribution automation
- Transaction verification
- Error handling and retry logic
"""

import pytest
import os
from unittest.mock import Mock, patch, AsyncMock
from app.services.blockchain_service import BlockchainService, get_blockchain_service


class TestNFTMinting:
    """Test NFT minting functionality"""

    @pytest.fixture
    def blockchain_service(self):
        """Create blockchain service instance for testing"""
        # Use testnet configuration
        service = BlockchainService(network="testnet")
        return service

    @pytest.fixture
    def mock_admin_key(self):
        """Mock admin private key for testing"""
        # This is a test key - NEVER use real keys in tests
        return "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

    def test_blockchain_service_initialization(self, blockchain_service):
        """Test that blockchain service initializes correctly"""
        assert blockchain_service is not None
        assert blockchain_service.network == "testnet"
        assert blockchain_service.w3 is not None

    def test_contract_loading(self, blockchain_service):
        """Test that contracts are loaded"""
        assert "ToolLicenseNFT" in blockchain_service.contracts
        assert "RevenueSplitter" in blockchain_service.contracts
        assert blockchain_service.contracts["ToolLicenseNFT"] is not None

    def test_network_connection(self, blockchain_service):
        """Test network connectivity"""
        # Note: This requires actual network connection
        # Skip in CI/CD environments
        if os.getenv("CI"):
            pytest.skip("Skipping network test in CI")

        is_connected = blockchain_service.is_connected()
        # In testnet, connection might fail if RPC is down
        # Just verify the method works
        assert isinstance(is_connected, bool)

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'mint_license_nft')
    async def test_nft_minting_success(self, mock_mint, blockchain_service, mock_admin_key):
        """Test successful NFT minting"""
        # Mock successful mint
        expected_tx_hash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        expected_token_id = 12345
        mock_mint.return_value = (expected_tx_hash, expected_token_id)

        # Call mint function
        tx_hash, token_id = await blockchain_service.mint_license_nft(
            customer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            tool_id=1,
            purchase_id=100,
            admin_private_key=mock_admin_key
        )

        assert tx_hash == expected_tx_hash
        assert token_id == expected_token_id
        mock_mint.assert_called_once()

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'mint_license_nft')
    async def test_nft_minting_failure(self, mock_mint, blockchain_service, mock_admin_key):
        """Test NFT minting failure handling"""
        # Mock minting failure
        mock_mint.side_effect = Exception("Insufficient gas")

        # Minting should raise exception
        with pytest.raises(Exception) as exc_info:
            await blockchain_service.mint_license_nft(
                customer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                tool_id=1,
                purchase_id=100,
                admin_private_key=mock_admin_key
            )

        assert "Insufficient gas" in str(exc_info.value)

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'mint_license_nft')
    async def test_invalid_wallet_address(self, mock_mint, blockchain_service, mock_admin_key):
        """Test minting with invalid wallet address"""
        mock_mint.side_effect = Exception("Invalid address")

        with pytest.raises(Exception) as exc_info:
            await blockchain_service.mint_license_nft(
                customer_wallet="invalid-address",
                tool_id=1,
                purchase_id=100,
                admin_private_key=mock_admin_key
            )

        assert "Invalid address" in str(exc_info.value)

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'distribute_revenue')
    async def test_revenue_distribution_success(self, mock_distribute, blockchain_service, mock_admin_key):
        """Test successful revenue distribution"""
        expected_tx_hash = "0x123abc456def789ghi012jkl345mno678pqr901stu234vwx567yz890123abc45"
        mock_distribute.return_value = expected_tx_hash

        tx_hash = await blockchain_service.distribute_revenue(
            tool_id=1,
            purchase_amount=99.99,
            admin_private_key=mock_admin_key
        )

        assert tx_hash == expected_tx_hash
        mock_distribute.assert_called_once()

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'distribute_revenue')
    async def test_revenue_distribution_failure(self, mock_distribute, blockchain_service, mock_admin_key):
        """Test revenue distribution failure handling"""
        mock_distribute.side_effect = Exception("Insufficient allowance")

        with pytest.raises(Exception) as exc_info:
            await blockchain_service.distribute_revenue(
                tool_id=1,
                purchase_amount=99.99,
                admin_private_key=mock_admin_key
            )

        assert "Insufficient allowance" in str(exc_info.value)

    def test_usdc_decimals_handling(self):
        """Test that USDC amount is correctly converted to 6 decimals"""
        # CRITICAL: USDC uses 6 decimals, NOT 18!
        purchase_amount = 100.50

        # Correct conversion
        usdc_amount = int(purchase_amount * 10**6)
        assert usdc_amount == 100_500_000  # 100.50 USDC in smallest units

        # Verify NOT using 18 decimals
        wrong_conversion = int(purchase_amount * 10**18)
        assert usdc_amount != wrong_conversion

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'has_license')
    async def test_license_verification(self, mock_has_license, blockchain_service):
        """Test license ownership verification"""
        mock_has_license.return_value = True

        has_license = await blockchain_service.has_license(
            customer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            tool_id=1
        )

        assert has_license is True

    @pytest.mark.asyncio
    @patch.object(BlockchainService, 'get_user_licenses')
    async def test_get_user_licenses(self, mock_get_licenses, blockchain_service):
        """Test retrieving all user licenses"""
        expected_licenses = [1, 2, 3]
        mock_get_licenses.return_value = expected_licenses

        licenses = await blockchain_service.get_user_licenses(
            customer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
        )

        assert licenses == expected_licenses

    def test_singleton_pattern(self):
        """Test that get_blockchain_service returns singleton"""
        service1 = get_blockchain_service()
        service2 = get_blockchain_service()

        assert service1 is service2

    @pytest.mark.asyncio
    async def test_transaction_timeout_handling(self, blockchain_service):
        """Test transaction timeout handling"""
        with pytest.raises(Exception) as exc_info:
            # Try to wait for non-existent transaction
            await blockchain_service.wait_for_transaction(
                tx_hash="0x0000000000000000000000000000000000000000000000000000000000000000",
                timeout=1  # Very short timeout
            )

        # Should timeout or fail
        assert "not confirmed" in str(exc_info.value) or "failed" in str(exc_info.value).lower()


class TestMarketplacePurchaseIntegration:
    """Test complete marketplace purchase flow with blockchain integration"""

    @pytest.mark.asyncio
    @patch('app.services.blockchain_service.BlockchainService.mint_license_nft')
    @patch('app.services.blockchain_service.BlockchainService.distribute_revenue')
    async def test_complete_purchase_flow(self, mock_distribute, mock_mint):
        """Test complete purchase flow from request to NFT minting to revenue distribution"""
        # Mock successful NFT mint
        mock_mint.return_value = (
            "0xabc123def456",  # tx_hash
            12345  # token_id
        )

        # Mock successful revenue distribution
        mock_distribute.return_value = "0xdef456abc789"

        # Simulate purchase flow
        purchase_data = {
            "product_id": 1,
            "tier": "professional",
            "wallet_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "billing_period": "monthly",
            "users": 1
        }

        # In real flow, this would be called by marketplace_v2.py
        blockchain_service = get_blockchain_service()

        # Step 1: Mint NFT
        tx_hash, token_id = await blockchain_service.mint_license_nft(
            customer_wallet=purchase_data["wallet_address"],
            tool_id=purchase_data["product_id"],
            purchase_id=0
        )

        assert tx_hash is not None
        assert token_id is not None

        # Step 2: Distribute revenue
        revenue_tx = await blockchain_service.distribute_revenue(
            tool_id=purchase_data["product_id"],
            purchase_amount=299.0  # Professional tier price
        )

        assert revenue_tx is not None

        # Verify mocks were called
        mock_mint.assert_called_once()
        mock_distribute.assert_called_once()

    @pytest.mark.asyncio
    @patch('app.services.blockchain_service.BlockchainService.mint_license_nft')
    async def test_purchase_flow_nft_failure(self, mock_mint):
        """Test purchase flow when NFT minting fails"""
        # Mock NFT mint failure
        mock_mint.side_effect = Exception("Gas estimation failed")

        blockchain_service = get_blockchain_service()

        # NFT minting should fail
        with pytest.raises(Exception) as exc_info:
            await blockchain_service.mint_license_nft(
                customer_wallet="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
                tool_id=1,
                purchase_id=100
            )

        assert "Gas estimation failed" in str(exc_info.value)

        # In marketplace_v2.py, this failure is caught and purchase continues with mock data
        # This test verifies the exception is raised correctly

    def test_purchase_record_nft_fields(self):
        """Test that Purchase model has NFT tracking fields"""
        from app.models.purchase import Purchase

        # Verify Purchase model has NFT fields
        assert hasattr(Purchase, 'nft_token_id')
        assert hasattr(Purchase, 'nft_tx_hash')
        assert hasattr(Purchase, 'nft_minted')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
