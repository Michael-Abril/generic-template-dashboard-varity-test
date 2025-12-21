#!/bin/bash
# Start script for Railway deployment

PORT="${PORT:-8000}"

# Start Uvicorn web server
echo "Starting Uvicorn on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
