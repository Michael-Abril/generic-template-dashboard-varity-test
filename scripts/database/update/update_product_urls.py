"""
Update Product URLs Script
Adds website, documentation, and support URLs to all products
"""
import sqlite3

# URL mappings for each product
PRODUCT_URLS = {
    'quickbooks': {
        'website': 'https://quickbooks.intuit.com',
        'docs': 'https://developer.intuit.com/app/developer/qbo/docs/get-started',
        'support': 'https://quickbooks.intuit.com/learn-support/'
    },
    'salesforce': {
        'website': 'https://www.salesforce.com',
        'docs': 'https://developer.salesforce.com/docs',
        'support': 'https://help.salesforce.com'
    },
    'shopify': {
        'website': 'https://www.shopify.com',
        'docs': 'https://shopify.dev/docs',
        'support': 'https://help.shopify.com'
    },
    'slack': {
        'website': 'https://slack.com',
        'docs': 'https://api.slack.com/docs',
        'support': 'https://slack.com/help'
    },
    'monday': {
        'website': 'https://monday.com',
        'docs': 'https://developer.monday.com/api-reference/docs',
        'support': 'https://support.monday.com'
    },
    'stripe': {
        'website': 'https://stripe.com',
        'docs': 'https://stripe.com/docs',
        'support': 'https://support.stripe.com'
    },
    'hubspot': {
        'website': 'https://www.hubspot.com',
        'docs': 'https://developers.hubspot.com/docs/api/overview',
        'support': 'https://help.hubspot.com'
    },
    'zendesk': {
        'website': 'https://www.zendesk.com',
        'docs': 'https://developer.zendesk.com/api-reference/',
        'support': 'https://support.zendesk.com'
    },
    'google-workspace': {
        'website': 'https://workspace.google.com',
        'docs': 'https://developers.google.com/workspace',
        'support': 'https://support.google.com/a'
    },
    'microsoft-365': {
        'website': 'https://www.microsoft.com/en-us/microsoft-365',
        'docs': 'https://docs.microsoft.com/en-us/graph',
        'support': 'https://support.microsoft.com/en-us/microsoft-365'
    },
    'xero': {
        'website': 'https://www.xero.com',
        'docs': 'https://developer.xero.com/documentation',
        'support': 'https://central.xero.com'
    },
    'freshbooks': {
        'website': 'https://www.freshbooks.com',
        'docs': 'https://www.freshbooks.com/api/start',
        'support': 'https://support.freshbooks.com'
    },
    'asana': {
        'website': 'https://asana.com',
        'docs': 'https://developers.asana.com/docs',
        'support': 'https://asana.com/support'
    },
    'trello': {
        'website': 'https://trello.com',
        'docs': 'https://developer.atlassian.com/cloud/trello/',
        'support': 'https://support.atlassian.com/trello/'
    },
    'mailchimp': {
        'website': 'https://mailchimp.com',
        'docs': 'https://mailchimp.com/developer/',
        'support': 'https://mailchimp.com/help/'
    },
    'intercom': {
        'website': 'https://www.intercom.com',
        'docs': 'https://developers.intercom.com/docs',
        'support': 'https://www.intercom.com/help'
    },
    'twilio': {
        'website': 'https://www.twilio.com',
        'docs': 'https://www.twilio.com/docs',
        'support': 'https://support.twilio.com'
    },
    'docusign': {
        'website': 'https://www.docusign.com',
        'docs': 'https://developers.docusign.com/docs',
        'support': 'https://support.docusign.com'
    },
    'zoom': {
        'website': 'https://zoom.us',
        'docs': 'https://marketplace.zoom.us/docs/api-reference/introduction',
        'support': 'https://support.zoom.us'
    },
    'dropbox': {
        'website': 'https://www.dropbox.com',
        'docs': 'https://www.dropbox.com/developers/documentation',
        'support': 'https://help.dropbox.com'
    }
}

def update_urls():
    """Update URLs for all products"""
    conn = sqlite3.connect('marketplace_test.db')
    cursor = conn.cursor()

    print("Updating Product URLs...")
    print("="*60)

    updated_count = 0

    for slug, urls in PRODUCT_URLS.items():
        cursor.execute("""
            UPDATE marketplace_products
            SET website_url = ?,
                documentation_url = ?,
                support_url = ?
            WHERE slug = ?
        """, (urls['website'], urls['docs'], urls['support'], slug))

        if cursor.rowcount > 0:
            updated_count += 1
            print(f"✅ Updated {slug}")
        else:
            print(f"⚠️  Product not found: {slug}")

    conn.commit()
    conn.close()

    print(f"\n✅ Updated {updated_count} products with URLs")

if __name__ == "__main__":
    update_urls()
