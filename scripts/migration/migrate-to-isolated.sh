#!/bin/bash
# Migration script to isolate Generic Template Dashboard containers
# This script safely migrates from varity-* containers to generic-template-* containers

echo "🔄 Starting migration to isolated Generic Template Dashboard..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop existing varity containers (if they exist)
echo -e "${YELLOW}📦 Step 1: Stopping existing containers...${NC}"
docker stop varity-postgres varity-redis varity-ollama varity-qdrant varity-backend 2>/dev/null || echo "No existing containers to stop"

# Step 2: Remove old containers (preserve data)
echo -e "${YELLOW}📦 Step 2: Removing old containers (data preserved)...${NC}"
docker rm varity-postgres varity-redis varity-ollama varity-qdrant varity-backend 2>/dev/null || echo "No containers to remove"

# Step 3: Check for port conflicts
echo -e "${YELLOW}🔍 Step 3: Checking for port conflicts...${NC}"

# Check if new ports are available
ports_to_check=(5433 6380 11435 6334 6335 8001)
port_names=("PostgreSQL" "Redis" "Ollama" "Qdrant-HTTP" "Qdrant-gRPC" "Backend")
conflicts=0

for i in "${!ports_to_check[@]}"; do
    port="${ports_to_check[$i]}"
    name="${port_names[$i]}"
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port ($name) is already in use!${NC}"
        conflicts=$((conflicts + 1))
    else
        echo -e "${GREEN}✅ Port $port ($name) is available${NC}"
    fi
done

if [ $conflicts -gt 0 ]; then
    echo -e "${RED}⚠️  Port conflicts detected. Please free up the ports before continuing.${NC}"
    exit 1
fi

# Step 4: Pull latest images
echo -e "${YELLOW}📥 Step 4: Pulling latest Docker images...${NC}"
docker-compose pull

# Step 5: Start new isolated stack
echo -e "${YELLOW}🚀 Step 5: Starting isolated Generic Template Dashboard...${NC}"
docker-compose up -d

# Step 6: Wait for services to be healthy
echo -e "${YELLOW}⏳ Step 6: Waiting for services to be healthy...${NC}"
sleep 5

# Check if containers are running
echo -e "${YELLOW}🔍 Verifying containers...${NC}"
docker ps --filter "label=varity.template=generic" --format "table {{.Names}}\t{{.Status}}"

# Step 7: Initialize Ollama with mistral model
echo -e "${YELLOW}🤖 Step 7: Ensuring Mistral model is available...${NC}"
docker exec generic-template-ollama ollama pull mistral 2>/dev/null || echo "Mistral model might already be present"

# Step 8: Create Qdrant collections
echo -e "${YELLOW}🗂️ Step 8: Initializing Qdrant collections...${NC}"
# Wait for Qdrant to be ready
sleep 3

# Create default collection for business data
curl -X PUT "http://localhost:6334/collections/business_data" \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 768,
      "distance": "Cosine"
    },
    "optimizers_config": {
      "default_segment_number": 2
    }
  }' 2>/dev/null || echo "Collection might already exist"

echo ""
echo -e "${GREEN}✨ Migration Complete!${NC}"
echo "================================================"
echo ""
echo "🎯 Generic Template Dashboard is now isolated and running on:"
echo "  • PostgreSQL: localhost:5433"
echo "  • Redis: localhost:6380"
echo "  • Ollama (Mistral): localhost:11435"
echo "  • Qdrant: localhost:6334 (HTTP), localhost:6335 (gRPC)"
echo "  • Backend API: localhost:8001"
echo ""
echo "📋 View grouped containers in Docker Desktop under 'Generic Template Dashboard'"
echo ""
echo "🔍 To verify isolation, run: ./verify-isolation.sh"