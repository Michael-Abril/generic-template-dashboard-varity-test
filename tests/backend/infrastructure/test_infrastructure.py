import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_redis, engine
from app.services.ollama_service import OllamaService
from sqlalchemy import text

async def test_infrastructure():
    """Test all local infrastructure components"""

    print("🧪 Testing Local Infrastructure\n")

    # Test PostgreSQL
    print("1️⃣ Testing PostgreSQL...")
    try:
        async with engine.begin() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"   ✅ PostgreSQL connected: {version[:50]}...\n")
    except Exception as e:
        print(f"   ❌ PostgreSQL failed: {e}\n")
        return False

    # Test Redis
    print("2️⃣ Testing Redis...")
    try:
        redis = await get_redis()
        await redis.set("test_key", "test_value")
        value = await redis.get("test_key")
        assert value == "test_value"
        print(f"   ✅ Redis connected and working\n")
    except Exception as e:
        print(f"   ❌ Redis failed: {e}\n")
        return False

    # Test Ollama
    print("3️⃣ Testing Ollama LLM...")
    try:
        ollama = OllamaService()

        # Check if Ollama is running
        is_healthy = await ollama.health_check()
        if not is_healthy:
            print("   ❌ Ollama is not running\n")
            return False

        # List models
        models = await ollama.list_models()
        print(f"   Available models: {[m['name'] for m in models]}")

        # Test query
        response = await ollama.query("What is 2+2?")
        print(f"   ✅ Ollama response: {response[:100]}...\n")
    except Exception as e:
        print(f"   ❌ Ollama failed: {e}\n")
        return False

    print("✅ All infrastructure tests passed!\n")
    return True

if __name__ == "__main__":
    asyncio.run(test_infrastructure())
