#!/usr/bin/env python3
"""
Seed marketplace products into PostgreSQL database
"""
from app.core.database import SessionLocal
from app.models import MarketplaceProduct
import json

def seed_products():
    """Seed 20 real marketplace products"""
    db = SessionLocal()
    try:
        # Check if products already exist
        existing = db.query(MarketplaceProduct).count()
        if existing > 0:
            print(f'Already have {existing} products in database')
            return

        # Full product list
        products_data = [
            {
                'name': 'QuickBooks',
                'slug': 'quickbooks',
                'description': 'Complete accounting software for managing finances, invoicing, and expense tracking',
                'category': 'finance',
                'logo_url': '/logos/quickbooks.svg',
                'features': json.dumps(['Invoicing', 'Expense Tracking', 'Financial Reports', 'Tax Preparation']),
                'pricing_tiers': json.dumps([
                    {'name': 'Simple Start', 'price': 30, 'features': ['Basic invoicing', '1 user']},
                    {'name': 'Essentials', 'price': 60, 'features': ['Bill management', '3 users']},
                    {'name': 'Plus', 'price': 90, 'features': ['Inventory tracking', '5 users']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'quickbooks', 'api_version': 'v3'})
            },
            {
                'name': 'Stripe',
                'slug': 'stripe',
                'description': 'Payment processing platform for online businesses',
                'category': 'payments',
                'logo_url': '/logos/stripe.svg',
                'features': json.dumps(['Payment Processing', 'Subscriptions', 'Invoicing', 'Fraud Prevention']),
                'pricing_tiers': json.dumps([
                    {'name': 'Pay as you go', 'price': 0, 'features': ['2.9% + 30¢ per transaction']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'stripe', 'api_version': 'v1'})
            },
            {
                'name': 'Salesforce',
                'slug': 'salesforce',
                'description': 'CRM platform for sales, service, marketing, and more',
                'category': 'sales',
                'logo_url': '/logos/salesforce.svg',
                'features': json.dumps(['Contact Management', 'Sales Pipeline', 'Reports', 'Email Integration']),
                'pricing_tiers': json.dumps([
                    {'name': 'Essentials', 'price': 25, 'features': ['Basic CRM', '10 users max']},
                    {'name': 'Professional', 'price': 75, 'features': ['Full CRM', 'Unlimited users']},
                    {'name': 'Enterprise', 'price': 150, 'features': ['Advanced features', 'Unlimited']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'salesforce', 'api_version': 'v59.0'})
            },
            {
                'name': 'Shopify',
                'slug': 'shopify',
                'description': 'E-commerce platform for online stores and retail point-of-sale systems',
                'category': 'ecommerce',
                'logo_url': '/logos/shopify.svg',
                'features': json.dumps(['Online Store', 'Inventory Management', 'Payment Processing', 'Shipping']),
                'pricing_tiers': json.dumps([
                    {'name': 'Basic', 'price': 39, 'features': ['Online store', '2 staff accounts']},
                    {'name': 'Shopify', 'price': 105, 'features': ['Professional reports', '5 staff']},
                    {'name': 'Advanced', 'price': 399, 'features': ['Advanced reports', '15 staff']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'shopify', 'api_version': '2024-01'})
            },
            {
                'name': 'Google Workspace',
                'slug': 'google-workspace',
                'description': 'Productivity and collaboration tools including Gmail, Docs, Drive, and Calendar',
                'category': 'productivity',
                'logo_url': '/logos/google-workspace.svg',
                'features': json.dumps(['Gmail', 'Google Drive', 'Google Docs', 'Google Calendar']),
                'pricing_tiers': json.dumps([
                    {'name': 'Business Starter', 'price': 6, 'features': ['30GB storage', 'Custom email']},
                    {'name': 'Business Standard', 'price': 12, 'features': ['2TB storage', 'Recording']},
                    {'name': 'Business Plus', 'price': 18, 'features': ['5TB storage', 'Enhanced security']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'google', 'api_version': 'v1'})
            },
            {
                'name': 'Microsoft 365',
                'slug': 'microsoft-365',
                'description': 'Office suite including Word, Excel, PowerPoint, Teams, and OneDrive',
                'category': 'productivity',
                'logo_url': '/logos/microsoft-365.svg',
                'features': json.dumps(['Word', 'Excel', 'Teams', 'OneDrive', 'Outlook']),
                'pricing_tiers': json.dumps([
                    {'name': 'Basic', 'price': 6, 'features': ['Web apps', '1TB OneDrive']},
                    {'name': 'Standard', 'price': 12.5, 'features': ['Desktop apps', 'Teams']},
                    {'name': 'Premium', 'price': 22, 'features': ['Advanced security', 'Analytics']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'microsoft', 'api_version': 'v1.0'})
            },
            {
                'name': 'Slack',
                'slug': 'slack',
                'description': 'Business communication platform for team collaboration',
                'category': 'communication',
                'logo_url': '/logos/slack.svg',
                'features': json.dumps(['Channels', 'Direct Messages', 'File Sharing', 'App Integrations']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['10K messages', '10 integrations']},
                    {'name': 'Pro', 'price': 8.75, 'features': ['Unlimited messages', 'Guest access']},
                    {'name': 'Business+', 'price': 15, 'features': ['SSO', 'Compliance exports']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'slack', 'api_version': 'v1'})
            },
            {
                'name': 'HubSpot',
                'slug': 'hubspot',
                'description': 'Inbound marketing, sales, and CRM software',
                'category': 'marketing',
                'logo_url': '/logos/hubspot.svg',
                'features': json.dumps(['CRM', 'Email Marketing', 'Landing Pages', 'Analytics']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['Basic CRM', '1 million contacts']},
                    {'name': 'Starter', 'price': 20, 'features': ['Marketing automation', 'Ad management']},
                    {'name': 'Professional', 'price': 890, 'features': ['Advanced features', 'Teams']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'hubspot', 'api_version': 'v3'})
            },
            {
                'name': 'Zendesk',
                'slug': 'zendesk',
                'description': 'Customer service and engagement platform',
                'category': 'support',
                'logo_url': '/logos/zendesk.svg',
                'features': json.dumps(['Ticket Management', 'Knowledge Base', 'Live Chat', 'Analytics']),
                'pricing_tiers': json.dumps([
                    {'name': 'Essential', 'price': 5, 'features': ['Email ticketing', 'Basic']},
                    {'name': 'Team', 'price': 19, 'features': ['Collaboration', 'Performance']},
                    {'name': 'Professional', 'price': 59, 'features': ['Custom fields', 'API']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'zendesk', 'api_version': 'v2'})
            },
            {
                'name': 'Mailchimp',
                'slug': 'mailchimp',
                'description': 'Marketing automation and email marketing platform',
                'category': 'marketing',
                'logo_url': '/logos/mailchimp.svg',
                'features': json.dumps(['Email Campaigns', 'Automation', 'Landing Pages', 'Analytics']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['500 contacts', '1,000 sends/mo']},
                    {'name': 'Essentials', 'price': 13, 'features': ['50K contacts', 'Templates']},
                    {'name': 'Standard', 'price': 20, 'features': ['100K contacts', 'Automation']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'mailchimp', 'api_version': '3.0'})
            },
            {
                'name': 'Zoom',
                'slug': 'zoom',
                'description': 'Video conferencing and online meetings platform',
                'category': 'communication',
                'logo_url': '/logos/zoom.svg',
                'features': json.dumps(['Video Meetings', 'Webinars', 'Chat', 'Recording']),
                'pricing_tiers': json.dumps([
                    {'name': 'Basic', 'price': 0, 'features': ['40 min meetings', '100 participants']},
                    {'name': 'Pro', 'price': 14.99, 'features': ['Unlimited meetings', 'Cloud recording']},
                    {'name': 'Business', 'price': 19.99, 'features': ['300 participants', 'Admin dashboard']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'zoom', 'api_version': 'v2'})
            },
            {
                'name': 'Dropbox Business',
                'slug': 'dropbox',
                'description': 'Cloud storage and file synchronization service',
                'category': 'storage',
                'logo_url': '/logos/dropbox.svg',
                'features': json.dumps(['File Storage', 'File Sharing', 'Collaboration', 'Backup']),
                'pricing_tiers': json.dumps([
                    {'name': 'Standard', 'price': 15, 'features': ['5TB storage', 'Advanced sharing']},
                    {'name': 'Advanced', 'price': 25, 'features': ['Unlimited storage', 'Admin controls']},
                    {'name': 'Enterprise', 'price': 0, 'features': ['Custom', 'Advanced security']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'dropbox', 'api_version': 'v2'})
            },
            {
                'name': 'Xero',
                'slug': 'xero',
                'description': 'Accounting software for small businesses',
                'category': 'finance',
                'logo_url': '/logos/xero.svg',
                'features': json.dumps(['Invoicing', 'Bank Reconciliation', 'Expense Claims', 'Reporting']),
                'pricing_tiers': json.dumps([
                    {'name': 'Early', 'price': 13, 'features': ['20 invoices', '5 bills']},
                    {'name': 'Growing', 'price': 37, 'features': ['Unlimited invoices', 'Bulk reconcile']},
                    {'name': 'Established', 'price': 70, 'features': ['Multi-currency', 'Expenses']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'xero', 'api_version': '2.0'})
            },
            {
                'name': 'Asana',
                'slug': 'asana',
                'description': 'Work management platform for team coordination',
                'category': 'productivity',
                'logo_url': '/logos/asana.svg',
                'features': json.dumps(['Task Management', 'Projects', 'Timelines', 'Portfolios']),
                'pricing_tiers': json.dumps([
                    {'name': 'Basic', 'price': 0, 'features': ['15 team members', 'Unlimited tasks']},
                    {'name': 'Premium', 'price': 13.49, 'features': ['Timeline', 'Custom fields']},
                    {'name': 'Business', 'price': 30.49, 'features': ['Portfolios', 'Workload']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'asana', 'api_version': '1.0'})
            },
            {
                'name': 'Trello',
                'slug': 'trello',
                'description': 'Visual collaboration tool for organizing work',
                'category': 'productivity',
                'logo_url': '/logos/trello.svg',
                'features': json.dumps(['Boards', 'Cards', 'Lists', 'Power-Ups']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['10 boards', 'Unlimited cards']},
                    {'name': 'Standard', 'price': 6, 'features': ['Unlimited boards', 'Advanced']},
                    {'name': 'Premium', 'price': 12.50, 'features': ['Unlimited Power-Ups', 'Admin']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'trello', 'api_version': '1'})
            },
            {
                'name': 'Monday.com',
                'slug': 'monday',
                'description': 'Work operating system for team management',
                'category': 'productivity',
                'logo_url': '/logos/monday.svg',
                'features': json.dumps(['Workflows', 'Dashboards', 'Integrations', 'Automation']),
                'pricing_tiers': json.dumps([
                    {'name': 'Basic', 'price': 9, 'features': ['Unlimited boards', '2 team members']},
                    {'name': 'Standard', 'price': 12, 'features': ['Timeline', 'Calendar', '3 members']},
                    {'name': 'Pro', 'price': 19, 'features': ['Automation', 'Integrations', '5 members']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'monday', 'api_version': '2024-01'})
            },
            {
                'name': 'GitHub',
                'slug': 'github',
                'description': 'Development platform for version control and collaboration',
                'category': 'development',
                'logo_url': '/logos/github.svg',
                'features': json.dumps(['Repositories', 'Issues', 'Pull Requests', 'Actions']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['Unlimited public repos', 'Basic']},
                    {'name': 'Team', 'price': 4, 'features': ['Advanced features', 'Teams']},
                    {'name': 'Enterprise', 'price': 21, 'features': ['SAML SSO', 'Advanced security']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'github', 'api_version': 'v3'})
            },
            {
                'name': 'Jira',
                'slug': 'jira',
                'description': 'Issue tracking and project management for software teams',
                'category': 'development',
                'logo_url': '/logos/jira.svg',
                'features': json.dumps(['Issue Tracking', 'Agile Boards', 'Roadmaps', 'Reports']),
                'pricing_tiers': json.dumps([
                    {'name': 'Free', 'price': 0, 'features': ['10 users', 'Basic features']},
                    {'name': 'Standard', 'price': 7.75, 'features': ['Up to 35K users', 'Advanced']},
                    {'name': 'Premium', 'price': 15.25, 'features': ['Unlimited storage', 'Advanced admin']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'jira', 'api_version': '3'})
            },
            {
                'name': 'Notion',
                'slug': 'notion',
                'description': 'All-in-one workspace for notes, tasks, wikis, and databases',
                'category': 'productivity',
                'logo_url': '/logos/notion.svg',
                'features': json.dumps(['Notes', 'Databases', 'Tasks', 'Collaboration']),
                'pricing_tiers': json.dumps([
                    {'name': 'Personal', 'price': 0, 'features': ['Unlimited blocks', '1 guest']},
                    {'name': 'Plus', 'price': 10, 'features': ['Unlimited guests', 'Advanced']},
                    {'name': 'Business', 'price': 18, 'features': ['SAML SSO', 'Advanced security']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'notion', 'api_version': '2022-06-28'})
            },
            {
                'name': 'DocuSign',
                'slug': 'docusign',
                'description': 'Electronic signature and agreement management platform',
                'category': 'business',
                'logo_url': '/logos/docusign.svg',
                'features': json.dumps(['E-Signatures', 'Document Management', 'Templates', 'Workflow']),
                'pricing_tiers': json.dumps([
                    {'name': 'Personal', 'price': 15, 'features': ['5 documents/month', '1 user']},
                    {'name': 'Standard', 'price': 40, 'features': ['Unlimited sends', 'Reminders']},
                    {'name': 'Business Pro', 'price': 60, 'features': ['Advanced features', 'Payments']}
                ]),
                'integration_config': json.dumps({'oauth_provider': 'docusign', 'api_version': 'v2.1'})
            }
        ]

        # Add all products to database
        for product_data in products_data:
            product = MarketplaceProduct(**product_data)
            db.add(product)

        db.commit()
        print(f'Successfully added {len(products_data)} products to database')
    except Exception as e:
        print(f'Error seeding products: {e}')
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    seed_products()