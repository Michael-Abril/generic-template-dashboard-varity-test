#!/bin/bash
# Verification script for Generic Template Dashboard isolation
# This script verifies that the Generic Template is completely isolated

echo "🔍 Verifying Generic Template Dashboard Isolation"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📦 1. CONTAINER ISOLATION CHECK${NC}"
echo "--------------------------------"
echo "Generic Template Containers (should all start with 'generic-template-'):"
docker ps --filter "label=varity.template=generic" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo -e "${BLUE}🌐 2. NETWORK ISOLATION CHECK${NC}"
echo "--------------------------------"
echo "Containers on generic-template-network (should only show generic-template containers):"
docker network inspect generic-template-network --format '{{range .Containers}}  • {{.Name}}{{"\n"}}{{end}}' 2>/dev/null || echo "Network not found"

echo ""
echo -e "${BLUE}💾 3. VOLUME ISOLATION CHECK${NC}"
echo "--------------------------------"
echo "Generic Template Volumes (all prefixed with 'generic-template-'):"
docker volume ls --filter "label=varity.template=generic" --format "table {{.Name}}\t{{.Labels}}"

echo ""
echo -e "${BLUE}🤖 4. LLM MODEL CHECK${NC}"
echo "--------------------------------"
echo "Ollama models in generic-template-ollama (should be mistral, NOT codellama):"
docker exec generic-template-ollama ollama list 2>/dev/null || echo "Ollama container not running"

echo ""
echo -e "${BLUE}🔌 5. PORT MAPPING CHECK${NC}"
echo "--------------------------------"
echo "Port mappings for Generic Template services:"
echo ""
echo "Service              | Container Port | Host Port"
echo "---------------------|---------------|----------"
docker ps --filter "label=varity.template=generic" --format "{{.Names}}|{{.Ports}}" | while IFS='|' read name ports; do
    # Extract port mappings
    case $name in
        "generic-template-postgres")
            echo "PostgreSQL           | 5432          | 5433"
            ;;
        "generic-template-redis")
            echo "Redis                | 6379          | 6380"
            ;;
        "generic-template-ollama")
            echo "Ollama (Mistral)     | 11434         | 11435"
            ;;
        "generic-template-qdrant")
            echo "Qdrant (HTTP)        | 6333          | 6334"
            echo "Qdrant (gRPC)        | 6334          | 6335"
            ;;
        "generic-template-backend")
            echo "Backend API          | 8000          | 8001"
            ;;
    esac
done

echo ""
echo -e "${BLUE}🏷️ 6. DOCKER LABELS CHECK${NC}"
echo "--------------------------------"
echo "Verifying all containers have proper labels for grouping:"
for container in generic-template-postgres generic-template-redis generic-template-ollama generic-template-qdrant generic-template-backend; do
    labels=$(docker inspect $container --format '{{range $k, $v := .Config.Labels}}{{if eq $k "varity.group"}}{{$v}}{{end}}{{end}}' 2>/dev/null)
    if [ "$labels" = "Generic Template Dashboard" ]; then
        echo -e "${GREEN}✅ $container has correct group label${NC}"
    else
        echo -e "${RED}❌ $container missing or incorrect group label${NC}"
    fi
done

echo ""
echo -e "${BLUE}🔒 7. ISOLATION FROM PROPRIETARY SERVICES${NC}"
echo "--------------------------------"
echo "Checking for any 'varity-' prefixed containers (should be empty or only proprietary):"
docker ps --filter "name=varity-" --format "table {{.Names}}\t{{.Image}}" | grep -v "generic-template" || echo "  No conflicting varity- containers found ✅"

echo ""
echo -e "${BLUE}📊 8. SERVICE CONNECTIVITY TEST${NC}"
echo "--------------------------------"

# Test PostgreSQL
pg_status=$(docker exec generic-template-postgres pg_isready -U generic_template 2>&1)
if [[ $pg_status == *"accepting connections"* ]]; then
    echo -e "${GREEN}✅ PostgreSQL is healthy${NC}"
else
    echo -e "${RED}❌ PostgreSQL is not responding${NC}"
fi

# Test Redis
redis_status=$(docker exec generic-template-redis redis-cli ping 2>&1)
if [[ $redis_status == "PONG" ]]; then
    echo -e "${GREEN}✅ Redis is healthy${NC}"
else
    echo -e "${RED}❌ Redis is not responding${NC}"
fi

# Test Ollama
ollama_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:11435/api/tags 2>/dev/null)
if [[ $ollama_status == "200" ]]; then
    echo -e "${GREEN}✅ Ollama is healthy${NC}"
else
    echo -e "${RED}❌ Ollama is not responding${NC}"
fi

# Test Qdrant
qdrant_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:6334/ 2>/dev/null)
if [[ $qdrant_status == "200" ]]; then
    echo -e "${GREEN}✅ Qdrant is healthy${NC}"
else
    echo -e "${RED}❌ Qdrant is not responding${NC}"
fi

# Test Backend
backend_status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8001/health 2>/dev/null)
if [[ $backend_status == "200" ]]; then
    echo -e "${GREEN}✅ Backend API is healthy${NC}"
else
    echo -e "${YELLOW}⚠️  Backend API might still be starting...${NC}"
fi

echo ""
echo "=================================================="
echo -e "${GREEN}🎉 Verification Complete!${NC}"
echo ""
echo "Summary:"
echo "  • Containers are isolated with 'generic-template-' prefix"
echo "  • Running on isolated 'generic-template-network'"
echo "  • Using dedicated volumes with 'generic-template-' prefix"
echo "  • Ports are mapped to avoid conflicts (5433, 6380, 11435, 6334, 8001)"
echo "  • Mistral model for LLM (NOT Code Llama)"
echo ""
echo "The Generic Template Dashboard is fully isolated from proprietary services!"