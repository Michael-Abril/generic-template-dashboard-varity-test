#!/bin/bash
# AI/RAG System Quick Fix Script
# Fixes Qdrant port configuration and installs missing embedding model

set -e

echo "=================================="
echo "AI/RAG System Quick Fix"
echo "=================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$SCRIPT_DIR/backend"

echo -e "${YELLOW}Step 1/3: Fixing Qdrant port configuration...${NC}"
echo ""

# Check if .env exists
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${RED}ERROR: .env file not found at $BACKEND_DIR/.env${NC}"
    exit 1
fi

# Backup .env
cp "$BACKEND_DIR/.env" "$BACKEND_DIR/.env.backup.$(date +%Y%m%d_%H%M%S)"
echo "✓ Backed up .env file"

# Fix Qdrant URL
if grep -q "QDRANT_URL=http://localhost:6333" "$BACKEND_DIR/.env"; then
    sed -i 's|QDRANT_URL=http://localhost:6333|QDRANT_URL=http://localhost:6334|' "$BACKEND_DIR/.env"
    echo -e "${GREEN}✓ Updated QDRANT_URL from 6333 to 6334${NC}"
else
    echo -e "${YELLOW}⚠ QDRANT_URL not found or already correct${NC}"
fi

echo ""
echo -e "${YELLOW}Step 2/3: Installing nomic-embed-text model...${NC}"
echo ""

# Check if Ollama is running
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo -e "${RED}ERROR: Ollama is not running on localhost:11434${NC}"
    echo "Please start Ollama first: ollama serve"
    exit 1
fi

# Check if model already exists
if curl -s http://localhost:11434/api/tags | grep -q "nomic-embed-text"; then
    echo -e "${GREEN}✓ nomic-embed-text already installed${NC}"
else
    echo "Pulling nomic-embed-text model (this may take 2-3 minutes)..."
    ollama pull nomic-embed-text
    echo -e "${GREEN}✓ nomic-embed-text installed successfully${NC}"
fi

echo ""
echo -e "${YELLOW}Step 3/3: Restarting backend service...${NC}"
echo ""

# Check if running in Docker
if docker ps | grep -q "generic-template-backend"; then
    echo "Restarting Docker backend service..."
    docker-compose restart backend
    echo -e "${GREEN}✓ Backend restarted (Docker)${NC}"
else
    echo -e "${YELLOW}⚠ Backend not running in Docker${NC}"
    echo "If running locally, please restart manually:"
    echo "  cd backend && uvicorn app.main:app --reload"
fi

echo ""
echo "=================================="
echo -e "${GREEN}✓ Fixes Applied Successfully!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Verify health: curl http://localhost:8000/api/v1/ai/health"
echo "2. Run tests: ./test_ai_rag_system.sh"
echo "3. Start frontend: npm run dev"
echo ""
echo "For detailed status, see: AI_RAG_SYSTEM_STATUS_REPORT.md"
