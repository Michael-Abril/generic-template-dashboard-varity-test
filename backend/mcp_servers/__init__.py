"""
MCP Servers Package

Model Context Protocol server configurations and wrappers for integrations.
All MCP servers run in backend only - user-facing applications never see them.
"""

from .config import MCP_SERVER_REGISTRY

__all__ = ["MCP_SERVER_REGISTRY"]
