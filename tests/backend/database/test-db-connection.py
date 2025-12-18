#!/usr/bin/env python3
"""
Test script for Varity local infrastructure connections.
Tests PostgreSQL, Redis, and Ollama services.
"""

import os
import sys
from typing import Tuple

def test_postgresql() -> Tuple[bool, str]:
    """Test PostgreSQL connection and verify database setup."""
    try:
        import psycopg2
        from psycopg2 import sql

        # Get credentials from environment or use defaults
        db_name = os.getenv("POSTGRES_DB", "varity_dashboard")
        db_user = os.getenv("POSTGRES_USER", "varity")
        db_password = os.getenv("POSTGRES_PASSWORD", "varity_secure_2024")
        db_host = os.getenv("POSTGRES_HOST", "localhost")
        db_port = os.getenv("POSTGRES_PORT", "5432")

        # Connect to database
        conn = psycopg2.connect(
            dbname=db_name,
            user=db_user,
            password=db_password,
            host=db_host,
            port=db_port
        )
        cursor = conn.cursor()

        # Get PostgreSQL version
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        version_short = version.split(',')[0]

        # Count tables
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_schema = 'public'
        """)
        table_count = cursor.fetchone()[0]

        # Get table names
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        tables = [row[0] for row in cursor.fetchall()]

        cursor.close()
        conn.close()

        result = f"✓ PostgreSQL connected\n"
        result += f"  Version: {version_short}\n"
        result += f"  Database: {db_name}\n"
        result += f"  Tables: {table_count}\n"
        if tables:
            result += f"  Table names: {', '.join(tables)}"

        return True, result

    except ImportError:
        return False, "✗ PostgreSQL test failed: psycopg2 not installed (pip install psycopg2-binary)"
    except Exception as e:
        return False, f"✗ PostgreSQL connection failed: {str(e)}"


def test_redis() -> Tuple[bool, str]:
    """Test Redis connection and basic operations."""
    try:
        import redis

        # Get Redis connection details
        redis_host = os.getenv("REDIS_HOST", "localhost")
        redis_port = int(os.getenv("REDIS_PORT", "6379"))

        # Connect to Redis
        r = redis.Redis(host=redis_host, port=redis_port, decode_responses=True)

        # Test ping
        r.ping()

        # Test basic operations
        r.set('varity_test', 'connection_successful')
        test_value = r.get('varity_test')
        r.delete('varity_test')

        # Get Redis info
        info = r.info()
        redis_version = info.get('redis_version', 'unknown')

        result = f"✓ Redis connected\n"
        result += f"  Version: {redis_version}\n"
        result += f"  Host: {redis_host}:{redis_port}\n"
        result += f"  Test write/read: {'✓ Passed' if test_value == 'connection_successful' else '✗ Failed'}"

        return True, result

    except ImportError:
        return False, "✗ Redis test failed: redis not installed (pip install redis)"
    except Exception as e:
        return False, f"✗ Redis connection failed: {str(e)}"


def test_ollama() -> Tuple[bool, str]:
    """Test Ollama LLM service."""
    try:
        import httpx

        # Get Ollama connection details
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

        # Test connection
        response = httpx.get(f"{ollama_url}/", timeout=5.0)

        if response.status_code != 200:
            return False, f"✗ Ollama returned status {response.status_code}"

        # List available models
        try:
            models_response = httpx.get(f"{ollama_url}/api/tags", timeout=5.0)
            if models_response.status_code == 200:
                models_data = models_response.json()
                models = models_data.get('models', [])
                model_names = [m.get('name', 'unknown') for m in models]
            else:
                model_names = []
        except:
            model_names = []

        result = f"✓ Ollama connected\n"
        result += f"  URL: {ollama_url}\n"
        result += f"  Status: Running\n"
        if model_names:
            result += f"  Available models: {', '.join(model_names)}"
        else:
            result += f"  Available models: None (run ./scripts/setup-ollama.sh to download)"

        return True, result

    except ImportError:
        return False, "✗ Ollama test failed: httpx not installed (pip install httpx)"
    except Exception as e:
        return False, f"✗ Ollama connection failed: {str(e)}"


def main():
    """Run all infrastructure tests."""
    print("=" * 60)
    print("  Varity Infrastructure Connection Tests")
    print("=" * 60)
    print()

    # Load environment variables from .env.local if it exists
    env_file = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_file):
        print(f"Loading environment from: {env_file}")
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key] = value
        print()

    # Run tests
    tests = [
        ("PostgreSQL", test_postgresql),
        ("Redis", test_redis),
        ("Ollama", test_ollama),
    ]

    results = []
    for name, test_func in tests:
        print(f"Testing {name}...")
        success, message = test_func()
        results.append((name, success, message))
        print(message)
        print()

    # Summary
    print("=" * 60)
    passed = sum(1 for _, success, _ in results if success)
    total = len(results)

    if passed == total:
        print(f"✓ All infrastructure services are working! ({passed}/{total})")
        print()
        print("Next steps:")
        print("  1. If Ollama has no models, run: ./scripts/setup-ollama.sh")
        print("  2. Start your backend application")
        print("  3. Check service logs: docker-compose logs")
        return 0
    else:
        print(f"✗ Some services failed ({passed}/{total} passed)")
        print()
        print("Failed services:")
        for name, success, _ in results:
            if not success:
                print(f"  - {name}")
        print()
        print("Troubleshooting:")
        print("  1. Ensure services are running: docker-compose ps")
        print("  2. Check service logs: docker-compose logs <service-name>")
        print("  3. Restart services: ./scripts/start-infrastructure.sh")
        return 1

    print("=" * 60)


if __name__ == "__main__":
    sys.exit(main())
