"""
Celery Worker Entry Point for Varity Dashboard

Run with:
    celery -A celery_worker worker --loglevel=info

For scheduled tasks (beat):
    celery -A celery_worker beat --loglevel=info

Or both combined:
    celery -A celery_worker worker --beat --loglevel=info
"""
import os
import logging
from celery import Celery

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Get Redis URL from environment
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Create Celery app
celery_app = Celery(
    'varity_sync',
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        'app.services.sync_service',
    ]
)

# Load configuration
celery_app.config_from_object('app.core.celeryconfig')

# Update broker URL from environment
celery_app.conf.update(
    broker_url=REDIS_URL,
    result_backend=REDIS_URL,
    # Add backend URL for sync tasks
    task_default_queue='default',
)

# Set BACKEND_URL for sync tasks to call the API
if not os.getenv('BACKEND_URL'):
    # Default to Railway internal networking if available
    os.environ['BACKEND_URL'] = os.getenv(
        'RAILWAY_PRIVATE_DOMAIN',
        'https://generic-template-dashboard-production.up.railway.app'
    )

logger.info(f"Celery worker configured with broker: {REDIS_URL[:20]}...")
logger.info(f"Backend URL for sync: {os.getenv('BACKEND_URL')}")

if __name__ == '__main__':
    celery_app.start()
