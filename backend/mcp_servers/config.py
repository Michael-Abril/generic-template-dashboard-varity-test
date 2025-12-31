"""
MCP Server Configuration Registry

Based on mcp-servers-research.md findings (December 31, 2025).
Each server is vetted for production use.

Servers used:
- Google: Taylor Wilsdon (@anthropic/google-workspace-mcp)
- Slack: Korotovsky (slack-mcp-server)
- QuickBooks: Intuit Official (@anthropic/quickbooks-online-mcp-server)
- Microsoft: Softeria (ms-365-mcp-server)
- Salesforce: Community (mcp-salesforce)
- HubSpot: Official Beta (@hubspot/mcp-server)
"""

MCP_SERVER_REGISTRY = {
    "google": {
        "name": "Taylor Wilsdon Google Workspace MCP",
        "package": "@anthropic/google-workspace-mcp",
        "command": "npx",
        "args": ["-y", "@anthropic/google-workspace-mcp"],
        "transport": "stdio",
        "github": "github.com/taylorwilsdon/google_workspace_mcp",
        "tools": [
            "google_drive_list_files",
            "google_drive_read_file",
            "google_contacts_list",
            "google_gmail_list_messages",
            "google_gmail_send",
            "google_calendar_list_events",
            "google_calendar_create_event",
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
        "name": "Intuit Official QuickBooks MCP",
        "package": "@anthropic/quickbooks-online-mcp-server",
        "command": "npx",
        "args": ["-y", "@anthropic/quickbooks-online-mcp-server"],
        "transport": "stdio",
        "github": "github.com/intuit/quickbooks-online-mcp-server",
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
        "package": "ms-365-mcp-server",
        "command": "npx",
        "args": ["-y", "ms-365-mcp-server"],
        "transport": "stdio",
        "github": "github.com/Softeria/ms-365-mcp-server",
        "tools": [
            "onedrive_list_files",
            "onedrive_read_file",
            "outlook_list_messages",
            "outlook_send_email",
            "calendar_list_events",
            "calendar_create_event",
        ],
        "scopes": [
            "https://graph.microsoft.com/Files.Read",
            "https://graph.microsoft.com/Mail.Read",
            "https://graph.microsoft.com/Calendars.Read",
        ],
    },
    "salesforce": {
        "name": "Community Salesforce MCP",
        "package": "mcp-salesforce",
        "command": "npx",
        "args": ["-y", "mcp-salesforce"],
        "transport": "stdio",
        "github": "github.com/smn2gnt/MCP-Salesforce",
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
