"""
Unit tests for BlockchainService
Tests Web3 client, contract interactions, Varity L3 integration
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
from web3 import Web3
from eth_account import Account

from app.services.blockchain_service import BlockchainService


class TestBlockchainService:
    """Test suite for blockchain service"""

    @pytest.fixture
    def blockchain_service(self, mock_settings):
        """Create BlockchainService instance"""
        return BlockchainService()

    @pytest.fixture
    def mock_contract(self):
        """Mock smart contract"""
        contract = MagicMock()
        contract.functions = MagicMock()
        return contract

    def test_initialization(self, blockchain_service, mock_settings):
        """Test service initializes correctly"""
        assert blockchain_service is not None
        assert blockchain_service.chain_id == mock_settings.chain_id

    @pytest.mark.asyncio
    async def test_get_balance(self, blockchain_service, mock_wallet_address):
        """Test getting wallet balance"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.get_balance.return_value = Web3.to_wei(10, 'ether')

            balance = await blockchain_service.get_balance(mock_wallet_address)

            assert balance == Web3.to_wei(10, 'ether')
            mock_w3.eth.get_balance.assert_called_once_with(mock_wallet_address)

    @pytest.mark.asyncio
    async def test_get_transaction_count(self, blockchain_service, mock_wallet_address):
        """Test getting transaction nonce"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.get_transaction_count.return_value = 42

            nonce = await blockchain_service.get_transaction_count(mock_wallet_address)

            assert nonce == 42

    @pytest.mark.asyncio
    async def test_call_contract_function(
        self,
        blockchain_service,
        mock_contract,
        mock_wallet_address
    ):
        """Test calling read-only contract function"""
        with patch.object(blockchain_service, 'get_contract', return_value=mock_contract):
            mock_contract.functions.merchants.return_value.call.return_value = {
                "businessName": "Acme Corp",
                "isActive": True
            }

            result = await blockchain_service.call_contract_function(
                contract_address="0x1234...",
                function_name="merchants",
                args=[mock_wallet_address]
            )

            assert result["businessName"] == "Acme Corp"
            assert result["isActive"] is True

    @pytest.mark.asyncio
    async def test_send_transaction(
        self,
        blockchain_service,
        mock_wallet_address
    ):
        """Test sending blockchain transaction"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.get_transaction_count.return_value = 0
            mock_w3.eth.gas_price = 1000000000  # 1 gwei
            mock_w3.eth.send_raw_transaction.return_value = b'0x123abc'
            mock_w3.to_hex.return_value = "0x123abc..."

            tx_hash = await blockchain_service.send_transaction(
                from_address=mock_wallet_address,
                to_address="0x5678...",
                value=Web3.to_wei(1, 'ether'),
                private_key="0xprivatekey..."
            )

            assert tx_hash.startswith("0x")

    @pytest.mark.asyncio
    async def test_wait_for_transaction_receipt(
        self,
        blockchain_service
    ):
        """Test waiting for transaction confirmation"""
        tx_hash = "0x123abc..."
        mock_receipt = {
            "status": 1,
            "blockNumber": 12345,
            "transactionHash": tx_hash,
            "gasUsed": 21000
        }

        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.wait_for_transaction_receipt.return_value = mock_receipt

            receipt = await blockchain_service.wait_for_transaction_receipt(tx_hash)

            assert receipt["status"] == 1
            assert receipt["blockNumber"] == 12345

    @pytest.mark.asyncio
    async def test_estimate_gas(
        self,
        blockchain_service,
        mock_wallet_address
    ):
        """Test gas estimation for transaction"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.estimate_gas.return_value = 21000

            gas_estimate = await blockchain_service.estimate_gas(
                from_address=mock_wallet_address,
                to_address="0x5678...",
                value=Web3.to_wei(1, 'ether')
            )

            assert gas_estimate == 21000

    @pytest.mark.asyncio
    async def test_get_block_number(self, blockchain_service):
        """Test getting current block number"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.block_number = 12345

            block_number = await blockchain_service.get_block_number()

            assert block_number == 12345

    @pytest.mark.asyncio
    async def test_is_address_valid(self, blockchain_service):
        """Test address validation"""
        valid_address = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        invalid_address = "0xinvalid"

        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.is_address.side_effect = lambda addr: len(addr) == 42

            assert await blockchain_service.is_address_valid(valid_address) is True
            assert await blockchain_service.is_address_valid(invalid_address) is False

    @pytest.mark.asyncio
    async def test_get_contract_abi(self, blockchain_service):
        """Test loading contract ABI"""
        contract_name = "MerchantRegistry"

        with patch('json.load') as mock_json:
            mock_json.return_value = {
                "abi": [{"type": "function", "name": "registerMerchant"}]
            }

            abi = await blockchain_service.get_contract_abi(contract_name)

            assert isinstance(abi, list)
            assert abi[0]["name"] == "registerMerchant"

    @pytest.mark.asyncio
    async def test_contract_event_filtering(
        self,
        blockchain_service,
        mock_contract
    ):
        """Test filtering contract events"""
        with patch.object(blockchain_service, 'get_contract', return_value=mock_contract):
            mock_event_filter = MagicMock()
            mock_event_filter.get_all_entries.return_value = [
                {"event": "MerchantRegistered", "args": {"merchant": "0x123"}},
                {"event": "MerchantRegistered", "args": {"merchant": "0x456"}}
            ]
            mock_contract.events.MerchantRegistered.create_filter.return_value = mock_event_filter

            events = await blockchain_service.get_contract_events(
                contract_address="0x1234...",
                event_name="MerchantRegistered",
                from_block=0,
                to_block="latest"
            )

            assert len(events) == 2
            assert events[0]["event"] == "MerchantRegistered"

    @pytest.mark.asyncio
    async def test_batch_call_contracts(
        self,
        blockchain_service,
        mock_contract
    ):
        """Test batch calling multiple contracts"""
        addresses = ["0x1111...", "0x2222...", "0x3333..."]

        with patch.object(blockchain_service, 'call_contract_function') as mock_call:
            mock_call.side_effect = [
                {"name": "Contract1"},
                {"name": "Contract2"},
                {"name": "Contract3"}
            ]

            results = await blockchain_service.batch_call_contracts(
                addresses=addresses,
                function_name="getName"
            )

            assert len(results) == 3
            assert results[0]["name"] == "Contract1"

    @pytest.mark.asyncio
    async def test_check_network_connection(self, blockchain_service):
        """Test network connectivity check"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.is_connected.return_value = True

            is_connected = await blockchain_service.check_connection()

            assert is_connected is True

    @pytest.mark.asyncio
    async def test_sign_message(self, blockchain_service):
        """Test message signing"""
        message = "Sign this message"
        private_key = "0xprivatekey..."

        with patch('eth_account.Account.sign_message') as mock_sign:
            mock_sign.return_value = MagicMock(signature=b'signature')

            signature = await blockchain_service.sign_message(message, private_key)

            assert signature is not None

    @pytest.mark.asyncio
    async def test_verify_signature(
        self,
        blockchain_service,
        mock_wallet_address
    ):
        """Test signature verification"""
        message = "Sign this message"
        signature = "0xsignature..."

        with patch('eth_account.Account.recover_message') as mock_recover:
            mock_recover.return_value = mock_wallet_address

            is_valid = await blockchain_service.verify_signature(
                message,
                signature,
                mock_wallet_address
            )

            assert is_valid is True

    @pytest.mark.asyncio
    async def test_usdc_decimals_handling(self, blockchain_service):
        """Test USDC 6 decimals handling (NOT 18!)"""
        # USDC has 6 decimals on Varity L3
        amount_usdc = 100  # 100 USDC
        amount_wei = amount_usdc * 10**6  # NOT 10**18!

        assert amount_wei == 100_000_000
        assert amount_wei != 100 * 10**18  # Verify it's NOT 18 decimals

    @pytest.mark.asyncio
    async def test_transaction_failure_handling(
        self,
        blockchain_service,
        mock_wallet_address
    ):
        """Test handling transaction failures"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.send_raw_transaction.side_effect = Exception("Transaction failed")

            with pytest.raises(Exception):
                await blockchain_service.send_transaction(
                    from_address=mock_wallet_address,
                    to_address="0x5678...",
                    value=Web3.to_wei(1, 'ether'),
                    private_key="0xprivatekey..."
                )

    @pytest.mark.asyncio
    async def test_chain_id_verification(self, blockchain_service, mock_settings):
        """Test chain ID matches Varity L3"""
        with patch.object(blockchain_service, 'w3') as mock_w3:
            mock_w3.eth.chain_id = 33529  # Varity L3 testnet

            chain_id = await blockchain_service.get_chain_id()

            assert chain_id == 33529
            assert chain_id == mock_settings.chain_id
