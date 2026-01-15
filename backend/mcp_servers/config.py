"""
MCP Server Configuration Registry

Based on mcp-servers-research.md findings (December 31, 2025).
Each server is vetted for production use.

Servers used:
- Google: PegasusHeavy (@pegasusheavy/google-mcp) - VERIFIED ON NPM
- Slack: Korotovsky (slack-mcp-server)
- QuickBooks: DIRECT API FALLBACK (MCP package not found)
- Microsoft: Softeria (@softeria/ms-365-mcp-server) - VERIFIED ON NPM
- Salesforce: DIRECT API FALLBACK (MCP package unpublished)
- HubSpot: Official Beta (@hubspot/mcp-server)
"""

MCP_SERVER_REGISTRY = {
    "google": {
        "name": "PegasusHeavy Google MCP",
        "package": "@pegasusheavy/google-mcp",
        "command": "npx",
        "args": ["-y", "@pegasusheavy/google-mcp"],
        "transport": "stdio",
        "github": "github.com/PegasusHeavy/google-mcp",
        "tools": [
            "gmail_list",
            "gmail_read",
            "gmail_send",
            "drive_list",
            "drive_read",
            "calendar_list",
            "contacts_list",
        ],
        "scopes": [
            "https://www.googleapis.com/auth/drive.readonly",
            "https://www.googleapis.com/auth/gmail.readonly",
            "https://www.googleapis.com/auth/calendar.readonly",
            "https://www.googleapis.com/auth/contacts.readonly",
        ],
    },
    "slack": {
        "name": "Korotovsky Slack MCP",
        "package": "slack-mcp-server",
        "command": "npx",
        "args": ["-y", "slack-mcp-server"],
        "transport": "stdio",
        "github": "github.com/korotovsky/slack-mcp-server",
        "tools": [
            "slack_list_channels",
            "slack_get_channel_history",
            "slack_post_message",
            "slack_list_users",
            "slack_list_files",
        ],
        "scopes": [
            "channels:read",
            "channels:history",
            "users:read",
            "files:read",
        ],
    },
    "quickbooks": {
        "name": "QuickBooks DIRECT API",
        "package": None,  # No working MCP package - use direct API
        "command": None,
        "args": None,
        "transport": "direct_api",
        "github": None,
        "tools": [
            "quickbooks_list_invoices",
            "quickbooks_create_invoice",
            "quickbooks_list_customers",
            "quickbooks_get_payment_status",
            "quickbooks_generate_report",
        ],
        "scopes": ["com.intuit.quickbooks.accounting"],
    },
    "microsoft": {
        "name": "Softeria Microsoft 365 MCP",
        "package": "@softeria/ms-365-mcp-server",
        "command": "npx",
        "args": ["-y", "@softeria/ms-365-mcp-server"],
        "transport": "stdio",
        "github": "github.com/Softeria/ms-365-mcp-server",
        "tools": [
            "list_onedrive_files",
            "read_onedrive_file",
            "list_outlook_emails",
            "send_outlook_email",
            "list_calendar_events",
            "create_calendar_event",
        ],
        "scopes": [
            "https://graph.microsoft.com/Files.Read",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Calendars.Read",
        ],
    },
    "salesforce": {
        "name": "Salesforce DIRECT API",
        "package": None,  # MCP package unpublished - use direct API
        "command": None,
        "args": None,
        "transport": "direct_api",
        "github": None,
        "tools": [
            "salesforce_query",
            "salesforce_create_record",
            "salesforce_update_record",
            "salesforce_delete_record",
        ],
        "scopes": ["api", "refresh_token"],
    },
    "hubspot": {
        "name": "HubSpot Official Beta MCP",
        "package": "@hubspot/mcp-server",
        "command": "npx",
        "args": ["-y", "@hubspot/mcp-server"],
        "transport": "stdio",
        "docs": "developers.hubspot.com/mcp",
        "tools": [
            "hubspot_list_contacts",
            "hubspot_create_contact",
            "hubspot_list_deals",
            "hubspot_create_deal",
            "hubspot_list_companies",
        ],
        "scopes": [
            "crm.objects.contacts.read",
            "crm.objects.deals.read",
            "crm.objects.companies.read",
        ],
    },
}
