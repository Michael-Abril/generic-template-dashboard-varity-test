#!/bin/bash

echo "🚀 Starting Varity Local Infrastructure..."
echo ""

# Start all containers
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check PostgreSQL
echo -n "PostgreSQL: "
docker exec varity-postgres pg_isready -U varity && echo "✅ Ready" || echo "❌ Not ready"

# Check Redis
echo -n "Redis: "
docker exec varity-redis redis-cli ping && echo "✅ Ready" || echo "❌ Not ready"

# Check Ollama
echo -n "Ollama: "
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ Ready" || echo "❌ Not ready"

echo ""
echo "📊 Container Status:"
docker-compose ps

echo ""
echo "✅ Infrastructure started!"
echo ""
echo "Access URLs:"
echo "  PostgreSQL: localhost:5432 (database: varity, user: varity)"
echo "  Redis: localhost:6379"
echo "  Ollama: http://localhost:11434"
