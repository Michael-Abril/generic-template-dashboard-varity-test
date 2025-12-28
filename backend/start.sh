#!/bin/bash
# Start script for Railway deployment
# Made resilient to temporary database unavailability
# NOTE: We don't use 'set -e' because we want to continue even if migrations fail

PORT="${PORT:-8000}"
MAX_RETRIES=10
RETRY_DELAY=5

# Function to wait for PostgreSQL to be ready
wait_for_postgres() {
    echo "Checking PostgreSQL connectivity..."

    # Extract host from DATABASE_URL
    if [ -z "$DATABASE_URL" ]; then
        echo "WARNING: DATABASE_URL not set, skipping PostgreSQL check"
        return 0
    fi

    # Try to connect with retries
    for i in $(seq 1 $MAX_RETRIES); do
        echo "Attempt $i/$MAX_RETRIES: Checking database connection..."

        # Use Python to test the connection (more reliable than pg_isready)
        if python3 -c "
import os
import sys
try:
    import psycopg2
    url = os.environ.get('DATABASE_URL', '')
    # Convert async URL to sync for testing
    url = url.replace('postgresql+asyncpg://', 'postgresql://')
    url = url.replace('postgres://', 'postgresql://')
    conn = psycopg2.connect(url, connect_timeout=5)
    conn.close()
    print('Database connection successful!')
    sys.exit(0)
except Exception as e:
    print(f'Connection failed: {e}')
    sys.exit(1)
" 2>&1; then
            echo "PostgreSQL is ready!"
            return 0
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            echo "Waiting ${RETRY_DELAY}s before retry..."
            sleep $RETRY_DELAY
        fi
    done

    echo "WARNING: Could not connect to PostgreSQL after $MAX_RETRIES attempts"
    return 1
}

# Wait for PostgreSQL
if wait_for_postgres; then
    # Run database migrations (idempotent - safe to run every deploy)
    echo "Running database migrations..."
    if alembic upgrade head; then
        echo "Migrations completed successfully!"
    else
        echo "WARNING: Migrations failed, but continuing with server startup..."
        echo "The app may have limited functionality until database is available."
    fi
else
    echo "WARNING: PostgreSQL not available, skipping migrations."
    echo "The app will start but may have limited functionality."
fi

# Start Uvicorn web server (always start, even if DB is unavailable)
echo "Starting Uvicorn on port $PORT"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
