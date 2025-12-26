#!/bin/bash
# Start script for Railway deployment

PORT="${PORT:-8000}"

# Run database migrations (idempotent - safe to run every deploy)
echo "Running database migrations..."
alembic upgrade head

# Start Uvicorn web server
echo "Starting Uvicorn on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
