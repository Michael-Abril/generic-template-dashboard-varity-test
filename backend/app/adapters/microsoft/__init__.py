"""Microsoft 365 integration adapter"""
from .sync import MicrosoftSync

# Alias for backward compatibility
MicrosoftSyncAdapter = MicrosoftSync

__all__ = ['MicrosoftSync', 'MicrosoftSyncAdapter']
