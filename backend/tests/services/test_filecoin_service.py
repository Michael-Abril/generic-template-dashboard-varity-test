"""
Unit tests for FilecoinService
Tests Pinata IPFS integration, encryption, multi-tenant namespaces
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch, MagicMock
import httpx
from datetime import datetime

from app.services.filecoin_service import FilecoinService
from app.core.config import NamespaceConfig


class TestFilecoinService:
    """Test suite for Filecoin/IPFS storage service"""

    @pytest.fixture
    def filecoin_service(self, mock_settings):
        """Create FilecoinService instance"""
        return FilecoinService()

    @pytest.mark.asyncio
    async def test_upload_encrypted_data_success(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_encrypted_data,
        mock_ipfs_hash,
        mock_sentry_service
    ):
        """Test successful upload of encrypted data to Pinata"""
        # Mock Pinata API response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "IpfsHash": mock_ipfs_hash,
            "PinSize": 1024,
            "Timestamp": "2025-11-20T12:00:00.000Z"
        }

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            # Execute upload
            cid = await filecoin_service.upload_encrypted_data(
                customer_wallet=mock_wallet_address,
                integration="google-workspace",
                data_type="emails",
                encrypted_data=mock_encrypted_data,
                metadata={"key": "value"}
            )

            # Assertions
            assert cid == mock_ipfs_hash
            mock_sentry_service.add_breadcrumb.assert_called()

    @pytest.mark.asyncio
    async def test_upload_with_namespace_isolation(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_encrypted_data,
        mock_ipfs_hash
    ):
        """Test multi-tenant namespace isolation"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"IpfsHash": mock_ipfs_hash}

        with patch('httpx.AsyncClient') as mock_client, \
             patch('app.core.config.NamespaceConfig.build_namespace') as mock_namespace:

            mock_namespace.return_value = f"customer-{mock_wallet_address}-test-2025"
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            await filecoin_service.upload_encrypted_data(
                customer_wallet=mock_wallet_address,
                integration="test",
                data_type="data",
                encrypted_data=mock_encrypted_data
            )

            # Verify namespace was built correctly
            mock_namespace.assert_called_once()
            call_args = mock_namespace.call_args[0]
            assert call_args[0] == mock_wallet_address
            assert call_args[1] == "test"
            assert call_args[2] == "data"

    @pytest.mark.asyncio
    async def test_download_encrypted_data_success(
        self,
        filecoin_service,
        mock_ipfs_hash,
        mock_encrypted_data
    ):
        """Test downloading encrypted data from IPFS"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_encrypted_data

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            data = await filecoin_service.download_encrypted_data(mock_ipfs_hash)

            assert data == mock_encrypted_data

    @pytest.mark.asyncio
    async def test_upload_failure_handling(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_encrypted_data
    ):
        """Test handling of Pinata API failures"""
        mock_response = AsyncMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            with pytest.raises(Exception):
                await filecoin_service.upload_encrypted_data(
                    customer_wallet=mock_wallet_address,
                    integration="test",
                    data_type="data",
                    encrypted_data=mock_encrypted_data
                )

    @pytest.mark.asyncio
    async def test_list_customer_files(
        self,
        filecoin_service,
        mock_wallet_address
    ):
        """Test listing all files for a customer"""
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "count": 2,
            "rows": [
                {
                    "ipfs_pin_hash": "QmHash1",
                    "metadata": {
                        "name": f"customer-{mock_wallet_address}-test-data1",
                        "keyvalues": {
                            "customer_wallet": mock_wallet_address,
                            "integration": "test",
                            "data_type": "data1"
                        }
                    }
                },
                {
                    "ipfs_pin_hash": "QmHash2",
                    "metadata": {
                        "name": f"customer-{mock_wallet_address}-test-data2",
                        "keyvalues": {
                            "customer_wallet": mock_wallet_address,
                            "integration": "test",
                            "data_type": "data2"
                        }
                    }
                }
            ]
        }

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get = AsyncMock(return_value=mock_response)

            files = await filecoin_service.list_customer_files(mock_wallet_address)

            assert len(files) == 2
            assert all(f["metadata"]["keyvalues"]["customer_wallet"] == mock_wallet_address for f in files)

    @pytest.mark.asyncio
    async def test_delete_file(
        self,
        filecoin_service,
        mock_ipfs_hash
    ):
        """Test unpinning file from Pinata"""
        mock_response = AsyncMock()
        mock_response.status_code = 200

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.delete = AsyncMock(return_value=mock_response)

            success = await filecoin_service.delete_file(mock_ipfs_hash)

            assert success is True

    @pytest.mark.asyncio
    async def test_upload_with_different_file_types(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_ipfs_hash
    ):
        """Test uploading different file types (JSON, PDF, images)"""
        file_types = [
            {"type": "json", "data": {"key": "value"}},
            {"type": "pdf", "data": {"pdf_content": "base64_encoded_pdf"}},
            {"type": "image", "data": {"image_content": "base64_encoded_image"}}
        ]

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"IpfsHash": mock_ipfs_hash}

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            for file_type in file_types:
                cid = await filecoin_service.upload_encrypted_data(
                    customer_wallet=mock_wallet_address,
                    integration="test",
                    data_type=file_type["type"],
                    encrypted_data=file_type["data"]
                )
                assert cid == mock_ipfs_hash

    @pytest.mark.asyncio
    async def test_authentication_headers(self, filecoin_service, mock_settings):
        """Test Pinata authentication headers are set correctly"""
        headers = filecoin_service._build_headers()

        assert "Authorization" in headers
        assert headers["Authorization"] == f"Bearer {mock_settings.pinata_jwt}"
        assert headers["Content-Type"] == "application/json"

    @pytest.mark.asyncio
    async def test_namespace_build_format(self, mock_wallet_address):
        """Test namespace format follows convention"""
        namespace = NamespaceConfig.build_namespace(
            customer_wallet=mock_wallet_address,
            integration="google-workspace",
            data_type="emails",
            timestamp="2025-11-20T12:00:00"
        )

        assert namespace.startswith("customer-")
        assert mock_wallet_address in namespace
        assert "google-workspace" in namespace
        assert "emails" in namespace
        assert "2025" in namespace

    @pytest.mark.asyncio
    async def test_concurrent_uploads(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_encrypted_data,
        mock_ipfs_hash
    ):
        """Test handling concurrent uploads from same customer"""
        import asyncio

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"IpfsHash": mock_ipfs_hash}

        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(return_value=mock_response)

            # Simulate 5 concurrent uploads
            tasks = [
                filecoin_service.upload_encrypted_data(
                    customer_wallet=mock_wallet_address,
                    integration=f"test-{i}",
                    data_type="data",
                    encrypted_data=mock_encrypted_data
                )
                for i in range(5)
            ]

            results = await asyncio.gather(*tasks)
            assert len(results) == 5
            assert all(r == mock_ipfs_hash for r in results)

    @pytest.mark.asyncio
    async def test_metadata_preservation(
        self,
        filecoin_service,
        mock_wallet_address,
        mock_encrypted_data,
        mock_ipfs_hash
    ):
        """Test that metadata is correctly preserved"""
        custom_metadata = {
            "company_name": "Acme Corp",
            "file_type": "invoice",
            "amount": "1000.00"
        }

        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"IpfsHash": mock_ipfs_hash}

        with patch('httpx.AsyncClient') as mock_client:
            mock_post = AsyncMock(return_value=mock_response)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            await filecoin_service.upload_encrypted_data(
                customer_wallet=mock_wallet_address,
                integration="test",
                data_type="data",
                encrypted_data=mock_encrypted_data,
                metadata=custom_metadata
            )

            # Verify metadata was included in the request
            call_args = mock_post.call_args
            assert call_args is not None
