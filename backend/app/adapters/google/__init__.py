"""Google Workspace integration adapter"""
from .sync import GoogleWorkspaceSync

# Alias for backward compatibility
GoogleSyncAdapter = GoogleWorkspaceSync

__all__ = ['GoogleWorkspaceSync', 'GoogleSyncAdapter']
