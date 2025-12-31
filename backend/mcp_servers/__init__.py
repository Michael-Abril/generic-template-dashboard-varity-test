"""
MCP Servers Package

Model Context Protocol server configurations and wrappers for integrations.
All MCP servers run in backend only - user-facing applications never see them.

Usage:
    from mcp_servers import MCP_SERVER_REGISTRY, MCPClient, fetch_integration_data

    # Direct client usage
    async with MCPClient("google") as client:
        await client.connect(oauth_token)
        data = await client.call_tool("google_drive_list_files")

    # Unified fetch interface
    data = await fetch_integration_data("google", "drive_files", oauth_token)
"""

from .config import MCP_SERVER_REGISTRY
from .client import (
    MCPClient,
    MCPClientError,
    fetch_integration_data,
    fetch_google_data,
    fetch_slack_data,
    fetch_quickbooks_data,
    fetch_microsoft_data,
    fetch_salesforce_data,
    fetch_hubspot_data,
)

__all__ = [
    "MCP_SERVER_REGISTRY",
    "MCPClient",
    "MCPClientError",
    "fetch_integration_data",
    "fetch_google_data",
    "fetch_slack_data",
    "fetch_quickbooks_data",
    "fetch_microsoft_data",
    "fetch_salesforce_data",
    "fetch_hubspot_data",
]
