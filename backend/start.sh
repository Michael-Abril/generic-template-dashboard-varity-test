#!/bin/bash
# Start script for Railway deployment
# Handles PORT environment variable properly

# Check if this should run as Celery worker
if [ "$RUN_CELERY" = "true" ]; then
    echo "Starting Celery worker with beat scheduler..."
    exec celery -A celery_worker worker --beat --loglevel=info
else
    PORT="${PORT:-8000}"
    echo "Starting Uvicorn on port $PORT"
    exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
fi
