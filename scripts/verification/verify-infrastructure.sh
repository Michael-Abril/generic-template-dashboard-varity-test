#!/bin/bash

echo "🔍 Verifying Varity Local Infrastructure"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check PostgreSQL
echo "1️⃣ PostgreSQL Check"
echo "-------------------"
if docker ps | grep -q varity-postgres; then
    echo -e "${GREEN}✅ Container running${NC}"

    # Check database
    if docker exec varity-postgres psql -U varity -d varity -c "SELECT 1" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database accessible${NC}"

        # Count tables
        TABLE_COUNT=$(docker exec varity-postgres psql -U varity -d varity -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d ' ')
        echo -e "${GREEN}✅ Tables created: $TABLE_COUNT${NC}"

        # List tables
        echo "   Tables:"
        docker exec varity-postgres psql -U varity -d varity -c "\dt" | grep public | awk '{print "     - " $3}'
    else
        echo -e "${RED}❌ Database not accessible${NC}"
    fi
else
    echo -e "${RED}❌ Container not running${NC}"
fi
echo ""

# Check Redis
echo "2️⃣ Redis Check"
echo "--------------"
if docker ps | grep -q varity-redis; then
    echo -e "${GREEN}✅ Container running${NC}"

    # Check connectivity
    if docker exec varity-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis responding to PING${NC}"

        # Test read/write
        docker exec varity-redis redis-cli set test_verify "infrastructure_ok" > /dev/null 2>&1
        VALUE=$(docker exec varity-redis redis-cli get test_verify 2>/dev/null)
        if [ "$VALUE" = "infrastructure_ok" ]; then
            echo -e "${GREEN}✅ Read/write operations working${NC}"
        fi
    else
        echo -e "${RED}❌ Redis not responding${NC}"
    fi
else
    echo -e "${RED}❌ Container not running${NC}"
fi
echo ""

# Check Ollama
echo "3️⃣ Ollama Check"
echo "---------------"
if docker ps | grep -q varity-ollama-platform; then
    echo -e "${YELLOW}⚠️  Using external Ollama instance${NC}"
    echo "   Container: varity-ollama-platform"

    # List models
    MODELS=$(docker exec varity-ollama-platform ollama list 2>/dev/null | tail -n +2)
    if [ ! -z "$MODELS" ]; then
        echo -e "${GREEN}✅ Models available:${NC}"
        echo "$MODELS" | awk '{print "     - " $1 " (" $3 " " $4 ")"}'
    fi
else
    echo -e "${YELLOW}⚠️  No Ollama container found${NC}"
    echo "   Note: Ollama is optional for development"
fi
echo ""

# Check Docker network
echo "4️⃣ Network Check"
echo "----------------"
if docker network inspect varity-network > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Network 'varity-network' exists${NC}"

    # List connected containers
    CONTAINERS=$(docker network inspect varity-network -f '{{range .Containers}}{{.Name}} {{end}}')
    echo "   Connected containers:"
    for container in $CONTAINERS; do
        echo "     - $container"
    done
else
    echo -e "${RED}❌ Network 'varity-network' not found${NC}"
fi
echo ""

# Check volumes
echo "5️⃣ Volume Check"
echo "---------------"
for volume in postgres_data redis_data; do
    if docker volume inspect "generic-company-dashboard_$volume" > /dev/null 2>&1; then
        SIZE=$(docker volume inspect "generic-company-dashboard_$volume" -f '{{.Mountpoint}}' | xargs du -sh 2>/dev/null | awk '{print $1}')
        echo -e "${GREEN}✅ Volume: $volume ($SIZE)${NC}"
    else
        echo -e "${RED}❌ Volume: $volume not found${NC}"
    fi
done
echo ""

# Summary
echo "=========================================="
echo "📊 Infrastructure Summary"
echo "=========================================="
echo ""

# Count operational services
POSTGRES_OK=0
REDIS_OK=0

if docker ps | grep -q varity-postgres && docker exec varity-postgres psql -U varity -d varity -c "SELECT 1" > /dev/null 2>&1; then
    POSTGRES_OK=1
fi

if docker ps | grep -q varity-redis && docker exec varity-redis redis-cli ping > /dev/null 2>&1; then
    REDIS_OK=1
fi

TOTAL=$((POSTGRES_OK + REDIS_OK))

if [ $TOTAL -eq 2 ]; then
    echo -e "${GREEN}✅ All critical services operational ($TOTAL/2)${NC}"
    echo ""
    echo "Ready for development! 🚀"
    echo ""
    echo "Access URLs:"
    echo "  - PostgreSQL: localhost:5432 (database: varity)"
    echo "  - Redis: localhost:6379"
    echo "  - Ollama: localhost:11434 (external instance)"
    echo ""
    echo "Next steps:"
    echo "  1. cd backend && uvicorn main:app --reload"
    echo "  2. npm run dev"
    exit 0
else
    echo -e "${RED}❌ Some services are not operational ($TOTAL/2)${NC}"
    echo ""
    echo "To fix issues:"
    echo "  1. Run: docker-compose down -v"
    echo "  2. Run: ./start-infrastructure.sh"
    echo "  3. Run: ./verify-infrastructure.sh"
    exit 1
fi
