"""
Marketplace Product Data
Authentic 2025 pricing and features for all 20 marketplace products
"""

from app.models.marketplace import PricingModel

# All product data organized by product
PRODUCTS_DATA = [
    # ========================================================================
    # 1. QUICKBOOKS
    # ========================================================================
    {
        "product": {
            "name": "QuickBooks",
            "slug": "quickbooks",
            "developer": "Intuit",
            "category": "accounting",
            "logo": "quickbooks",
            "brand_color": "#2CA01C",
            "description": "Complete accounting and bookkeeping solution for small businesses with automated invoicing, expense tracking, and financial reporting.",
            "short_description": "Complete accounting solution for small businesses",
            "has_adapter": True,
            "pricing_model": PricingModel.FIXED_TIER,
            "storage_info": "All financial data encrypted with bank-level security. Only you can access your data.",
            "active": True,
            "featured": True
        },
        "pricing_plans": [
            {"tier": "simple-start", "name": "Simple Start", "monthly_price": 25.00, "annual_price": 15.00, "sort_order": 1},
            {"tier": "essentials", "name": "Essentials", "monthly_price": 55.00, "annual_price": 30.00, "sort_order": 2},
            {"tier": "plus", "name": "Plus", "monthly_price": 95.00, "annual_price": 50.00, "is_popular": True, "sort_order": 3},
            {"tier": "advanced", "name": "Advanced", "monthly_price": 235.00, "annual_price": 100.00, "sort_order": 4}
        ],
        "features": {
            "simple-start": ["Basic invoicing", "Expense tracking", "Tax preparation", "Sales tracking", "1 user"],
            "essentials": ["Everything in Simple Start", "Bill management", "Time tracking", "3 users"],
            "plus": ["Everything in Essentials", "Inventory tracking", "Project management", "Custom reports", "5 users"],
            "advanced": ["Everything in Plus", "Advanced reporting", "Batch invoicing", "Workflow automation", "25 users"]
        },
        "limits": {
            "simple-start": {"users": "1"},
            "essentials": {"users": "3"},
            "plus": {"users": "5"},
            "advanced": {"users": "25"}
        },
        "data_sync": ["Invoices", "Expenses", "Revenue", "Tax Records", "Bank Transactions"]
    },

    # ========================================================================
    # 2. SALESFORCE
    # ========================================================================
    {
        "product": {
            "name": "Salesforce",
            "slug": "salesforce",
            "developer": "Salesforce",
            "category": "crm",
            "logo": "salesforce",
            "brand_color": "#00A1E0",
            "description": "Industry-leading customer relationship management platform with sales automation, lead tracking, and comprehensive analytics.",
            "short_description": "Industry-leading CRM platform",
            "has_adapter": True,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Customer data encrypted and isolated per company. Industry insights and best practices included.",
            "active": True,
            "featured": True
        },
        "pricing_plans": [
            {"tier": "essentials", "name": "Essentials", "monthly_price": 25.00, "is_per_user": True, "maximum_users": 10, "sort_order": 1},
            {"tier": "professional", "name": "Professional", "monthly_price": 80.00, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "enterprise", "name": "Enterprise", "monthly_price": 165.00, "is_per_user": True, "sort_order": 3},
            {"tier": "unlimited", "name": "Unlimited", "monthly_price": 330.00, "is_per_user": True, "sort_order": 4}
        ],
        "features": {
            "essentials": ["Basic CRM", "Contact management", "Opportunity tracking", "Up to 10 users"],
            "professional": ["Everything in Essentials", "Forecasting", "Lead scoring", "Unlimited users"],
            "enterprise": ["Everything in Professional", "Advanced automation", "Custom apps", "API access"],
            "unlimited": ["Everything in Enterprise", "24/7 support", "Premier success plan", "Unlimited CRM power"]
        },
        "limits": {
            "essentials": {"users": "10"},
            "professional": {"users": "Unlimited"},
            "enterprise": {"users": "Unlimited"},
            "unlimited": {"users": "Unlimited"}
        },
        "data_sync": ["Leads", "Contacts", "Opportunities", "Accounts", "Activities"]
    },

    # ========================================================================
    # 3. SHOPIFY
    # ========================================================================
    {
        "product": {
            "name": "Shopify",
            "slug": "shopify",
            "developer": "Shopify",
            "category": "e-commerce",
            "logo": "shopify",
            "brand_color": "#7AB55C",
            "description": "Complete e-commerce platform for online stores with inventory management, payment processing, and integrated shipping.",
            "short_description": "Complete e-commerce platform",
            "has_adapter": True,
            "pricing_model": PricingModel.FIXED_TIER,
            "storage_info": "E-commerce transactions secured with advanced encryption for complete privacy.",
            "active": True,
            "featured": True
        },
        "pricing_plans": [
            {"tier": "basic", "name": "Basic", "monthly_price": 39.00, "annual_price": 29.00, "sort_order": 1},
            {"tier": "shopify", "name": "Shopify", "monthly_price": 105.00, "annual_price": 79.00, "is_popular": True, "sort_order": 2},
            {"tier": "advanced", "name": "Advanced", "monthly_price": 399.00, "annual_price": 299.00, "sort_order": 3},
            {"tier": "plus", "name": "Shopify Plus", "monthly_price": 2300.00, "sort_order": 4}
        ],
        "features": {
            "basic": ["Online store", "Unlimited products", "2 staff accounts", "Basic reports"],
            "shopify": ["Everything in Basic", "Professional reports", "5 staff accounts", "Lower fees"],
            "advanced": ["Everything in Shopify", "Advanced reports", "15 staff accounts", "Lowest fees"],
            "plus": ["Everything in Advanced", "Unlimited staff", "Dedicated support", "Enterprise features"]
        },
        "limits": {
            "basic": {"staff": "2"},
            "shopify": {"staff": "5"},
            "advanced": {"staff": "15"},
            "plus": {"staff": "Unlimited"}
        },
        "data_sync": ["Products", "Orders", "Customers", "Inventory", "Sales Data"]
    },

    # ========================================================================
    # 4. SLACK
    # ========================================================================
    {
        "product": {
            "name": "Slack",
            "slug": "slack",
            "developer": "Slack",
            "category": "communication",
            "logo": "slack",
            "brand_color": "#4A154B",
            "description": "Team communication and collaboration platform with channels, direct messaging, file sharing, and extensive integrations.",
            "short_description": "Team communication platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Team communications encrypted end-to-end. Metadata securely stored for audit trails.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "pro", "name": "Pro", "monthly_price": 8.75, "annual_price": 7.25, "is_per_user": True, "minimum_users": 3, "is_popular": True, "sort_order": 2},
            {"tier": "business-plus", "name": "Business+", "monthly_price": 15.00, "is_per_user": True, "sort_order": 3}
        ],
        "features": {
            "free": ["90-day message history", "10 app integrations", "1-to-1 video calls"],
            "pro": ["Unlimited message history", "Unlimited apps", "Group calls", "AI features"],
            "business-plus": ["Everything in Pro", "SSO", "99.99% uptime SLA", "Advanced compliance"]
        },
        "limits": {
            "free": {"message_history": "90 days", "integrations": "10"},
            "pro": {"message_history": "Unlimited", "integrations": "Unlimited"},
            "business-plus": {"message_history": "Unlimited", "integrations": "Unlimited"}
        },
        "data_sync": ["Messages", "Files", "Channels", "Team Activity"]
    },

    # ========================================================================
    # 5. MONDAY.COM
    # ========================================================================
    {
        "product": {
            "name": "Monday.com",
            "slug": "monday",
            "developer": "Monday.com",
            "category": "project-management",
            "logo": "monday",
            "brand_color": "#FF3D57",
            "description": "Work operating system for project and task management with customizable boards, automation, and team collaboration.",
            "short_description": "Work operating system",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_SEAT,
            "storage_info": "Project data with granular access control and enterprise security.",
            "active": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "maximum_users": 2, "sort_order": 1},
            {"tier": "basic", "name": "Basic", "monthly_price": 12.00, "annual_price": 9.00, "is_per_user": True, "minimum_users": 3, "sort_order": 2},
            {"tier": "standard", "name": "Standard", "monthly_price": 14.00, "is_per_user": True, "is_popular": True, "sort_order": 3},
            {"tier": "pro", "name": "Pro", "monthly_price": 24.00, "annual_price": 19.00, "is_per_user": True, "sort_order": 4}
        ],
        "features": {
            "free": ["Basic boards", "2 users max", "Limited features"],
            "basic": ["Unlimited items", "5GB storage", "iOS and Android apps"],
            "standard": ["Everything in Basic", "Timeline view", "250 automations/month"],
            "pro": ["Everything in Standard", "Private boards", "Time tracking", "25,000 automations"]
        },
        "limits": {
            "free": {"users": "2"},
            "basic": {"users": "3+", "storage": "5GB"},
            "standard": {"automations": "250/month"},
            "pro": {"automations": "25,000/month"}
        },
        "data_sync": ["Projects", "Tasks", "Timelines", "Resources", "Updates"]
    },

    # ========================================================================
    # 6. STRIPE
    # ========================================================================
    {
        "product": {
            "name": "Stripe",
            "slug": "stripe",
            "developer": "Stripe",
            "category": "payments",
            "logo": "stripe",
            "brand_color": "#635BFF",
            "description": "Payment processing and financial infrastructure for online businesses with support for subscriptions, invoicing, and global payments.",
            "short_description": "Payment processing infrastructure",
            "has_adapter": False,
            "pricing_model": PricingModel.USAGE_BASED,
            "transaction_fee_percent": 2.90,
            "transaction_fee_fixed": 0.30,
            "storage_info": "Financial data encrypted at rest and in transit with PCI DSS compliance.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "standard", "name": "Standard", "monthly_price": 0.00, "is_free": True, "sort_order": 1}
        ],
        "features": {
            "standard": ["2.9% + $0.30 per transaction", "No monthly fees", "International cards: +1.5%", "ACH: 0.8% capped at $5", "In-person: 2.7% + $0.05"]
        },
        "limits": {},
        "data_sync": ["Transactions", "Subscriptions", "Customers", "Invoices", "Payouts"]
    },

    # ========================================================================
    # 7. HUBSPOT
    # ========================================================================
    {
        "product": {
            "name": "HubSpot",
            "slug": "hubspot",
            "developer": "HubSpot",
            "category": "marketing",
            "logo": "hubspot",
            "brand_color": "#FF7A59",
            "description": "Marketing automation and customer engagement platform with email campaigns, lead nurturing, and comprehensive analytics.",
            "short_description": "Marketing automation platform",
            "has_adapter": False,
            "pricing_model": PricingModel.HYBRID,
            "storage_info": "Marketing data with industry benchmarks and best practices included.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free Tools", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "starter", "name": "Starter", "monthly_price": 15.00, "is_per_user": True, "sort_order": 2},
            {"tier": "professional", "name": "Professional", "monthly_price": 890.00, "setup_fee": 3000.00, "is_popular": True, "sort_order": 3},
            {"tier": "enterprise", "name": "Enterprise", "monthly_price": 3600.00, "setup_fee": 7000.00, "sort_order": 4}
        ],
        "features": {
            "free": ["Basic CRM", "Email marketing", "Forms", "2,000 emails/month"],
            "starter": ["1,000 marketing contacts", "Email campaigns", "Landing pages"],
            "professional": ["3 seats + 2,000 contacts", "Automation", "A/B testing", "Custom reports"],
            "enterprise": ["5 seats + 10,000 contacts", "Advanced analytics", "Custom objects", "Dedicated support"]
        },
        "limits": {
            "free": {"contacts": "100", "emails": "2,000/month"},
            "starter": {"contacts": "1,000"},
            "professional": {"seats": "3", "contacts": "2,000"},
            "enterprise": {"seats": "5", "contacts": "10,000"}
        },
        "data_sync": ["Contacts", "Campaigns", "Email Performance", "Lead Scores"]
    },

    # ========================================================================
    # 8. ZENDESK
    # ========================================================================
    {
        "product": {
            "name": "Zendesk",
            "slug": "zendesk",
            "developer": "Zendesk",
            "category": "customer-support",
            "logo": "zendesk",
            "brand_color": "#03363D",
            "description": "Customer service and support ticketing system with live chat, knowledge base, and comprehensive reporting.",
            "short_description": "Customer support platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Support tickets encrypted with customer-specific access controls.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "suite-team", "name": "Suite Team", "monthly_price": 69.00, "annual_price": 55.00, "is_per_user": True, "sort_order": 1},
            {"tier": "suite-growth", "name": "Suite Growth", "monthly_price": 115.00, "annual_price": 89.00, "is_per_user": True, "sort_order": 2},
            {"tier": "suite-professional", "name": "Suite Professional", "monthly_price": 149.00, "annual_price": 115.00, "is_per_user": True, "is_popular": True, "sort_order": 3}
        ],
        "features": {
            "suite-team": ["Ticketing", "Messaging", "Help center", "Basic analytics"],
            "suite-growth": ["Everything in Team", "Advanced analytics", "SLA management", "Multilingual support"],
            "suite-professional": ["Everything in Growth", "Custom reports", "Light agents", "CSAT surveys"]
        },
        "limits": {},
        "data_sync": ["Tickets", "Customer Conversations", "Support Metrics", "KB Articles"]
    },

    # ========================================================================
    # 9. GOOGLE WORKSPACE
    # ========================================================================
    {
        "product": {
            "name": "Google Workspace",
            "slug": "google-workspace",
            "developer": "Google",
            "category": "productivity",
            "logo": "google-workspace",
            "brand_color": "#4285F4",
            "description": "Complete suite of cloud productivity tools including Gmail, Calendar, Drive, Docs, and Sheets for seamless collaboration.",
            "short_description": "Cloud productivity suite",
            "has_adapter": True,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Workspace data encrypted with enterprise-grade security. Calendar and email synced for AI-powered insights.",
            "active": True,
            "featured": True
        },
        "pricing_plans": [
            {"tier": "business-starter", "name": "Business Starter", "monthly_price": 8.40, "annual_price": 7.00, "is_per_user": True, "sort_order": 1},
            {"tier": "business-standard", "name": "Business Standard", "monthly_price": 16.80, "annual_price": 14.00, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "business-plus", "name": "Business Plus", "monthly_price": 26.40, "annual_price": 22.00, "is_per_user": True, "maximum_users": 300, "sort_order": 3}
        ],
        "features": {
            "business-starter": ["Gmail", "Calendar", "Meet", "Drive", "30GB storage/user"],
            "business-standard": ["Everything in Starter", "2TB storage/user", "Recording", "Attendance tracking"],
            "business-plus": ["Everything in Standard", "5TB storage/user", "Advanced security", "eDiscovery"]
        },
        "limits": {
            "business-starter": {"storage": "30GB"},
            "business-standard": {"storage": "2TB"},
            "business-plus": {"storage": "5TB", "users": "300"}
        },
        "data_sync": ["Emails", "Contacts", "Calendar Events", "Files", "Documents", "Spreadsheets"]
    },

    # ========================================================================
    # 10. MICROSOFT 365
    # ========================================================================
    {
        "product": {
            "name": "Microsoft 365",
            "slug": "microsoft-365",
            "developer": "Microsoft",
            "category": "productivity",
            "logo": "microsoft-365",
            "brand_color": "#FFB900",
            "description": "Enterprise productivity suite with Outlook, Excel, Word, OneDrive, and Teams for complete business operations.",
            "short_description": "Enterprise productivity suite",
            "has_adapter": True,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Microsoft 365 data with end-to-end encryption. Files and emails securely stored.",
            "active": True,
            "featured": True
        },
        "pricing_plans": [
            {"tier": "business-basic", "name": "Business Basic", "monthly_price": 6.00, "is_per_user": True, "sort_order": 1},
            {"tier": "business-standard", "name": "Business Standard", "monthly_price": 12.50, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "business-premium", "name": "Business Premium", "monthly_price": 22.00, "is_per_user": True, "sort_order": 3}
        ],
        "features": {
            "business-basic": ["Web/mobile Office apps", "1TB OneDrive", "Teams", "Email hosting"],
            "business-standard": ["Everything in Basic", "Desktop Office apps", "Premium apps"],
            "business-premium": ["Everything in Standard", "Advanced security", "Device management", "Threat protection"]
        },
        "limits": {
            "business-basic": {"storage": "1TB", "users": "300"},
            "business-standard": {"storage": "1TB", "users": "300"},
            "business-premium": {"storage": "1TB", "users": "300"}
        },
        "data_sync": ["Emails", "Calendar Events", "Excel Files", "Word Documents", "OneDrive Files", "Teams Messages"]
    },

    # ========================================================================
    # 11. XERO
    # ========================================================================
    {
        "product": {
            "name": "Xero",
            "slug": "xero",
            "developer": "Xero",
            "category": "accounting",
            "logo": "xero",
            "brand_color": "#13B5EA",
            "description": "Cloud-based accounting software for small businesses with automated bank feeds, invoicing, expense claims, and financial reporting.",
            "short_description": "Cloud accounting software",
            "has_adapter": False,
            "pricing_model": PricingModel.FIXED_TIER,
            "storage_info": "Financial data secured with bank-level encryption.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "early", "name": "Early", "monthly_price": 13.00, "sort_order": 1},
            {"tier": "growing", "name": "Growing", "monthly_price": 47.00, "is_popular": True, "sort_order": 2},
            {"tier": "established", "name": "Established", "monthly_price": 80.00, "sort_order": 3}
        ],
        "features": {
            "early": ["20 invoices/month", "5 bills/month", "Bank reconciliation", "Basic reports"],
            "growing": ["Unlimited invoices", "Unlimited bills", "Advanced features", "Full reporting"],
            "established": ["Everything in Growing", "Multi-currency", "Projects", "Expenses tracking"]
        },
        "limits": {
            "early": {"invoices": "20/month", "bills": "5/month"},
            "growing": {"invoices": "Unlimited", "bills": "Unlimited"},
            "established": {"invoices": "Unlimited", "bills": "Unlimited"}
        },
        "data_sync": ["Bank Transactions", "Invoices", "Expenses", "Financial Reports", "Tax Data"]
    },

    # ========================================================================
    # 12. FRESHBOOKS
    # ========================================================================
    {
        "product": {
            "name": "FreshBooks",
            "slug": "freshbooks",
            "developer": "FreshBooks",
            "category": "accounting",
            "logo": "freshbooks",
            "brand_color": "#0075DD",
            "description": "Accounting software designed for service-based businesses with time tracking, project management, and automated expense capture.",
            "short_description": "Service business accounting",
            "has_adapter": False,
            "pricing_model": PricingModel.FIXED_TIER,
            "storage_info": "Business financial data encrypted with secure cloud storage.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "lite", "name": "Lite", "monthly_price": 19.00, "annual_price": 17.10, "sort_order": 1},
            {"tier": "plus", "name": "Plus", "monthly_price": 33.00, "annual_price": 29.70, "is_popular": True, "sort_order": 2},
            {"tier": "premium", "name": "Premium", "monthly_price": 65.00, "annual_price": 55.00, "sort_order": 3}
        ],
        "features": {
            "lite": ["5 billable clients", "Unlimited invoices", "Expense tracking", "Receipt capture"],
            "plus": ["50 billable clients", "Proposals", "Project profitability", "Team collaboration"],
            "premium": ["Unlimited clients", "Team management", "Advanced reports", "Dedicated support"]
        },
        "limits": {
            "lite": {"clients": "5"},
            "plus": {"clients": "50"},
            "premium": {"clients": "Unlimited"}
        },
        "data_sync": ["Invoices", "Time Entries", "Expenses", "Projects", "Client Data"]
    },

    # ========================================================================
    # 13. ASANA
    # ========================================================================
    {
        "product": {
            "name": "Asana",
            "slug": "asana",
            "developer": "Asana",
            "category": "project-management",
            "logo": "asana",
            "brand_color": "#F06A6A",
            "description": "Work management platform for teams to organize, track, and manage projects with timelines, task dependencies, and portfolios.",
            "short_description": "Work management platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Project data with granular permissions and enterprise-grade security.",
            "active": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "personal", "name": "Personal", "monthly_price": 0.00, "is_free": True, "maximum_users": 10, "sort_order": 1},
            {"tier": "starter", "name": "Starter", "monthly_price": 13.49, "annual_price": 10.99, "is_per_user": True, "sort_order": 2},
            {"tier": "advanced", "name": "Advanced", "monthly_price": 30.49, "annual_price": 24.99, "is_per_user": True, "is_popular": True, "sort_order": 3}
        ],
        "features": {
            "personal": ["Unlimited tasks", "Up to 10 teammates", "Basic views", "100MB file uploads"],
            "starter": ["Timeline views", "Workflow builder", "250 automations", "Unlimited users"],
            "advanced": ["Portfolios", "Goals", "Advanced reporting", "25,000 automations"]
        },
        "limits": {
            "personal": {"users": "10"},
            "starter": {"automations": "250"},
            "advanced": {"automations": "25,000"}
        },
        "data_sync": ["Projects", "Tasks", "Milestones", "Team Members", "Workload Data"]
    },

    # ========================================================================
    # 14. TRELLO
    # ========================================================================
    {
        "product": {
            "name": "Trello",
            "slug": "trello",
            "developer": "Atlassian",
            "category": "project-management",
            "logo": "trello",
            "brand_color": "#0052CC",
            "description": "Visual collaboration tool with boards, lists, and cards for organizing projects and workflows with team members.",
            "short_description": "Visual collaboration tool",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Project boards encrypted with member-specific access controls.",
            "active": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "standard", "name": "Standard", "monthly_price": 6.00, "annual_price": 5.00, "is_per_user": True, "sort_order": 2},
            {"tier": "premium", "name": "Premium", "monthly_price": 12.50, "annual_price": 10.00, "is_per_user": True, "is_popular": True, "sort_order": 3},
            {"tier": "enterprise", "name": "Enterprise", "monthly_price": 17.50, "is_per_user": True, "minimum_users": 50, "sort_order": 4}
        ],
        "features": {
            "free": ["Unlimited cards", "10 boards/workspace", "250 automations/month", "10MB file limit"],
            "standard": ["Unlimited boards", "Advanced checklists", "1,000 automations"],
            "premium": ["Unlimited automations", "Calendar/Timeline/Dashboard views", "Priority support"],
            "enterprise": ["Everything in Premium", "Org-wide permissions", "24/7 support"]
        },
        "limits": {
            "free": {"boards": "10/workspace", "file_size": "10MB"},
            "standard": {"automations": "1,000/month"},
            "premium": {"automations": "Unlimited"},
            "enterprise": {"users": "50 minimum"}
        },
        "data_sync": ["Boards", "Cards", "Lists", "Team Activity", "Due Dates"]
    },

    # ========================================================================
    # 15. MAILCHIMP
    # ========================================================================
    {
        "product": {
            "name": "Mailchimp",
            "slug": "mailchimp",
            "developer": "Intuit",
            "category": "marketing",
            "logo": "mailchimp",
            "brand_color": "#FFE01B",
            "description": "All-in-one marketing platform for email campaigns, audience management, and marketing analytics with automation workflows.",
            "short_description": "Email marketing platform",
            "has_adapter": False,
            "pricing_model": PricingModel.CONTACT_BASED,
            "storage_info": "Marketing data with subscriber privacy protection and GDPR compliance.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "essentials", "name": "Essentials", "monthly_price": 13.00, "sort_order": 2},
            {"tier": "standard", "name": "Standard", "monthly_price": 20.00, "is_popular": True, "sort_order": 3},
            {"tier": "premium", "name": "Premium", "monthly_price": 350.00, "sort_order": 4}
        ],
        "features": {
            "free": ["500 contacts", "1,000 emails/month", "Basic templates", "1 audience"],
            "essentials": ["Up to 50,000 contacts", "10x contact emails/month", "24/7 support", "A/B testing"],
            "standard": ["Up to 100,000 contacts", "12x contact emails/month", "Automation", "Dynamic content"],
            "premium": ["Unlimited contacts", "15x contact emails/month", "Advanced segmentation", "Priority support"]
        },
        "limits": {
            "free": {"contacts": "500", "emails": "1,000/month"},
            "essentials": {"contacts": "50,000", "emails": "10x contacts/month"},
            "standard": {"contacts": "100,000", "emails": "12x contacts/month"},
            "premium": {"contacts": "Unlimited", "emails": "15x contacts/month"}
        },
        "data_sync": ["Campaigns", "Contacts", "Email Performance", "Automation Workflows", "Audience Segments"]
    },

    # ========================================================================
    # 16. INTERCOM
    # ========================================================================
    {
        "product": {
            "name": "Intercom",
            "slug": "intercom",
            "developer": "Intercom",
            "category": "customer-support",
            "logo": "intercom",
            "brand_color": "#6AFDEF",
            "description": "Customer messaging platform with live chat, help desk, and conversational marketing to connect with customers.",
            "short_description": "Customer messaging platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_SEAT,
            "storage_info": "Customer conversations encrypted with GDPR-compliant data handling.",
            "active": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "essential", "name": "Essential", "monthly_price": 39.00, "annual_price": 29.00, "is_per_user": True, "sort_order": 1},
            {"tier": "advanced", "name": "Advanced", "monthly_price": 99.00, "annual_price": 85.00, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "expert", "name": "Expert", "monthly_price": 139.00, "annual_price": 132.00, "is_per_user": True, "sort_order": 3}
        ],
        "features": {
            "essential": ["Shared inbox", "Help center", "Messaging", "Basic features"],
            "advanced": ["Everything in Essential", "Automation", "Reporting", "20 lite seats"],
            "expert": ["Everything in Advanced", "Advanced security", "50 lite seats", "Multi-brand support"]
        },
        "limits": {
            "advanced": {"lite_seats": "20"},
            "expert": {"lite_seats": "50"}
        },
        "data_sync": ["Conversations", "Customer Profiles", "Tickets", "Messages", "Team Performance"]
    },

    # ========================================================================
    # 17. TWILIO
    # ========================================================================
    {
        "product": {
            "name": "Twilio",
            "slug": "twilio",
            "developer": "Twilio",
            "category": "communication",
            "logo": "twilio",
            "brand_color": "#F22F46",
            "description": "Cloud communications platform for SMS, voice, video, and authentication with programmable APIs for custom integrations.",
            "short_description": "Cloud communications API",
            "has_adapter": False,
            "pricing_model": PricingModel.USAGE_BASED,
            "per_unit_cost": 0.0075,
            "storage_info": "Communication logs encrypted with industry-standard security protocols.",
            "active": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "pay-as-you-go", "name": "Pay As You Go", "monthly_price": 0.00, "is_free": True, "sort_order": 1}
        ],
        "features": {
            "pay-as-you-go": ["SMS: $0.0075/message (US)", "Voice: $0.0085/min inbound, $0.014/min outbound", "Video: $0.004/min", "Phone numbers: ~$1/month"]
        },
        "limits": {},
        "data_sync": ["Messages", "Call Logs", "Verification Records", "Usage Analytics"]
    },

    # ========================================================================
    # 18. DOCUSIGN
    # ========================================================================
    {
        "product": {
            "name": "DocuSign",
            "slug": "docusign",
            "developer": "DocuSign",
            "category": "documents",
            "logo": "docusign",
            "brand_color": "#FFD400",
            "description": "Electronic signature and digital transaction management platform for legally binding document signing and workflow automation.",
            "short_description": "E-signature platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Legal documents with enterprise encryption and compliance certifications.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "personal", "name": "Personal", "monthly_price": 15.00, "annual_price": 10.00, "sort_order": 1},
            {"tier": "standard", "name": "Standard", "monthly_price": 45.00, "annual_price": 25.00, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "business-pro", "name": "Business Pro", "monthly_price": 65.00, "annual_price": 40.00, "is_per_user": True, "sort_order": 3}
        ],
        "features": {
            "personal": ["5 documents/month", "Basic fields", "Mobile signing", "1 user"],
            "standard": ["100 envelopes/year", "Templates", "Bulk send", "Multiple users"],
            "business-pro": ["Unlimited envelopes", "SMS auth", "Payments", "PowerForms"]
        },
        "limits": {
            "personal": {"documents": "5/month", "users": "1"},
            "standard": {"envelopes": "100/year"},
            "business-pro": {"envelopes": "Unlimited"}
        },
        "data_sync": ["Documents", "Signatures", "Workflows", "Audit Trails", "Templates"]
    },

    # ========================================================================
    # 19. ZOOM
    # ========================================================================
    {
        "product": {
            "name": "Zoom",
            "slug": "zoom",
            "developer": "Zoom",
            "category": "communication",
            "logo": "zoom",
            "brand_color": "#0B5CFF",
            "description": "Video conferencing and online meeting platform with webinars, screen sharing, and recording capabilities for remote collaboration.",
            "short_description": "Video conferencing platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Meeting data with end-to-end encryption and secure cloud recording.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "basic", "name": "Basic", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "pro", "name": "Pro", "monthly_price": 14.99, "annual_price": 13.33, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "business", "name": "Business", "monthly_price": 21.99, "annual_price": 18.33, "is_per_user": True, "minimum_users": 10, "sort_order": 3}
        ],
        "features": {
            "basic": ["40-minute meetings", "100 participants", "Virtual backgrounds", "Breakout rooms"],
            "pro": ["30-hour meetings", "100 participants", "5GB cloud storage", "AI Companion"],
            "business": ["300 participants", "Unlimited whiteboards", "Scheduler", "10+ licenses required"]
        },
        "limits": {
            "basic": {"duration": "40 minutes", "participants": "100"},
            "pro": {"duration": "30 hours", "participants": "100", "storage": "5GB"},
            "business": {"participants": "300", "users": "10 minimum"}
        },
        "data_sync": ["Meeting Records", "Participants", "Recordings", "Chat Logs", "Analytics"]
    },

    # ========================================================================
    # 20. DROPBOX
    # ========================================================================
    {
        "product": {
            "name": "Dropbox",
            "slug": "dropbox",
            "developer": "Dropbox",
            "category": "storage",
            "logo": "dropbox",
            "brand_color": "#0061FF",
            "description": "Cloud file storage and collaboration platform with file sharing, team folders, and advanced security features for business.",
            "short_description": "Cloud storage platform",
            "has_adapter": False,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Files encrypted at rest and in transit with zero-knowledge architecture.",
            "active": True
        },
        "pricing_plans": [
            {"tier": "plus", "name": "Plus", "monthly_price": 11.99, "annual_price": 9.99, "sort_order": 1},
            {"tier": "professional", "name": "Professional", "monthly_price": 19.99, "sort_order": 2},
            {"tier": "standard", "name": "Standard", "monthly_price": 18.00, "annual_price": 15.00, "is_per_user": True, "minimum_users": 3, "is_popular": True, "sort_order": 3},
            {"tier": "advanced", "name": "Advanced", "monthly_price": 30.00, "annual_price": 24.00, "is_per_user": True, "minimum_users": 3, "sort_order": 4}
        ],
        "features": {
            "plus": ["2TB storage", "1 user", "File recovery", "Priority email support"],
            "professional": ["3TB storage", "1 user", "Full-text search", "Advanced sharing"],
            "standard": ["5TB storage/team", "3+ users", "Team collaboration", "Admin console"],
            "advanced": ["Unlimited storage", "3+ users", "Advanced controls", "Enterprise security"]
        },
        "limits": {
            "plus": {"storage": "2TB", "users": "1"},
            "professional": {"storage": "3TB", "users": "1"},
            "standard": {"storage": "5TB", "users": "3 minimum"},
            "advanced": {"storage": "Unlimited", "users": "3 minimum"}
        },
        "data_sync": ["Files", "Folders", "Shared Links", "Team Activity", "Version History"]
    },

    # ========================================================================
    # 21. SQUARE (NEW - SMB Essential)
    # ========================================================================
    {
        "product": {
            "name": "Square",
            "slug": "square",
            "developer": "Block",
            "category": "pos",
            "logo": "square",
            "brand_color": "#006AFF",
            "description": "Complete point of sale and payment processing platform for retail and restaurant businesses with inventory management and analytics.",
            "short_description": "POS and payment processing",
            "has_adapter": True,
            "pricing_model": PricingModel.USAGE_BASED,
            "transaction_fee_percent": 2.60,
            "transaction_fee_fixed": 0.10,
            "storage_info": "Transaction data encrypted with PCI DSS compliance.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "plus", "name": "Plus", "monthly_price": 29.00, "is_popular": True, "sort_order": 2},
            {"tier": "premium", "name": "Premium", "monthly_price": 79.00, "sort_order": 3}
        ],
        "features": {
            "free": ["2.6% + $0.10 per transaction", "Free POS app", "Next-day deposits", "Basic reporting"],
            "plus": ["Everything in Free", "Advanced reporting", "Inventory management", "Multiple locations"],
            "premium": ["Everything in Plus", "Priority support", "Advanced team management", "Custom permissions"]
        },
        "limits": {
            "free": {"locations": "1"},
            "plus": {"locations": "Multiple"},
            "premium": {"locations": "Unlimited"}
        },
        "data_sync": ["Transactions", "Inventory", "Customers", "Sales Reports", "Employee Data"]
    },

    # ========================================================================
    # 22. PAYPAL (NEW - SMB Essential)
    # ========================================================================
    {
        "product": {
            "name": "PayPal",
            "slug": "paypal",
            "developer": "PayPal",
            "category": "payments",
            "logo": "paypal",
            "brand_color": "#003087",
            "description": "Global online payment platform supporting credit cards, bank transfers, and digital wallets for businesses of all sizes.",
            "short_description": "Global payment platform",
            "has_adapter": True,
            "pricing_model": PricingModel.USAGE_BASED,
            "transaction_fee_percent": 2.99,
            "transaction_fee_fixed": 0.49,
            "storage_info": "Payment data secured with bank-level encryption.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "standard", "name": "Standard", "monthly_price": 0.00, "is_free": True, "sort_order": 1}
        ],
        "features": {
            "standard": ["2.99% + $0.49 per transaction", "PayPal Checkout", "Venmo integration", "Invoicing", "QR code payments"]
        },
        "limits": {},
        "data_sync": ["Transactions", "Invoices", "Customers", "Balance", "Disputes"]
    },

    # ========================================================================
    # 23. GUSTO (NEW - SMB Essential)
    # ========================================================================
    {
        "product": {
            "name": "Gusto",
            "slug": "gusto",
            "developer": "Gusto",
            "category": "payroll-hr",
            "logo": "gusto",
            "brand_color": "#F45D48",
            "description": "All-in-one payroll, benefits, and HR platform designed specifically for small businesses with automated tax filing and compliance.",
            "short_description": "Payroll and HR platform",
            "has_adapter": True,
            "pricing_model": PricingModel.HYBRID,
            "storage_info": "Employee data encrypted with SOC 2 compliance.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "simple", "name": "Simple", "monthly_price": 40.00, "sort_order": 1},
            {"tier": "plus", "name": "Plus", "monthly_price": 80.00, "is_popular": True, "sort_order": 2},
            {"tier": "premium", "name": "Premium", "monthly_price": 180.00, "sort_order": 3}
        ],
        "features": {
            "simple": ["$40/mo + $6/person", "Full-service payroll", "Employee self-service", "Health benefits"],
            "plus": ["$80/mo + $12/person", "Everything in Simple", "Next-day direct deposit", "Time tracking"],
            "premium": ["$180/mo + $22/person", "Everything in Plus", "HR resource center", "Compliance alerts", "Dedicated support"]
        },
        "limits": {
            "simple": {"per_person": "$6/month"},
            "plus": {"per_person": "$12/month"},
            "premium": {"per_person": "$22/month"}
        },
        "data_sync": ["Employees", "Payroll Runs", "Tax Documents", "Benefits", "Time Off"]
    },

    # ========================================================================
    # 24. CALENDLY (NEW - SMB Essential)
    # ========================================================================
    {
        "product": {
            "name": "Calendly",
            "slug": "calendly",
            "developer": "Calendly",
            "category": "scheduling",
            "logo": "calendly",
            "brand_color": "#006BFF",
            "description": "Professional scheduling platform for booking appointments, meetings, and consultations with calendar integration and automated reminders.",
            "short_description": "Appointment scheduling",
            "has_adapter": True,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Scheduling data synced securely with your calendar.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "standard", "name": "Standard", "monthly_price": 12.00, "is_per_user": True, "sort_order": 2},
            {"tier": "teams", "name": "Teams", "monthly_price": 20.00, "is_per_user": True, "is_popular": True, "sort_order": 3},
            {"tier": "enterprise", "name": "Enterprise", "monthly_price": 0.00, "is_per_user": True, "sort_order": 4}
        ],
        "features": {
            "free": ["1 event type", "Calendar connections", "Unlimited meetings", "Basic customization"],
            "standard": ["Unlimited event types", "Email reminders", "Cancellation policy", "Website embedding"],
            "teams": ["Everything in Standard", "Team scheduling pages", "Round robin events", "Analytics"],
            "enterprise": ["Everything in Teams", "SSO", "Advanced security", "Dedicated support"]
        },
        "limits": {
            "free": {"event_types": "1"},
            "standard": {"event_types": "Unlimited"},
            "teams": {"event_types": "Unlimited"},
            "enterprise": {"event_types": "Unlimited"}
        },
        "data_sync": ["Events", "Invitees", "Event Types", "Availability", "Analytics"]
    },

    # ========================================================================
    # 25. CANVA (NEW - SMB Essential)
    # ========================================================================
    {
        "product": {
            "name": "Canva",
            "slug": "canva",
            "developer": "Canva",
            "category": "design",
            "logo": "canva",
            "brand_color": "#00C4CC",
            "description": "Online graphic design platform with templates for social media, presentations, marketing materials, and brand assets.",
            "short_description": "Graphic design platform",
            "has_adapter": True,
            "pricing_model": PricingModel.PER_USER,
            "storage_info": "Design assets securely stored with team access controls.",
            "active": True,
            "featured": True,
            "coming_soon": True
        },
        "pricing_plans": [
            {"tier": "free", "name": "Free", "monthly_price": 0.00, "is_free": True, "sort_order": 1},
            {"tier": "pro", "name": "Canva Pro", "monthly_price": 14.99, "is_per_user": True, "is_popular": True, "sort_order": 2},
            {"tier": "teams", "name": "Canva Teams", "monthly_price": 12.99, "is_per_user": True, "minimum_users": 3, "sort_order": 3}
        ],
        "features": {
            "free": ["250,000+ templates", "100+ design types", "5GB cloud storage", "Basic photo editing"],
            "pro": ["Everything in Free", "100GB storage", "Brand kit", "Background remover", "Magic resize"],
            "teams": ["Everything in Pro", "Unlimited storage", "Team collaboration", "Brand controls", "Real-time collaboration"]
        },
        "limits": {
            "free": {"storage": "5GB"},
            "pro": {"storage": "100GB"},
            "teams": {"storage": "Unlimited", "users": "3 minimum"}
        },
        "data_sync": ["Designs", "Folders", "Brand Assets", "Templates", "Team Activity"]
    }
]
