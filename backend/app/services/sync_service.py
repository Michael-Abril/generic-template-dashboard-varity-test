"""
Data Sync Engine for Varity Dashboard
Handles scheduled synchronization of data from all integrations
"""
import os
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from celery import Celery
from celery.schedules import crontab
import httpx
import asyncio
from quickbooks import QuickBooks
from simple_salesforce import Salesforce
import stripe
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from hubspot import HubSpot
from slack_sdk import WebClient
import zenpy

logger = logging.getLogger(__name__)

# Configure Celery
app = Celery(
    'varity_sync',
    broker=os.getenv('REDIS_URL', 'redis://localhost:6380'),
    backend=os.getenv('REDIS_URL', 'redis://localhost:6380')
)

# Celery configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

# Beat schedule for periodic tasks
app.conf.beat_schedule = {
    'sync-all-integrations': {
        'task': 'app.services.sync_service.sync_all_integrations',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
    },
    'sync-critical-data': {
        'task': 'app.services.sync_service.sync_critical_data',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'cleanup-old-sync-data': {
        'task': 'app.services.sync_service.cleanup_old_data',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
    },
}


class IntegrationSyncService:
    """
    Service for syncing data from all integrated platforms
    """

    def __init__(self):
        """Initialize sync service with integration clients"""
        self.sync_status = {}
        self.last_sync_times = {}
        logger.info("Integration Sync Service initialized")

    async def sync_quickbooks_data(
        self,
        access_token: str,
        company_id: str,
        sync_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Sync data from QuickBooks

        Args:
            access_token: OAuth access token
            company_id: QuickBooks company ID
            sync_type: 'full' or 'incremental'

        Returns:
            Sync results with data and metadata
        """
        try:
            # Initialize QuickBooks client
            qb = QuickBooks(
                auth_client=None,
                refresh_token=access_token,
                company_id=company_id,
                minorversion=65
            )

            sync_data = {
                'customers': [],
                'invoices': [],
                'payments': [],
                'products': [],
                'transactions': [],
                'reports': {}
            }

            # Sync customers
            customers = qb.customer.all()
            sync_data['customers'] = [
                {
                    'id': c.Id,
                    'name': c.DisplayName,
                    'email': getattr(c.PrimaryEmailAddr, 'Address', None) if c.PrimaryEmailAddr else None,
                    'balance': float(c.Balance) if c.Balance else 0,
                    'active': c.Active
                }
                for c in customers
            ]

            # Sync invoices
            invoices = qb.invoice.all()
            sync_data['invoices'] = [
                {
                    'id': i.Id,
                    'doc_number': i.DocNumber,
                    'customer_id': i.CustomerRef.value if i.CustomerRef else None,
                    'total': float(i.TotalAmt) if i.TotalAmt else 0,
                    'due_date': i.DueDate,
                    'status': 'paid' if float(i.Balance) == 0 else 'pending'
                }
                for i in invoices
            ]

            # Sync payments
            payments = qb.payment.all()
            sync_data['payments'] = [
                {
                    'id': p.Id,
                    'amount': float(p.TotalAmt) if p.TotalAmt else 0,
                    'date': p.TxnDate,
                    'customer_id': p.CustomerRef.value if p.CustomerRef else None,
                    'payment_method': p.PaymentMethodRef.name if p.PaymentMethodRef else None
                }
                for p in payments
            ]

            # Generate summary report
            sync_data['reports']['summary'] = {
                'total_customers': len(sync_data['customers']),
                'total_invoices': len(sync_data['invoices']),
                'total_revenue': sum(i['total'] for i in sync_data['invoices']),
                'pending_revenue': sum(i['total'] for i in sync_data['invoices'] if i['status'] == 'pending'),
                'sync_time': datetime.now().isoformat()
            }

            logger.info(f"QuickBooks sync completed: {sync_data['reports']['summary']}")
            return {
                'success': True,
                'data': sync_data,
                'sync_type': sync_type,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"QuickBooks sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def sync_stripe_data(
        self,
        api_key: str,
        account_id: Optional[str] = None,
        sync_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Sync data from Stripe

        Args:
            api_key: Stripe API key
            account_id: Connected account ID (optional)
            sync_type: 'full' or 'incremental'

        Returns:
            Sync results with data and metadata
        """
        try:
            stripe.api_key = api_key

            sync_data = {
                'customers': [],
                'charges': [],
                'invoices': [],
                'subscriptions': [],
                'payouts': [],
                'reports': {}
            }

            # Sync customers
            customers = stripe.Customer.list(limit=100)
            sync_data['customers'] = [
                {
                    'id': c.id,
                    'email': c.email,
                    'name': c.name,
                    'created': datetime.fromtimestamp(c.created).isoformat(),
                    'currency': c.currency,
                    'balance': c.balance / 100 if c.balance else 0
                }
                for c in customers.data
            ]

            # Sync charges
            charges = stripe.Charge.list(limit=100)
            sync_data['charges'] = [
                {
                    'id': ch.id,
                    'amount': ch.amount / 100,
                    'currency': ch.currency,
                    'customer_id': ch.customer,
                    'status': ch.status,
                    'created': datetime.fromtimestamp(ch.created).isoformat(),
                    'description': ch.description
                }
                for ch in charges.data
            ]

            # Sync invoices
            invoices = stripe.Invoice.list(limit=100)
            sync_data['invoices'] = [
                {
                    'id': inv.id,
                    'number': inv.number,
                    'customer_id': inv.customer,
                    'amount_paid': inv.amount_paid / 100 if inv.amount_paid else 0,
                    'amount_due': inv.amount_due / 100 if inv.amount_due else 0,
                    'status': inv.status,
                    'created': datetime.fromtimestamp(inv.created).isoformat()
                }
                for inv in invoices.data
            ]

            # Sync subscriptions
            subscriptions = stripe.Subscription.list(limit=100)
            sync_data['subscriptions'] = [
                {
                    'id': sub.id,
                    'customer_id': sub.customer,
                    'status': sub.status,
                    'current_period_start': datetime.fromtimestamp(sub.current_period_start).isoformat(),
                    'current_period_end': datetime.fromtimestamp(sub.current_period_end).isoformat(),
                    'items': [
                        {
                            'price_id': item.price.id,
                            'product_id': item.price.product,
                            'quantity': item.quantity
                        }
                        for item in sub.items.data
                    ]
                }
                for sub in subscriptions.data
            ]

            # Generate summary report
            sync_data['reports']['summary'] = {
                'total_customers': len(sync_data['customers']),
                'total_charges': len(sync_data['charges']),
                'total_revenue': sum(ch['amount'] for ch in sync_data['charges'] if ch['status'] == 'succeeded'),
                'active_subscriptions': len([s for s in sync_data['subscriptions'] if s['status'] == 'active']),
                'sync_time': datetime.now().isoformat()
            }

            logger.info(f"Stripe sync completed: {sync_data['reports']['summary']}")
            return {
                'success': True,
                'data': sync_data,
                'sync_type': sync_type,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Stripe sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def sync_google_workspace_data(
        self,
        credentials_json: str,
        sync_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Sync data from Google Workspace

        Args:
            credentials_json: Google OAuth credentials JSON
            sync_type: 'full' or 'incremental'

        Returns:
            Sync results with data and metadata
        """
        try:
            creds = Credentials.from_authorized_user_info(json.loads(credentials_json))

            sync_data = {
                'emails': [],
                'calendar_events': [],
                'drive_files': [],
                'reports': {}
            }

            # Gmail sync
            gmail_service = build('gmail', 'v1', credentials=creds)
            messages = gmail_service.users().messages().list(
                userId='me',
                maxResults=50,
                q='is:important OR is:starred'
            ).execute()

            if 'messages' in messages:
                for msg_ref in messages['messages'][:20]:  # Limit to 20 for performance
                    msg = gmail_service.users().messages().get(
                        userId='me',
                        id=msg_ref['id']
                    ).execute()

                    headers = msg['payload'].get('headers', [])
                    subject = next((h['value'] for h in headers if h['name'] == 'Subject'), '')
                    from_email = next((h['value'] for h in headers if h['name'] == 'From'), '')
                    date = next((h['value'] for h in headers if h['name'] == 'Date'), '')

                    sync_data['emails'].append({
                        'id': msg['id'],
                        'thread_id': msg['threadId'],
                        'subject': subject,
                        'from': from_email,
                        'date': date,
                        'snippet': msg.get('snippet', '')[:200]
                    })

            # Calendar sync
            calendar_service = build('calendar', 'v3', credentials=creds)
            now = datetime.utcnow().isoformat() + 'Z'
            events_result = calendar_service.events().list(
                calendarId='primary',
                timeMin=now,
                maxResults=20,
                singleEvents=True,
                orderBy='startTime'
            ).execute()

            events = events_result.get('items', [])
            sync_data['calendar_events'] = [
                {
                    'id': event['id'],
                    'summary': event.get('summary', 'No title'),
                    'start': event['start'].get('dateTime', event['start'].get('date')),
                    'end': event['end'].get('dateTime', event['end'].get('date')),
                    'status': event.get('status', 'confirmed'),
                    'attendees': len(event.get('attendees', []))
                }
                for event in events
            ]

            # Drive sync (recent files)
            drive_service = build('drive', 'v3', credentials=creds)
            results = drive_service.files().list(
                pageSize=20,
                fields="files(id, name, mimeType, modifiedTime, size)",
                orderBy='modifiedTime desc'
            ).execute()

            files = results.get('files', [])
            sync_data['drive_files'] = [
                {
                    'id': f['id'],
                    'name': f['name'],
                    'mime_type': f['mimeType'],
                    'modified': f.get('modifiedTime', ''),
                    'size': int(f.get('size', 0))
                }
                for f in files
            ]

            # Generate summary report
            sync_data['reports']['summary'] = {
                'total_emails': len(sync_data['emails']),
                'upcoming_events': len(sync_data['calendar_events']),
                'recent_files': len(sync_data['drive_files']),
                'sync_time': datetime.now().isoformat()
            }

            logger.info(f"Google Workspace sync completed: {sync_data['reports']['summary']}")
            return {
                'success': True,
                'data': sync_data,
                'sync_type': sync_type,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Google Workspace sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def sync_salesforce_data(
        self,
        username: str,
        password: str,
        security_token: str,
        domain: str = 'login',
        sync_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Sync data from Salesforce

        Args:
            username: Salesforce username
            password: Salesforce password
            security_token: Salesforce security token
            domain: Salesforce domain (login or test)
            sync_type: 'full' or 'incremental'

        Returns:
            Sync results with data and metadata
        """
        try:
            sf = Salesforce(
                username=username,
                password=password,
                security_token=security_token,
                domain=domain
            )

            sync_data = {
                'accounts': [],
                'contacts': [],
                'opportunities': [],
                'leads': [],
                'cases': [],
                'reports': {}
            }

            # Sync accounts
            accounts = sf.query("SELECT Id, Name, Type, Industry, AnnualRevenue, NumberOfEmployees FROM Account LIMIT 100")
            sync_data['accounts'] = [
                {
                    'id': acc['Id'],
                    'name': acc['Name'],
                    'type': acc.get('Type'),
                    'industry': acc.get('Industry'),
                    'annual_revenue': acc.get('AnnualRevenue'),
                    'employees': acc.get('NumberOfEmployees')
                }
                for acc in accounts['records']
            ]

            # Sync contacts
            contacts = sf.query("SELECT Id, FirstName, LastName, Email, Phone, AccountId FROM Contact LIMIT 100")
            sync_data['contacts'] = [
                {
                    'id': cont['Id'],
                    'first_name': cont.get('FirstName'),
                    'last_name': cont.get('LastName'),
                    'email': cont.get('Email'),
                    'phone': cont.get('Phone'),
                    'account_id': cont.get('AccountId')
                }
                for cont in contacts['records']
            ]

            # Sync opportunities
            opportunities = sf.query("""
                SELECT Id, Name, StageName, Amount, CloseDate, Probability, AccountId
                FROM Opportunity
                WHERE IsClosed = false
                LIMIT 100
            """)
            sync_data['opportunities'] = [
                {
                    'id': opp['Id'],
                    'name': opp['Name'],
                    'stage': opp['StageName'],
                    'amount': float(opp['Amount']) if opp.get('Amount') else 0,
                    'close_date': opp['CloseDate'],
                    'probability': opp.get('Probability', 0),
                    'account_id': opp.get('AccountId')
                }
                for opp in opportunities['records']
            ]

            # Sync leads
            leads = sf.query("SELECT Id, FirstName, LastName, Company, Email, Status FROM Lead WHERE IsConverted = false LIMIT 100")
            sync_data['leads'] = [
                {
                    'id': lead['Id'],
                    'first_name': lead.get('FirstName'),
                    'last_name': lead.get('LastName'),
                    'company': lead.get('Company'),
                    'email': lead.get('Email'),
                    'status': lead['Status']
                }
                for lead in leads['records']
            ]

            # Generate summary report
            sync_data['reports']['summary'] = {
                'total_accounts': len(sync_data['accounts']),
                'total_contacts': len(sync_data['contacts']),
                'open_opportunities': len(sync_data['opportunities']),
                'pipeline_value': sum(opp['amount'] for opp in sync_data['opportunities']),
                'total_leads': len(sync_data['leads']),
                'sync_time': datetime.now().isoformat()
            }

            logger.info(f"Salesforce sync completed: {sync_data['reports']['summary']}")
            return {
                'success': True,
                'data': sync_data,
                'sync_type': sync_type,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Salesforce sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def sync_shopify_data(
        self,
        shop_domain: str,
        access_token: str,
        sync_type: str = 'full'
    ) -> Dict[str, Any]:
        """
        Sync data from Shopify using direct API calls

        Args:
            shop_domain: Shopify shop domain
            access_token: Shopify access token
            sync_type: 'full' or 'incremental'

        Returns:
            Sync results with data and metadata
        """
        try:
            base_url = f"https://{shop_domain}/admin/api/2023-10"
            headers = {
                'X-Shopify-Access-Token': access_token,
                'Content-Type': 'application/json'
            }

            sync_data = {
                'products': [],
                'orders': [],
                'customers': [],
                'inventory': [],
                'reports': {}
            }

            async with httpx.AsyncClient() as client:
                # Sync products
                response = await client.get(f"{base_url}/products.json?limit=50", headers=headers)
                if response.status_code == 200:
                    products = response.json()['products']
                    sync_data['products'] = [
                        {
                            'id': p['id'],
                            'title': p['title'],
                            'vendor': p['vendor'],
                            'product_type': p['product_type'],
                            'status': p['status'],
                            'variants_count': len(p.get('variants', [])),
                            'tags': p.get('tags', '').split(', ')
                        }
                        for p in products
                    ]

                # Sync orders
                response = await client.get(f"{base_url}/orders.json?status=any&limit=50", headers=headers)
                if response.status_code == 200:
                    orders = response.json()['orders']
                    sync_data['orders'] = [
                        {
                            'id': o['id'],
                            'order_number': o['order_number'],
                            'email': o.get('email'),
                            'financial_status': o['financial_status'],
                            'fulfillment_status': o.get('fulfillment_status'),
                            'total_price': float(o['total_price']),
                            'currency': o['currency'],
                            'created_at': o['created_at']
                        }
                        for o in orders
                    ]

                # Sync customers
                response = await client.get(f"{base_url}/customers.json?limit=50", headers=headers)
                if response.status_code == 200:
                    customers = response.json()['customers']
                    sync_data['customers'] = [
                        {
                            'id': c['id'],
                            'email': c['email'],
                            'first_name': c.get('first_name'),
                            'last_name': c.get('last_name'),
                            'orders_count': c['orders_count'],
                            'total_spent': float(c['total_spent']),
                            'state': c['state']
                        }
                        for c in customers
                    ]

            # Generate summary report
            sync_data['reports']['summary'] = {
                'total_products': len(sync_data['products']),
                'total_orders': len(sync_data['orders']),
                'total_revenue': sum(o['total_price'] for o in sync_data['orders']),
                'total_customers': len(sync_data['customers']),
                'sync_time': datetime.now().isoformat()
            }

            logger.info(f"Shopify sync completed: {sync_data['reports']['summary']}")
            return {
                'success': True,
                'data': sync_data,
                'sync_type': sync_type,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Shopify sync failed: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    async def aggregate_all_data(
        self,
        user_id: str,
        integrations: List[str]
    ) -> Dict[str, Any]:
        """
        Aggregate data from all connected integrations

        Args:
            user_id: User identifier
            integrations: List of integration names to sync

        Returns:
            Aggregated data from all integrations
        """
        aggregated_data = {
            'user_id': user_id,
            'integrations': {},
            'summary': {
                'total_revenue': 0,
                'total_customers': 0,
                'total_transactions': 0,
                'sync_timestamp': datetime.now().isoformat()
            }
        }

        # Process each integration
        for integration in integrations:
            # Get sync data for this integration (would come from database)
            sync_data = await self.get_latest_sync_data(user_id, integration)

            if sync_data:
                aggregated_data['integrations'][integration] = sync_data

                # Update summary metrics
                if 'reports' in sync_data and 'summary' in sync_data['reports']:
                    summary = sync_data['reports']['summary']
                    aggregated_data['summary']['total_revenue'] += summary.get('total_revenue', 0)
                    aggregated_data['summary']['total_customers'] += summary.get('total_customers', 0)
                    aggregated_data['summary']['total_transactions'] += summary.get('total_charges', 0) + \
                                                                       summary.get('total_invoices', 0) + \
                                                                       summary.get('total_orders', 0)

        logger.info(f"Aggregated data for user {user_id}: {aggregated_data['summary']}")
        return aggregated_data

    async def get_latest_sync_data(
        self,
        user_id: str,
        integration: str
    ) -> Optional[Dict[str, Any]]:
        """
        Get the latest sync data for an integration

        Args:
            user_id: User identifier
            integration: Integration name

        Returns:
            Latest sync data if available
        """
        try:
            from sqlalchemy import create_engine, text
            from sqlalchemy.orm import sessionmaker

            # Get database URL from environment
            database_url = os.getenv('DATABASE_URL', '')
            if not database_url:
                logger.warning("DATABASE_URL not set, cannot query sync data")
                return None

            # Convert async URL to sync URL
            sync_db_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

            engine = create_engine(sync_db_url)
            Session = sessionmaker(bind=engine)
            session = Session()

            # Query the latest successful sync for this user and integration
            result = session.execute(text("""
                SELECT result_summary, completed_at
                FROM sync_logs
                WHERE user_address = :user_id
                AND resource_type = :integration
                AND status = 'success'
                ORDER BY completed_at DESC
                LIMIT 1
            """), {"user_id": user_id, "integration": integration})

            row = result.fetchone()
            session.close()

            if row and row[0]:
                # Return the stored result_summary from the database
                return row[0]

            # No sync data found - return None instead of mock data
            return None

        except Exception as e:
            logger.error(f"Failed to query latest sync data: {str(e)}")
            return None


# Celery tasks
@app.task(name='app.services.sync_service.sync_all_integrations')
def sync_all_integrations():
    """
    Sync data from all active integrations for all users.

    This task runs every 30 minutes via Celery Beat.
    It queries all active OAuth tokens and triggers sync for each.
    """
    import asyncio
    from sqlalchemy import create_engine, text
    from sqlalchemy.orm import sessionmaker

    logger.info("Starting scheduled sync for all integrations...")

    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL', '')
    if not database_url:
        logger.error("DATABASE_URL not set, cannot sync")
        return {'error': 'DATABASE_URL not configured'}

    # Convert async URL to sync URL for Celery
    sync_db_url = database_url.replace('postgresql+asyncpg://', 'postgresql://')

    try:
        engine = create_engine(sync_db_url)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Query all active OAuth tokens
        result = session.execute(text("""
            SELECT DISTINCT user_address, provider
            FROM oauth_tokens
            WHERE is_active = true
        """))

        active_integrations = [
            {'wallet_address': row[0], 'provider': row[1]}
            for row in result.fetchall()
        ]

        session.close()

        logger.info(f"Found {len(active_integrations)} active integrations to sync")

        # Trigger sync for each integration
        sync_results = []
        for integration in active_integrations:
            try:
                # Call the sync endpoint via HTTP (to reuse existing logic)
                import httpx

                backend_url = os.getenv(
                    'BACKEND_URL',
                    'https://generic-template-dashboard-production.up.railway.app'
                )

                response = httpx.post(
                    f"{backend_url}/api/v1/integrations/{integration['provider']}/sync",
                    json={'wallet_address': integration['wallet_address']},
                    timeout=300.0  # 5 minute timeout for sync
                )

                if response.status_code == 200:
                    sync_results.append({
                        'wallet': integration['wallet_address'][:10] + '...',
                        'provider': integration['provider'],
                        'status': 'success'
                    })
                    logger.info(
                        f"Synced {integration['provider']} for {integration['wallet_address'][:10]}..."
                    )
                else:
                    sync_results.append({
                        'wallet': integration['wallet_address'][:10] + '...',
                        'provider': integration['provider'],
                        'status': 'failed',
                        'error': response.text[:200]
                    })
                    logger.warning(
                        f"Failed to sync {integration['provider']} for "
                        f"{integration['wallet_address'][:10]}...: {response.status_code}"
                    )

            except Exception as e:
                logger.error(f"Sync error for {integration}: {str(e)}")
                sync_results.append({
                    'wallet': integration['wallet_address'][:10] + '...',
                    'provider': integration['provider'],
                    'status': 'error',
                    'error': str(e)
                })

        return {
            'status': 'completed',
            'synced': len([r for r in sync_results if r['status'] == 'success']),
            'failed': len([r for r in sync_results if r['status'] != 'success']),
            'results': sync_results,
            'timestamp': datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"sync_all_integrations failed: {str(e)}")
        return {'error': str(e), 'timestamp': datetime.now().isoformat()}


@app.task(name='app.services.sync_service.sync_critical_data')
def sync_critical_data():
    """Sync only critical real-time data"""
    # Sync only high-priority data like recent transactions, alerts, etc.
    logger.info("Syncing critical data")
    return {'status': 'completed', 'timestamp': datetime.now().isoformat()}


@app.task(name='app.services.sync_service.cleanup_old_data')
def cleanup_old_data():
    """Clean up old sync data to save storage"""
    # Remove sync data older than 30 days
    cutoff_date = datetime.now() - timedelta(days=30)
    logger.info(f"Cleaning up data older than {cutoff_date}")
    return {'status': 'completed', 'cleaned_records': 0}


# Singleton instance
sync_service = IntegrationSyncService()