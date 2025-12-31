"""
MCP Client Wrapper

Provides async interface to MCP servers for data fetching.
Each integration uses its configured MCP server from config.py.

Usage:
    client = MCPClient("google")
    data = await client.call_tool("google_drive_list_files", {"folder_id": "root"})
"""

import asyncio
import subprocess
import json
import os
from typing import Dict, Any, Optional, List
import logging

from .config import MCP_SERVER_REGISTRY

logger = logging.getLogger(__name__)


class MCPClientError(Exception):
    """MCP client error"""
    pass


class MCPClient:
    """
    Async MCP client wrapper.

    Communicates with MCP servers via stdio transport.
    Handles tool invocation and response parsing.
    """

    def __init__(self, integration: str):
        """
        Initialize MCP client for an integration.

        Args:
            integration: Integration name (google, slack, quickbooks, etc.)
        """
        if integration not in MCP_SERVER_REGISTRY:
            raise MCPClientError(f"Unknown integration: {integration}")

        self.integration = integration
        self.config = MCP_SERVER_REGISTRY[integration]
        self._process: Optional[subprocess.Popen] = None
        self._initialized = False

    @property
    def available_tools(self) -> List[str]:
        """List available tools for this integration"""
        return self.config.get("tools", [])

    async def connect(self, oauth_token: str, extra_env: Optional[Dict[str, str]] = None) -> bool:
        """
        Start MCP server process and establish connection.

        Args:
            oauth_token: OAuth access token for the integration
            extra_env: Additional environment variables

        Returns:
            True if connected successfully
        """
        if self._initialized:
            return True

        try:
            # Build environment with OAuth token
            env = os.environ.copy()
            env[f"{self.integration.upper()}_ACCESS_TOKEN"] = oauth_token

            # Add integration-specific env vars
            if self.integration == "google":
                env["GOOGLE_ACCESS_TOKEN"] = oauth_token
            elif self.integration == "slack":
                env["SLACK_BOT_TOKEN"] = oauth_token
            elif self.integration == "quickbooks":
                env["QUICKBOOKS_ACCESS_TOKEN"] = oauth_token
                # QuickBooks also needs realm ID
                if extra_env and "realm_id" in extra_env:
                    env["QUICKBOOKS_REALM_ID"] = extra_env["realm_id"]
            elif self.integration == "microsoft":
                env["MS365_ACCESS_TOKEN"] = oauth_token
            elif self.integration == "salesforce":
                env["SALESFORCE_ACCESS_TOKEN"] = oauth_token
                if extra_env and "instance_url" in extra_env:
                    env["SALESFORCE_INSTANCE_URL"] = extra_env["instance_url"]
            elif self.integration == "hubspot":
                env["HUBSPOT_ACCESS_TOKEN"] = oauth_token

            if extra_env:
                env.update(extra_env)

            # Start MCP server process
            cmd = [self.config["command"]] + self.config["args"]

            self._process = await asyncio.create_subprocess_exec(
                *cmd,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            # Send initialize request (MCP protocol)
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {},
                    "clientInfo": {
                        "name": "varity-mcp-client",
                        "version": "1.0.0"
                    }
                }
            }

            response = await self._send_request(init_request)

            if response and "result" in response:
                self._initialized = True
                logger.info(f"MCP client connected: {self.integration}")
                return True

            logger.error(f"MCP initialization failed for {self.integration}: {response}")
            return False

        except Exception as e:
            logger.error(f"MCP connection error for {self.integration}: {e}")
            return False

    async def _send_request(self, request: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Send JSON-RPC request to MCP server.

        Args:
            request: JSON-RPC request object

        Returns:
            Response dict or None on error
        """
        if not self._process or not self._process.stdin or not self._process.stdout:
            raise MCPClientError("MCP process not running")

        try:
            # Send request
            request_bytes = (json.dumps(request) + "\n").encode()
            self._process.stdin.write(request_bytes)
            await self._process.stdin.drain()

            # Read response (with timeout)
            response_line = await asyncio.wait_for(
                self._process.stdout.readline(),
                timeout=30.0
            )

            if response_line:
                return json.loads(response_line.decode())

            return None

        except asyncio.TimeoutError:
            logger.error(f"MCP request timeout for {self.integration}")
            return None
        except Exception as e:
            logger.error(f"MCP request error: {e}")
            return None

    async def call_tool(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Invoke an MCP tool.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments

        Returns:
            Tool result or error dict
        """
        if not self._initialized:
            return {"error": "MCP client not initialized"}

        if tool_name not in self.available_tools:
            return {"error": f"Unknown tool: {tool_name}"}

        request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }

        response = await self._send_request(request)

        if response and "result" in response:
            return response["result"]
        elif response and "error" in response:
            return {"error": response["error"]}
        else:
            return {"error": "No response from MCP server"}

    async def list_tools(self) -> List[Dict[str, Any]]:
        """
        List available tools from MCP server.

        Returns:
            List of tool definitions
        """
        if not self._initialized:
            return []

        request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/list",
            "params": {}
        }

        response = await self._send_request(request)

        if response and "result" in response:
            return response["result"].get("tools", [])

        return []

    async def disconnect(self):
        """Terminate MCP server process"""
        if self._process:
            try:
                self._process.terminate()
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
            except Exception:
                self._process.kill()
            finally:
                self._process = None
                self._initialized = False

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.disconnect()


# Integration-specific data fetchers

async def fetch_google_data(
    oauth_token: str,
    data_type: str,
) -> Dict[str, Any]:
    """
    Fetch Google Workspace data via MCP.

    Args:
        oauth_token: Google OAuth access token
        data_type: Type of data (drive_files, contacts, gmail, calendar)

    Returns:
        Fetched data or error
    """
    async with MCPClient("google") as client:
        if not await client.connect(oauth_token):
            return {"error": "Failed to connect to Google MCP"}

        tool_map = {
            "drive_files": ("google_drive_list_files", {}),
            "contacts": ("google_contacts_list", {}),
            "gmail": ("google_gmail_list_messages", {"max_results": 50}),
            "calendar": ("google_calendar_list_events", {"max_results": 50}),
        }

        if data_type not in tool_map:
            return {"error": f"Unknown data type: {data_type}"}

        tool_name, args = tool_map[data_type]
        return await client.call_tool(tool_name, args)


async def fetch_slack_data(
    oauth_token: str,
    data_type: str,
) -> Dict[str, Any]:
    """
    Fetch Slack data via MCP.

    Args:
        oauth_token: Slack OAuth access token
        data_type: Type of data (channels, messages, users, files)

    Returns:
        Fetched data or error
    """
    async with MCPClient("slack") as client:
        if not await client.connect(oauth_token):
            return {"error": "Failed to connect to Slack MCP"}

        tool_map = {
            "channels": ("slack_list_channels", {}),
            "users": ("slack_list_users", {}),
            "files": ("slack_list_files", {}),
        }

        if data_type not in tool_map:
            return {"error": f"Unknown data type: {data_type}"}

        tool_name, args = tool_map[data_type]
        return await client.call_tool(tool_name, args)


async def fetch_quickbooks_data(
    oauth_token: str,
    data_type: str,
    realm_id: str,
) -> Dict[str, Any]:
    """
    Fetch QuickBooks data via MCP.

    Args:
        oauth_token: QuickBooks OAuth access token
        data_type: Type of data (invoices, customers, payments)
        realm_id: QuickBooks realm/company ID

    Returns:
        Fetched data or error
    """
    async with MCPClient("quickbooks") as client:
        if not await client.connect(oauth_token, {"realm_id": realm_id}):
            return {"error": "Failed to connect to QuickBooks MCP"}

        tool_map = {
            "invoices": ("quickbooks_list_invoices", {}),
            "customers": ("quickbooks_list_customers", {}),
            "payments": ("quickbooks_get_payment_status", {}),
            "reports": ("quickbooks_generate_report", {"report_type": "ProfitAndLoss"}),
        }

        if data_type not in tool_map:
            return {"error": f"Unknown data type: {data_type}"}

        tool_name, args = tool_map[data_type]
        return await client.call_tool(tool_name, args)


async def fetch_microsoft_data(
    oauth_token: str,
    data_type: str,
) -> Dict[str, Any]:
    """
    Fetch Microsoft 365 data via MCP.

    Args:
        oauth_token: Microsoft OAuth access token
        data_type: Type of data (onedrive, mail, calendar)

    Returns:
        Fetched data or error
    """
    async with MCPClient("microsoft") as client:
        if not await client.connect(oauth_token):
            return {"error": "Failed to connect to Microsoft MCP"}

        tool_map = {
            "onedrive": ("onedrive_list_files", {}),
            "mail": ("outlook_list_messages", {"max_results": 50}),
            "calendar": ("calendar_list_events", {"max_results": 50}),
        }

        if data_type not in tool_map:
            return {"error": f"Unknown data type: {data_type}"}

        tool_name, args = tool_map[data_type]
        return await client.call_tool(tool_name, args)


async def fetch_salesforce_data(
    oauth_token: str,
    data_type: str,
    instance_url: str,
) -> Dict[str, Any]:
    """
    Fetch Salesforce data via MCP.

    Args:
        oauth_token: Salesforce OAuth access token
        data_type: Type of data (contacts, leads, opportunities, accounts)
        instance_url: Salesforce instance URL

    Returns:
        Fetched data or error
    """
    async with MCPClient("salesforce") as client:
        if not await client.connect(oauth_token, {"instance_url": instance_url}):
            return {"error": "Failed to connect to Salesforce MCP"}

        # Salesforce uses SOQL queries
        queries = {
            "contacts": "SELECT Id, Name, Email, Phone FROM Contact LIMIT 100",
            "leads": "SELECT Id, Name, Email, Company, Status FROM Lead LIMIT 100",
            "opportunities": "SELECT Id, Name, Amount, StageName FROM Opportunity LIMIT 100",
            "accounts": "SELECT Id, Name, Industry, AnnualRevenue FROM Account LIMIT 100",
        }

        if data_type not in queries:
            return {"error": f"Unknown data type: {data_type}"}

        return await client.call_tool("salesforce_query", {"query": queries[data_type]})


async def fetch_hubspot_data(
    oauth_token: str,
    data_type: str,
) -> Dict[str, Any]:
    """
    Fetch HubSpot data via MCP.

    Args:
        oauth_token: HubSpot OAuth access token
        data_type: Type of data (contacts, deals, companies)

    Returns:
        Fetched data or error
    """
    async with MCPClient("hubspot") as client:
        if not await client.connect(oauth_token):
            return {"error": "Failed to connect to HubSpot MCP"}

        tool_map = {
            "contacts": ("hubspot_list_contacts", {}),
            "deals": ("hubspot_list_deals", {}),
            "companies": ("hubspot_list_companies", {}),
        }

        if data_type not in tool_map:
            return {"error": f"Unknown data type: {data_type}"}

        tool_name, args = tool_map[data_type]
        return await client.call_tool(tool_name, args)


# Unified fetch interface

FETCH_FUNCTIONS = {
    "google": fetch_google_data,
    "slack": fetch_slack_data,
    "quickbooks": fetch_quickbooks_data,
    "microsoft": fetch_microsoft_data,
    "salesforce": fetch_salesforce_data,
    "hubspot": fetch_hubspot_data,
}


async def fetch_integration_data(
    integration: str,
    data_type: str,
    oauth_token: str,
    **kwargs
) -> Dict[str, Any]:
    """
    Unified interface to fetch data from any integration.

    Args:
        integration: Integration name
        data_type: Type of data to fetch
        oauth_token: OAuth access token
        **kwargs: Additional integration-specific arguments

    Returns:
        Fetched data or error dict
    """
    if integration not in FETCH_FUNCTIONS:
        return {"error": f"Unknown integration: {integration}"}

    fetch_func = FETCH_FUNCTIONS[integration]

    # Handle integrations that need extra params
    if integration == "quickbooks":
        realm_id = kwargs.get("realm_id", "")
        return await fetch_func(oauth_token, data_type, realm_id)
    elif integration == "salesforce":
        instance_url = kwargs.get("instance_url", "")
        return await fetch_func(oauth_token, data_type, instance_url)
    else:
        return await fetch_func(oauth_token, data_type)
