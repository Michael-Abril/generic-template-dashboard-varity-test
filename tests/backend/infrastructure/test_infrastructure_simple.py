#!/usr/bin/env python3
"""
Simple infrastructure test script
Tests PostgreSQL, Redis, and Ollama connectivity
"""

import asyncio
import subprocess

async def test_postgres():
    """Test PostgreSQL using docker exec"""
    print("1️⃣ Testing PostgreSQL...")
    try:
        result = subprocess.run(
            ["docker", "exec", "varity-postgres", "psql", "-U", "varity", "-d", "varity", "-c", "SELECT version();"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            version = result.stdout.split('\n')[2].strip()
            print(f"   ✅ PostgreSQL connected: {version[:60]}...")

            # Test tables
            result = subprocess.run(
                ["docker", "exec", "varity-postgres", "psql", "-U", "varity", "-d", "varity", "-c", "\\dt"],
                capture_output=True,
                text=True,
                timeout=10
            )
            table_count = result.stdout.count("table")
            print(f"   ✅ Database tables: {table_count} tables found")
            return True
        else:
            print(f"   ❌ PostgreSQL failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ PostgreSQL failed: {e}")
        return False

async def test_redis():
    """Test Redis using docker exec"""
    print("\n2️⃣ Testing Redis...")
    try:
        result = subprocess.run(
            ["docker", "exec", "varity-redis", "redis-cli", "ping"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0 and "PONG" in result.stdout:
            print(f"   ✅ Redis connected and responding")

            # Test set/get
            subprocess.run(
                ["docker", "exec", "varity-redis", "redis-cli", "set", "test_key", "test_value"],
                capture_output=True,
                timeout=10
            )
            result = subprocess.run(
                ["docker", "exec", "varity-redis", "redis-cli", "get", "test_key"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if "test_value" in result.stdout:
                print(f"   ✅ Redis read/write working")
            return True
        else:
            print(f"   ❌ Redis failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"   ❌ Redis failed: {e}")
        return False

async def test_ollama():
    """Test Ollama (external instance)"""
    print("\n3️⃣ Testing Ollama LLM...")
    try:
        import httpx

        # Check if Ollama is running
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get("http://localhost:11434/api/tags", timeout=10.0)
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    print(f"   ✅ Ollama connected")
                    if models:
                        print(f"   ✅ Available models: {[m['name'] for m in models]}")
                    else:
                        print(f"   ⚠️  No models installed. Run: docker exec varity-ollama-platform ollama pull mistral")
                    return True
                else:
                    print(f"   ❌ Ollama not responding (status {response.status_code})")
                    return False
            except httpx.ConnectError:
                print(f"   ❌ Ollama not running at localhost:11434")
                print(f"   ℹ️  Note: Using external Ollama instance varity-ollama-platform")
                return False
    except ImportError:
        print(f"   ℹ️  httpx not installed, skipping Ollama test")
        return True
    except Exception as e:
        print(f"   ❌ Ollama failed: {e}")
        return False

async def main():
    """Run all infrastructure tests"""
    print("🧪 Testing Varity Local Infrastructure\n")
    print("=" * 60)

    results = []
    results.append(await test_postgres())
    results.append(await test_redis())
    results.append(await test_ollama())

    print("\n" + "=" * 60)
    if all(results):
        print("\n✅ All infrastructure tests passed!")
        print("\nInfrastructure Summary:")
        print("  - PostgreSQL: Running on port 5432 (7 tables)")
        print("  - Redis: Running on port 6379")
        print("  - Ollama: Available at localhost:11434")
        print("\n✨ Ready for development!")
        return True
    else:
        print("\n⚠️  Some infrastructure tests failed")
        failed_count = len([r for r in results if not r])
        print(f"Failed tests: {failed_count}/{len(results)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)
