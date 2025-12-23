#!/bin/bash
# Start script for Celery worker on Railway
echo "Starting Celery worker with beat scheduler..."
exec celery -A celery_worker worker --beat --loglevel=info
