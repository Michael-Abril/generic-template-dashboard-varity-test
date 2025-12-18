"""
Varity Namespace Utilities
Namespace path generation and validation following Varity 3-layer architecture
"""
from datetime import datetime
from typing import Optional
from enum import Enum


class StorageLayer(Enum):
    """3-layer storage architecture"""
    VARITY_INTERNAL = "varity-internal"
    INDUSTRY_RAG = "industry-rag"
    CUSTOMER_DATA = "customer-data"


class NamespaceBuilder:
    """
    Build storage namespaces following Varity conventions
    Implements the 3-layer encrypted storage architecture
    """

    @staticmethod
    def varity_internal(category: str, subcategory: Optional[str] = None) -> str:
        """
        Layer 1: Varity internal storage

        Example: varity-internal/platform-docs/2024-11-14T12:00:00

        Args:
            category: Document category (e.g., 'platform-docs', 'marketing')
            subcategory: Optional subcategory

        Returns:
            Namespace path for Varity internal storage
        """
        timestamp = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")

        if subcategory:
            return f"{StorageLayer.VARITY_INTERNAL.value}/{category}/{subcategory}/{timestamp}"
        else:
            return f"{StorageLayer.VARITY_INTERNAL.value}/{category}/{timestamp}"

    @staticmethod
    def industry_rag(
        industry: str,
        category: str,
        version: int = 1,
        subcategory: Optional[str] = None
    ) -> str:
        """
        Layer 2: Industry RAG storage

        Example: industry-rag/iso-merchant/compliance/v1/pci-dss

        Args:
            industry: Industry name (e.g., 'iso-merchant', 'healthcare', 'finance')
            category: Knowledge category (e.g., 'compliance', 'best-practices')
            version: Version number for knowledge base versioning
            subcategory: Optional subcategory

        Returns:
            Namespace path for industry RAG storage
        """
        if subcategory:
            return f"{StorageLayer.INDUSTRY_RAG.value}/{industry}/{category}/v{version}/{subcategory}"
        else:
            return f"{StorageLayer.INDUSTRY_RAG.value}/{industry}/{category}/v{version}"

    @staticmethod
    def customer_integration(
        wallet: str,
        integration: str,
        data_type: str,
        timestamp: Optional[str] = None
    ) -> str:
        """
        Layer 3: Customer integration data

        Example: customer-data/0x1234.../google-workspace/emails/2024-11-14T12:00:00

        Args:
            wallet: Customer wallet address
            integration: Integration name (e.g., 'google-workspace', 'quickbooks')
            data_type: Type of data (e.g., 'emails', 'invoices')
            timestamp: Optional custom timestamp (ISO format)

        Returns:
            Namespace path for customer integration data
        """
        # Normalize wallet address
        wallet_normalized = wallet.lower()
        if not wallet_normalized.startswith("0x"):
            wallet_normalized = f"0x{wallet_normalized}"

        # Use provided timestamp or generate new one
        if not timestamp:
            timestamp = datetime.utcnow().isoformat()

        return f"{StorageLayer.CUSTOMER_DATA.value}/{wallet_normalized}/{integration}/{data_type}/{timestamp}"

    @staticmethod
    def customer_credentials(wallet: str, provider: str) -> str:
        """
        Layer 3: Customer OAuth credentials

        Example: customer-data/0x1234.../credentials/google

        Args:
            wallet: Customer wallet address
            provider: OAuth provider (e.g., 'google', 'quickbooks', 'salesforce')

        Returns:
            Namespace path for customer credentials
        """
        # Normalize wallet address
        wallet_normalized = wallet.lower()
        if not wallet_normalized.startswith("0x"):
            wallet_normalized = f"0x{wallet_normalized}"

        return f"{StorageLayer.CUSTOMER_DATA.value}/{wallet_normalized}/credentials/{provider}"

    @staticmethod
    def customer_document(
        wallet: str,
        doc_type: str,
        filename: str,
        timestamp: Optional[str] = None
    ) -> str:
        """
        Layer 3: Customer document storage

        Example: customer-data/0x1234.../documents/contracts/contract_v1.pdf/2024-11-14

        Args:
            wallet: Customer wallet address
            doc_type: Document type (e.g., 'contracts', 'invoices', 'reports')
            filename: Original filename
            timestamp: Optional timestamp

        Returns:
            Namespace path for customer documents
        """
        # Normalize wallet address
        wallet_normalized = wallet.lower()
        if not wallet_normalized.startswith("0x"):
            wallet_normalized = f"0x{wallet_normalized}"

        if not timestamp:
            timestamp = datetime.utcnow().strftime("%Y-%m-%d")

        return f"{StorageLayer.CUSTOMER_DATA.value}/{wallet_normalized}/documents/{doc_type}/{filename}/{timestamp}"

    @staticmethod
    def extract_wallet(namespace: str) -> Optional[str]:
        """
        Extract wallet address from namespace

        Args:
            namespace: Full namespace path

        Returns:
            Wallet address or None if not customer data
        """
        parts = namespace.split("/")

        # Check if this is customer data
        if parts[0] != StorageLayer.CUSTOMER_DATA.value:
            return None

        # Extract wallet from second part
        if len(parts) > 1:
            return parts[1]

        return None

    @staticmethod
    def extract_layer(namespace: str) -> Optional[StorageLayer]:
        """
        Extract storage layer from namespace

        Args:
            namespace: Full namespace path

        Returns:
            StorageLayer enum or None if invalid
        """
        parts = namespace.split("/")

        if not parts:
            return None

        layer_str = parts[0]

        for layer in StorageLayer:
            if layer.value == layer_str:
                return layer

        return None

    @staticmethod
    def validate_namespace(namespace: str) -> bool:
        """
        Validate namespace format

        Args:
            namespace: Namespace path to validate

        Returns:
            True if valid, False otherwise
        """
        parts = namespace.split("/")

        if len(parts) < 2:
            return False

        # Check if first part is valid layer
        layer = NamespaceBuilder.extract_layer(namespace)
        if layer is None:
            return False

        # Layer-specific validation
        if layer == StorageLayer.VARITY_INTERNAL:
            # varity-internal/{category}/{timestamp}
            return len(parts) >= 2

        elif layer == StorageLayer.INDUSTRY_RAG:
            # industry-rag/{industry}/{category}/v{version}
            return len(parts) >= 4

        elif layer == StorageLayer.CUSTOMER_DATA:
            # customer-data/{wallet}/{integration}/{data_type}/...
            # Validate wallet format
            if len(parts) < 3:
                return False

            wallet = parts[1]
            if not wallet.startswith("0x"):
                return False

            return True

        return False


class NamespaceMetadata:
    """Helper class to extract metadata from namespaces"""

    @staticmethod
    def parse_customer_namespace(namespace: str) -> dict:
        """
        Parse customer data namespace into components

        Args:
            namespace: Customer namespace path

        Returns:
            Dictionary with wallet, integration, data_type, etc.
        """
        parts = namespace.split("/")

        if parts[0] != StorageLayer.CUSTOMER_DATA.value:
            raise ValueError("Not a customer data namespace")

        if len(parts) < 4:
            raise ValueError(f"Invalid customer namespace format: {namespace}")

        result = {
            "layer": StorageLayer.CUSTOMER_DATA,
            "wallet": parts[1],
            "integration": parts[2],
            "data_type": parts[3]
        }

        # Add timestamp if present
        if len(parts) > 4:
            result["timestamp"] = parts[4]

        return result

    @staticmethod
    def parse_industry_namespace(namespace: str) -> dict:
        """
        Parse industry RAG namespace into components

        Args:
            namespace: Industry RAG namespace path

        Returns:
            Dictionary with industry, category, version
        """
        parts = namespace.split("/")

        if parts[0] != StorageLayer.INDUSTRY_RAG.value:
            raise ValueError("Not an industry RAG namespace")

        if len(parts) < 4:
            raise ValueError(f"Invalid industry namespace format: {namespace}")

        # Extract version number from v{N} format
        version_str = parts[3]
        version = int(version_str.replace("v", "")) if version_str.startswith("v") else 1

        result = {
            "layer": StorageLayer.INDUSTRY_RAG,
            "industry": parts[1],
            "category": parts[2],
            "version": version
        }

        # Add subcategory if present
        if len(parts) > 4:
            result["subcategory"] = parts[4]

        return result
