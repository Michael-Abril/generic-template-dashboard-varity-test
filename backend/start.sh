#!/bin/bash
# Start script for Railway deployment
# Railway only processes the 'web:' line in Procfile
# So we run Celery in background alongside the web server

PORT="${PORT:-8000}"

# Start Celery worker in background if ENABLE_CELERY is set
if [ "$ENABLE_CELERY" = "true" ]; then
    echo "Starting Celery worker with beat scheduler in background..."
    celery -A celery_worker worker --beat --loglevel=info &
    CELERY_PID=$!
    echo "Celery started with PID: $CELERY_PID"
fi

# Start Uvicorn web server
echo "Starting Uvicorn on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
