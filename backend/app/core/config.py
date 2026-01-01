"""
Varity Generic Template - Configuration
Decentralized storage configuration using Filecoin/IPFS + Lit Protocol
"""
import os
from typing import Optional
from pydantic import Field, ConfigDict
from pydantic_settings import BaseSettings


# CRITICAL: In production (Railway), do NOT read from .env file
# Railway/Nixpacks copies .env into container, which can override Railway env vars
_is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    model_config = ConfigDict(
        extra='ignore',
        env_file=None if _is_production else '.env',  # Only use .env in development
        case_sensitive=False,
        validate_default=True
    )

    # Application
    app_name: str = "Varity Generic Template Dashboard"
    debug: bool = False

    # Pinata (Filecoin/IPFS Gateway) - Optional with defaults for graceful degradation
    pinata_api_key: Optional[str] = Field(None, env="PINATA_API_KEY")
    pinata_secret_key: Optional[str] = Field(None, env="PINATA_SECRET_KEY")
    pinata_jwt: Optional[str] = Field(None, env="PINATA_JWT")
    pinata_api_url: str = "https://api.pinata.cloud"
    pinata_gateway_url: str = Field(
        "https://gateway.pinata.cloud",
        env="PINATA_GATEWAY_URL"
    )

    # Lit Protocol
    lit_network: str = Field("cayenne", env="LIT_NETWORK")  # cayenne = testnet
    lit_debug: bool = False

    # Varity L3 Chain Configuration (Arbitrum Orbit - Conduit)
    varity_l3_chain_id: int = Field(33529, env="VARITY_L3_CHAIN_ID")
    varity_l3_rpc: str = Field(
        "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz",
        env="VARITY_L3_RPC"
    )
    varity_chain_name: str = "Varity L3 Testnet"

    # L3 Data Commitment Contract
    varity_data_commitments_address: Optional[str] = Field(
        None,
        env="VARITY_DATA_COMMITMENTS_ADDRESS"
    )

    # L3 Signing Key for data commitments
    # MUST be set in production for on-chain verification
    varity_l3_private_key: Optional[str] = Field(
        None,
        env="VARITY_L3_PRIVATE_KEY"
    )

    # Namespace Templates
    namespace_template: str = "customer-{wallet_address}/{integration}/{data_type}/{timestamp}"

    # Storage Settings
    max_file_size_mb: int = 100
    allowed_integrations: list = [
        "google-workspace",
        "quickbooks",
        "salesforce",
        "slack",
        "credentials",
        "documents",
        "generic"
    ]

    # API Configuration
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    # Frontend URL (for OAuth redirects - MUST match QuickBooks registered redirect URI)
    frontend_url: str = Field("http://localhost:3001", env="FRONTEND_URL")

    # Privy Authentication (for Management API - user count tracking)
    privy_app_id: Optional[str] = Field(None, env="PRIVY_APP_ID")
    privy_app_secret: Optional[str] = Field(None, env="PRIVY_APP_SECRET")

    # OAuth Integration Settings
    quickbooks_client_id: Optional[str] = Field(None, env="QUICKBOOKS_CLIENT_ID")
    quickbooks_client_secret: Optional[str] = Field(None, env="QUICKBOOKS_CLIENT_SECRET")

    salesforce_client_id: Optional[str] = Field(None, env="SALESFORCE_CLIENT_ID")
    salesforce_client_secret: Optional[str] = Field(None, env="SALESFORCE_CLIENT_SECRET")

    shopify_client_id: Optional[str] = Field(None, env="SHOPIFY_CLIENT_ID")
    shopify_client_secret: Optional[str] = Field(None, env="SHOPIFY_CLIENT_SECRET")

    google_client_id: Optional[str] = Field(None, env="GOOGLE_CLIENT_ID")
    google_client_secret: Optional[str] = Field(None, env="GOOGLE_CLIENT_SECRET")

    microsoft_client_id: Optional[str] = Field(None, env="MICROSOFT_CLIENT_ID")
    microsoft_client_secret: Optional[str] = Field(None, env="MICROSOFT_CLIENT_SECRET")

    stripe_client_id: Optional[str] = Field(None, env="STRIPE_CLIENT_ID")
    stripe_client_secret: Optional[str] = Field(None, env="STRIPE_CLIENT_SECRET")

    slack_client_id: Optional[str] = Field(None, env="SLACK_CLIENT_ID")
    slack_client_secret: Optional[str] = Field(None, env="SLACK_CLIENT_SECRET")

    monday_client_id: Optional[str] = Field(None, env="MONDAY_CLIENT_ID")
    monday_client_secret: Optional[str] = Field(None, env="MONDAY_CLIENT_SECRET")

    hubspot_client_id: Optional[str] = Field(None, env="HUBSPOT_CLIENT_ID")
    hubspot_client_secret: Optional[str] = Field(None, env="HUBSPOT_CLIENT_SECRET")

    zendesk_client_id: Optional[str] = Field(None, env="ZENDESK_CLIENT_ID")
    zendesk_client_secret: Optional[str] = Field(None, env="ZENDESK_CLIENT_SECRET")

    # OpenAI for embeddings (optional)
    openai_api_key: Optional[str] = Field(None, env="OPENAI_API_KEY")

    # Qdrant Vector Database (Multi-Tenant RAG)
    qdrant_url: str = Field("http://localhost:6333", env="QDRANT_URL")
    qdrant_api_key: Optional[str] = Field(None, env="QDRANT_API_KEY")

    # Ollama LLM Configuration (local/self-hosted)
    ollama_url: str = Field("http://localhost:11434", env="OLLAMA_URL")
    ollama_model: str = Field("mistral", env="OLLAMA_MODEL")

    # Together.ai LLM Configuration (cloud API for open-source models)
    # Privacy-focused: Open-source models, no data retention
    together_api_key: Optional[str] = Field(None, env="TOGETHER_API_KEY")
    together_model: str = Field("meta-llama/Llama-3.3-70B-Instruct-Turbo", env="TOGETHER_MODEL")
    together_api_url: str = Field("https://api.together.xyz/v1", env="TOGETHER_API_URL")

    # LLM Provider Selection: "together" (cloud) or "ollama" (local)
    llm_provider: str = Field("together", env="LLM_PROVIDER")

    # Model Context Protocol (MCP) Configuration
    # MCP enables native integration with 6 business applications
    mcp_servers_enabled: bool = Field(True, env="MCP_SERVERS_ENABLED")

    # Web Search Configuration (for AI Assistant internet access)
    # Tavily is recommended for LLM-optimized search results
    # Get API key from: https://tavily.com/
    tavily_api_key: Optional[str] = Field(None, env="TAVILY_API_KEY")

    # Alternative: Serper.dev for Google Search results
    # Get API key from: https://serper.dev/
    serper_api_key: Optional[str] = Field(None, env="SERPER_API_KEY")

    # Logging Configuration
    log_level: str = "INFO"
    log_format: str = "json"

    # Development Settings
    reload: bool = True
    test_wallet_address: str = "0x1234567890abcdef1234567890abcdef12345678"

    # Production Security Settings
    environment: str = Field("development", env="ENVIRONMENT")

    # SECURITY: OAuth state signing secret (RED-002 fix)
    # MUST be set to a secure random value in production
    oauth_state_secret: str = Field(
        "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32",
        env="OAUTH_STATE_SECRET"
    )

    # SECURITY: Server-side encryption secret (RED-001 fix)
    # Added to key derivation to prevent public wallet address attacks
    # MUST be set to a secure random value in production
    encryption_secret: str = Field(
        "CHANGE_ME_IN_PRODUCTION_use_openssl_rand_hex_32",
        env="ENCRYPTION_SECRET"
    )

    # Rate Limiting (Production)
    rate_limit_per_minute: int = Field(60, env="RATE_LIMIT_PER_MINUTE")
    rate_limit_per_hour: int = Field(1000, env="RATE_LIMIT_PER_HOUR")
    rate_limit_per_ip_minute: int = Field(30, env="RATE_LIMIT_PER_IP_MINUTE")

    # Signature Security
    signature_max_age_seconds: int = Field(900, env="SIGNATURE_MAX_AGE_SECONDS")  # 15 minutes
    signature_clock_skew_seconds: int = Field(60, env="SIGNATURE_CLOCK_SKEW_SECONDS")  # 60 seconds

    # HSTS (HTTP Strict Transport Security)
    hsts_enabled: bool = Field(True, env="HSTS_ENABLED")
    hsts_max_age: int = Field(31536000, env="HSTS_MAX_AGE")  # 1 year
    hsts_include_subdomains: bool = Field(True, env="HSTS_INCLUDE_SUBDOMAINS")
    hsts_preload: bool = Field(True, env="HSTS_PRELOAD")

    # Session Security
    session_cookie_secure: bool = Field(True, env="SESSION_COOKIE_SECURE")
    session_cookie_httponly: bool = Field(True, env="SESSION_COOKIE_HTTPONLY")
    session_cookie_samesite: str = Field("strict", env="SESSION_COOKIE_SAMESITE")

    # Security Headers
    csp_enabled: bool = Field(True, env="CSP_ENABLED")
    x_frame_options: str = Field("DENY", env="X_FRAME_OPTIONS")
    x_content_type_options: str = Field("nosniff", env="X_CONTENT_TYPE_OPTIONS")
    x_xss_protection: str = Field("1; mode=block", env="X_XSS_PROTECTION")
    referrer_policy: str = Field("strict-origin-when-cross-origin", env="REFERRER_POLICY")

    # Audit Logging
    audit_log_enabled: bool = Field(True, env="AUDIT_LOG_ENABLED")
    audit_log_unauthorized_access: bool = Field(True, env="AUDIT_LOG_UNAUTHORIZED_ACCESS")
    audit_log_signature_failures: bool = Field(True, env="AUDIT_LOG_SIGNATURE_FAILURES")

    # Production CORS Origins (no wildcards in production)
    production_cors_origins: list = Field(
        default=[
            "https://varity.app",
            "https://dashboard.varity.app",
            "https://generic.varity.app"
        ],
        env="PRODUCTION_CORS_ORIGINS"
    )

    def get_cors_origins(self) -> list:
        """Get CORS origins based on environment"""
        if self.environment == "production":
            return self.production_cors_origins
        else:
            # Development: use permissive localhost origins
            return self.cors_origins.split(",")

    def is_production(self) -> bool:
        """Check if running in production environment"""
        return self.environment.lower() == "production"

    def get_security_headers(self) -> dict:
        """Get security headers for production"""
        headers = {
            "X-Content-Type-Options": self.x_content_type_options,
            "X-Frame-Options": self.x_frame_options,
            "X-XSS-Protection": self.x_xss_protection,
            "Referrer-Policy": self.referrer_policy,
        }

        if self.hsts_enabled and self.is_production():
            hsts_value = f"max-age={self.hsts_max_age}"
            if self.hsts_include_subdomains:
                hsts_value += "; includeSubDomains"
            if self.hsts_preload:
                hsts_value += "; preload"
            headers["Strict-Transport-Security"] = hsts_value

        if self.csp_enabled:
            headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' "
                "https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz "
                "https://api.pinata.cloud "
                "https://varity.mypinata.cloud "
                "https://gateway.pinata.cloud "
                "https://api.together.xyz "
                "https://api.tavily.com "
                "https://api.serper.dev; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self'"
            )

        return headers


class NamespaceConfig:
    """Namespace path generation and validation"""

    @staticmethod
    def build_namespace(
        customer_wallet: str,
        integration: str,
        data_type: str,
        timestamp: str
    ) -> str:
        """
        Build a namespace path following Varity conventions

        Args:
            customer_wallet: Customer's wallet address (0x...)
            integration: Integration name (e.g., 'google-workspace')
            data_type: Type of data (e.g., 'emails', 'invoices')
            timestamp: ISO timestamp or identifier

        Returns:
            Formatted namespace path
        """
        # Normalize wallet address
        wallet = customer_wallet.lower()
        if not wallet.startswith("0x"):
            wallet = f"0x{wallet}"

        # Build path
        namespace = f"customer-{wallet}/{integration}/{data_type}/{timestamp}.json.enc"
        return namespace

    @staticmethod
    def parse_namespace(namespace: str) -> dict:
        """
        Parse a namespace path back into components

        Args:
            namespace: Full namespace path

        Returns:
            Dictionary with wallet, integration, data_type, timestamp
        """
        parts = namespace.split("/")
        if len(parts) != 4:
            raise ValueError(f"Invalid namespace format: {namespace}")

        customer_part = parts[0]
        if not customer_part.startswith("customer-"):
            raise ValueError(f"Invalid customer prefix: {customer_part}")

        wallet = customer_part.replace("customer-", "")
        integration = parts[1]
        data_type = parts[2]
        timestamp = parts[3].replace(".json.enc", "")

        return {
            "wallet": wallet,
            "integration": integration,
            "data_type": data_type,
            "timestamp": timestamp
        }


# Global settings instance
settings = Settings()
