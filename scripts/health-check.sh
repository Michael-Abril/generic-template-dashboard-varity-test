#!/bin/bash
set -e

# ==============================================================================
# VARITY L3 HEALTH CHECK SCRIPT
# ==============================================================================
# Performs comprehensive health checks on all deployed services
# ==============================================================================

echo "🏥 Running Varity L3 Generic Dashboard Health Checks..."
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check status
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# Function to check HTTP endpoint
check_http() {
  local name=$1
  local url=$2
  local expected_code=${3:-200}

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -n "   Checking $name... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" --max-time 10 || echo "000")

  if [ "$HTTP_CODE" -eq "$expected_code" ]; then
    echo -e "${GREEN}✅ Healthy${NC} (HTTP $HTTP_CODE)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌ Down${NC} (HTTP $HTTP_CODE)"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

# Function to check JSON-RPC endpoint
check_rpc() {
  local name=$1
  local url=$2

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

  echo -n "   Checking $name... "

  RESPONSE=$(curl -s -X POST "$url" \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    --max-time 10 || echo "")

  if echo "$RESPONSE" | grep -q '"result"'; then
    BLOCK_HEX=$(echo "$RESPONSE" | grep -o '"result":"[^"]*' | cut -d'"' -f4)
    BLOCK_NUM=$((BLOCK_HEX))
    echo -e "${GREEN}✅ Healthy${NC} (Block: $BLOCK_NUM)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
    return 0
  else
    echo -e "${RED}❌ Down${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
    return 1
  fi
}

# ==============================================================================
# CHECK 1: FRONTEND (IPFS/FILECOIN)
# ==============================================================================
echo "1️⃣  Frontend Health Check"
echo "─────────────────────────────────────────────────────────────────"

# Check if deployment-info.json exists
if [ -f "deployment-info.json" ]; then
  IPFS_HASH=$(cat deployment-info.json | grep -o '"ipfsHash":"[^"]*' | cut -d'"' -f4)
  FRONTEND_URL=$(cat deployment-info.json | grep -o '"pinataGateway":"[^"]*' | cut -d'"' -f4)

  if [ -n "$FRONTEND_URL" ]; then
    check_http "Frontend (IPFS)" "$FRONTEND_URL"
    check_http "Frontend (Cloudflare)" "https://cloudflare-ipfs.com/ipfs/$IPFS_HASH"
  else
    echo -e "   ${YELLOW}⚠️  Frontend not deployed${NC}"
    echo "   Run: ./scripts/deploy-frontend.sh"
  fi
else
  echo -e "   ${YELLOW}⚠️  Frontend deployment info not found${NC}"
  echo "   Run: ./scripts/deploy-frontend.sh"
fi

echo ""

# ==============================================================================
# CHECK 2: BACKEND API (AKASH NETWORK)
# ==============================================================================
echo "2️⃣  Backend API Health Check"
echo "─────────────────────────────────────────────────────────────────"

# Check if backend-deployment-info.json exists
if [ -f "backend-deployment-info.json" ]; then
  API_URL=$(cat backend-deployment-info.json | grep -o '"apiUrl":"[^"]*' | cut -d'"' -f4)

  if [ -n "$API_URL" ] && [ "$API_URL" != "<pending>" ] && [ "$API_URL" != "<deploy-to-akash-first>" ]; then
    check_http "Backend API" "$API_URL/health"
    check_http "Backend Docs" "$API_URL/docs" 200
  else
    echo -e "   ${YELLOW}⚠️  Backend not deployed or pending${NC}"
    echo "   Run: ./scripts/deploy-backend.sh"
  fi
else
  echo -e "   ${YELLOW}⚠️  Backend deployment info not found${NC}"
  echo "   Run: ./scripts/deploy-backend.sh"
fi

echo ""

# ==============================================================================
# CHECK 3: VARITY L3 BLOCKCHAIN
# ==============================================================================
echo "3️⃣  Varity L3 Blockchain Health Check"
echo "─────────────────────────────────────────────────────────────────"

# Load environment variables
if [ -f ".env" ]; then
  export $(grep -v '^#' .env | xargs 2>/dev/null || true)
fi

VARITY_RPC_URL=${VARITY_RPC_URL:-"https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz"}
VARITY_EXPLORER_URL=${VARITY_EXPLORER_URL:-"https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz"}

check_rpc "Varity L3 RPC" "$VARITY_RPC_URL"
check_http "Varity L3 Explorer" "$VARITY_EXPLORER_URL"

echo ""

# ==============================================================================
# CHECK 4: SMART CONTRACTS
# ==============================================================================
echo "4️⃣  Smart Contracts Health Check"
echo "─────────────────────────────────────────────────────────────────"

# Check if contracts are deployed
if [ -d "contracts/deployments/varity-l3-testnet" ]; then
  CONTRACT_COUNT=$(ls -1 contracts/deployments/varity-l3-testnet/*.json 2>/dev/null | wc -l || echo "0")

  if [ "$CONTRACT_COUNT" -gt 0 ]; then
    echo -e "   ${GREEN}✅ Contracts Deployed${NC} ($CONTRACT_COUNT contracts found)"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))

    # List deployed contracts
    echo "   Deployed Contracts:"
    for contract_file in contracts/deployments/varity-l3-testnet/*.json; do
      if [ -f "$contract_file" ]; then
        CONTRACT_NAME=$(basename "$contract_file" .json)
        CONTRACT_ADDRESS=$(cat "$contract_file" | grep -o '"address":"[^"]*' | cut -d'"' -f4 | head -1)
        if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "null" ]; then
          echo "     - $CONTRACT_NAME: $CONTRACT_ADDRESS"
        fi
      fi
    done
  else
    echo -e "   ${RED}❌ No contracts deployed${NC}"
    echo "   Run: ./scripts/deploy-contracts.sh"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
else
  echo -e "   ${YELLOW}⚠️  Contract deployments directory not found${NC}"
  echo "   Run: ./scripts/deploy-contracts.sh"
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

echo ""

# ==============================================================================
# CHECK 5: DATABASE CONNECTION (IF CONFIGURED)
# ==============================================================================
echo "5️⃣  Database Health Check"
echo "─────────────────────────────────────────────────────────────────"

if [ -n "$DATABASE_URL" ]; then
  # Try to connect to database using psql (if available)
  if command -v psql &> /dev/null; then
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    echo -n "   Checking Database Connection... "

    if psql "$DATABASE_URL" -c "SELECT 1;" &> /dev/null; then
      echo -e "${GREEN}✅ Connected${NC}"
      PASSED_CHECKS=$((PASSED_CHECKS + 1))
    else
      echo -e "${RED}❌ Connection Failed${NC}"
      FAILED_CHECKS=$((FAILED_CHECKS + 1))
    fi
  else
    echo -e "   ${YELLOW}⚠️  psql not installed - skipping database check${NC}"
  fi
else
  echo -e "   ${YELLOW}⚠️  DATABASE_URL not configured${NC}"
fi

echo ""

# ==============================================================================
# CHECK 6: STORAGE (PINATA/FILECOIN)
# ==============================================================================
echo "6️⃣  Storage Provider Health Check"
echo "─────────────────────────────────────────────────────────────────"

if [ -n "$PINATA_API_KEY" ] && [ -n "$PINATA_SECRET_KEY" ]; then
  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "   Checking Pinata API... "

  PINATA_RESPONSE=$(curl -s "https://api.pinata.cloud/data/testAuthentication" \
    -H "pinata_api_key: $PINATA_API_KEY" \
    -H "pinata_secret_api_key: $PINATA_SECRET_KEY" || echo "")

  if echo "$PINATA_RESPONSE" | grep -q "Congratulations"; then
    echo -e "${GREEN}✅ Authenticated${NC}"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
  else
    echo -e "${RED}❌ Authentication Failed${NC}"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
  fi
else
  echo -e "   ${YELLOW}⚠️  Pinata credentials not configured${NC}"
fi

echo ""

# ==============================================================================
# HEALTH CHECK SUMMARY
# ==============================================================================
echo "═══════════════════════════════════════════════════════════════════"
echo "HEALTH CHECK SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))

echo "Total Checks:    $TOTAL_CHECKS"
echo -e "Passed:          ${GREEN}$PASSED_CHECKS${NC}"
echo -e "Failed:          ${RED}$FAILED_CHECKS${NC}"
echo "Success Rate:    $PASS_RATE%"
echo ""

if [ "$FAILED_CHECKS" -eq 0 ]; then
  echo -e "${GREEN}✅ ALL SYSTEMS OPERATIONAL${NC}"
  echo ""
  exit 0
elif [ "$PASS_RATE" -ge 75 ]; then
  echo -e "${YELLOW}⚠️  SOME SYSTEMS DOWN - PARTIAL OPERATION${NC}"
  echo ""
  echo "Review failed checks above and deploy missing services"
  exit 1
else
  echo -e "${RED}❌ CRITICAL FAILURES DETECTED${NC}"
  echo ""
  echo "Multiple systems are down. Please deploy services:"
  echo "  - Frontend:  ./scripts/deploy-frontend.sh"
  echo "  - Backend:   ./scripts/deploy-backend.sh"
  echo "  - Contracts: ./scripts/deploy-contracts.sh"
  exit 2
fi
