"""
Celery Configuration for Varity Dashboard
Handles background job processing and scheduled tasks
"""
import os
from celery.schedules import crontab

# Broker settings
broker_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
result_backend = os.getenv('REDIS_URL', 'redis://localhost:6379')

# Backend URL for API calls during sync
backend_url = os.getenv(
    'BACKEND_URL',
    'https://generic-template-dashboard-production.up.railway.app'
)

# Task serialization
task_serializer = 'json'
accept_content = ['json']
result_serializer = 'json'
timezone = 'UTC'
enable_utc = True

# Worker settings
worker_prefetch_multiplier = 1
worker_max_tasks_per_child = 1000
task_track_started = True
task_time_limit = 30 * 60  # 30 minutes
task_soft_time_limit = 25 * 60  # 25 minutes

# Queue configuration
task_routes = {
    'app.services.sync_service.sync_all_integrations': {'queue': 'sync'},
    'app.services.sync_service.sync_critical_data': {'queue': 'critical'},
    'app.services.sync_service.cleanup_old_data': {'queue': 'maintenance'},
    'app.services.analytics_service.*': {'queue': 'analytics'},
    'app.services.email_service.*': {'queue': 'email'},
    'app.services.pdf_service.*': {'queue': 'reports'},
}

# Beat schedule
beat_schedule = {
    # Data synchronization tasks
    'sync-all-integrations': {
        'task': 'app.services.sync_service.sync_all_integrations',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes
        'options': {'queue': 'sync'}
    },
    'sync-critical-data': {
        'task': 'app.services.sync_service.sync_critical_data',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
        'options': {'queue': 'critical'}
    },

    # Analytics aggregation tasks
    'aggregate-hourly-analytics': {
        'task': 'app.services.analytics_service.aggregate_hourly_data',
        'schedule': crontab(minute=0),  # Every hour
        'options': {'queue': 'analytics'}
    },
    'aggregate-daily-analytics': {
        'task': 'app.services.analytics_service.aggregate_daily_data',
        'schedule': crontab(hour=0, minute=0),  # Daily at midnight
        'options': {'queue': 'analytics'}
    },
    'generate-weekly-reports': {
        'task': 'app.services.analytics_service.generate_weekly_reports',
        'schedule': crontab(hour=0, minute=0, day_of_week=1),  # Weekly on Monday
        'options': {'queue': 'analytics'}
    },

    # Email tasks
    'send-daily-summary-emails': {
        'task': 'app.services.email_service.send_daily_summaries',
        'schedule': crontab(hour=9, minute=0),  # Daily at 9 AM
        'options': {'queue': 'email'}
    },
    'send-weekly-reports': {
        'task': 'app.services.email_service.send_weekly_reports',
        'schedule': crontab(hour=9, minute=0, day_of_week=1),  # Weekly on Monday at 9 AM
        'options': {'queue': 'email'}
    },

    # Maintenance tasks
    'cleanup-old-data': {
        'task': 'app.services.sync_service.cleanup_old_data',
        'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
        'options': {'queue': 'maintenance'}
    },
    'cleanup-old-reports': {
        'task': 'app.services.pdf_service.cleanup_old_reports',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
        'options': {'queue': 'maintenance'}
    },

    # Health check
    'health-check': {
        'task': 'app.services.health.check_system_health',
        'schedule': crontab(minute='*/10'),  # Every 10 minutes
        'options': {'queue': 'critical'}
    },
}

# Result expiration
result_expires = 3600  # 1 hour

# Task annotations
task_annotations = {
    '*': {'rate_limit': '10/m'},  # Default rate limit
    'app.services.sync_service.sync_critical_data': {'rate_limit': '100/m'},  # Higher for critical
    'app.services.email_service.*': {'rate_limit': '30/m'},  # Email rate limiting
}

# Celery beat settings
beat_scheduler = 'celery.beat.PersistentScheduler'
beat_schedule_filename = 'celerybeat-schedule'

# Error handling
task_reject_on_worker_lost = True
task_ignore_result = False

# Monitoring
worker_send_task_events = True
task_send_sent_event = True