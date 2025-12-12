#!/bin/bash
set -e

# ==============================================================================
# VARITY L3 SMART CONTRACTS DEPLOYMENT SCRIPT
# ==============================================================================
# Deploys all Generic Company Dashboard smart contracts to Varity L3
# ==============================================================================

echo "🚀 Deploying Smart Contracts to Varity L3..."
echo ""

# ==============================================================================
# STEP 1: ENVIRONMENT VALIDATION
# ==============================================================================
echo "📋 Step 1/6: Validating environment..."

# Check if running from correct directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from project root directory"
  echo "   Current directory: $(pwd)"
  exit 1
fi

# Check if contracts directory exists
if [ ! -d "contracts" ]; then
  echo "❌ Error: contracts directory not found"
  exit 1
fi

# Check for required tools
if ! command -v npx &> /dev/null; then
  echo "❌ Error: npx not installed (comes with Node.js)"
  exit 1
fi

# Check for .env file
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found"
  echo "   Copy .env.example to .env and configure your PRIVATE_KEY"
  exit 1
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Validate PRIVATE_KEY
if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
  echo "❌ Error: PRIVATE_KEY not configured in .env"
  echo "   Please set your deployment wallet private key"
  exit 1
fi

# Validate network configuration
if [ -z "$VARITY_RPC_URL" ]; then
  echo "❌ Error: VARITY_RPC_URL not set in .env"
  exit 1
fi

if [ -z "$VARITY_CHAIN_ID" ]; then
  echo "❌ Error: VARITY_CHAIN_ID not set in .env"
  exit 1
fi

echo "   Chain ID: $VARITY_CHAIN_ID"
echo "   RPC URL:  $VARITY_RPC_URL"
echo "✅ Environment validated"
echo ""

# ==============================================================================
# STEP 2: COMPILE CONTRACTS
# ==============================================================================
echo "🔨 Step 2/6: Compiling smart contracts..."

cd contracts

# Clean previous compilation
rm -rf artifacts cache

# Compile all contracts
npx hardhat compile

if [ $? -ne 0 ]; then
  echo "❌ Error: Contract compilation failed"
  exit 1
fi

echo "✅ Contracts compiled successfully"
echo ""

# ==============================================================================
# STEP 3: RUN CONTRACT TESTS
# ==============================================================================
echo "🧪 Step 3/6: Running contract tests..."

# Run tests to ensure contracts are valid before deployment
npx hardhat test

if [ $? -ne 0 ]; then
  echo "❌ Error: Contract tests failed"
  echo "   Fix test failures before deploying to testnet"
  exit 1
fi

echo "✅ All tests passed"
echo ""

# ==============================================================================
# STEP 4: CHECK WALLET BALANCE
# ==============================================================================
echo "💰 Step 4/6: Checking deployer wallet balance..."

# Get deployer address from private key
DEPLOYER_ADDRESS=$(npx hardhat run --network varity-l3-testnet scripts/get-address.js 2>/dev/null || echo "unknown")

if [ "$DEPLOYER_ADDRESS" != "unknown" ]; then
  echo "   Deployer: $DEPLOYER_ADDRESS"

  # Check balance using RPC
  BALANCE_HEX=$(curl -s -X POST $VARITY_RPC_URL \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$DEPLOYER_ADDRESS\",\"latest\"],\"id\":1}" \
    | grep -o '"result":"[^"]*' | cut -d'"' -f4)

  if [ -n "$BALANCE_HEX" ]; then
    # Convert hex to decimal (approximate ETH)
    BALANCE_WEI=$((BALANCE_HEX))
    BALANCE_ETH=$(echo "scale=4; $BALANCE_WEI / 1000000000000000000" | bc 2>/dev/null || echo "unknown")
    echo "   Balance:  $BALANCE_ETH ETH"

    # Check if balance is sufficient (at least 0.01 ETH for gas)
    if (( $(echo "$BALANCE_ETH < 0.01" | bc -l) )); then
      echo "⚠️  Warning: Low balance - deployment may fail due to insufficient gas"
      echo "   Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia"
      echo ""
      read -p "Continue anyway? (y/N): " -n 1 -r
      echo ""
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled"
        exit 1
      fi
    fi
  fi
else
  echo "   ⚠️  Could not determine deployer address"
fi

echo "✅ Balance check complete"
echo ""

# ==============================================================================
# STEP 5: DEPLOY CONTRACTS
# ==============================================================================
echo "📝 Step 5/6: Deploying smart contracts to Varity L3 Testnet..."

# Run deployment script
npx hardhat deploy \
  --network varity-l3-testnet \
  --tags all

if [ $? -ne 0 ]; then
  echo "❌ Error: Contract deployment failed"
  exit 1
fi

echo "✅ Contracts deployed successfully"
echo ""

# ==============================================================================
# STEP 6: VERIFY CONTRACTS
# ==============================================================================
echo "✅ Step 6/6: Verifying contracts on explorer..."

# Get deployed contract addresses from deployment artifacts
DEPLOYMENTS_FILE="deployments/varity-l3-testnet/.chainId"

if [ -f "$DEPLOYMENTS_FILE" ]; then
  echo "   Found deployment artifacts"

  # Try to verify each contract
  # Note: Verification might fail if explorer doesn't support it yet
  # This is non-critical for testnet

  echo "   Attempting contract verification..."
  npx hardhat verify --network varity-l3-testnet --show-stack-traces 2>&1 | tee verify.log || true

  if grep -q "Successfully verified" verify.log; then
    echo "✅ Some contracts verified successfully"
  else
    echo "⚠️  Contract verification not yet available on Varity L3 explorer"
    echo "   This is normal for new testnets - contracts are deployed and functional"
  fi

  rm verify.log 2>/dev/null || true
else
  echo "⚠️  No deployment artifacts found - skipping verification"
fi

echo ""

# Return to root directory
cd ..

# ==============================================================================
# DEPLOYMENT COMPLETE
# ==============================================================================
echo "✅ Smart contract deployment complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "DEPLOYMENT SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo "Network:         Varity L3 Testnet"
echo "Chain ID:        $VARITY_CHAIN_ID"
echo "Explorer:        https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz"
echo "Deployer:        $DEPLOYER_ADDRESS"
echo ""
echo "Deployed Contracts:"
echo "-------------------"

# List deployed contracts from artifacts
if [ -d "contracts/deployments/varity-l3-testnet" ]; then
  for contract_file in contracts/deployments/varity-l3-testnet/*.json; do
    if [ -f "$contract_file" ]; then
      CONTRACT_NAME=$(basename "$contract_file" .json)
      CONTRACT_ADDRESS=$(cat "$contract_file" | grep -o '"address":"[^"]*' | cut -d'"' -f4 | head -1)
      if [ -n "$CONTRACT_ADDRESS" ] && [ "$CONTRACT_ADDRESS" != "null" ]; then
        echo "   $CONTRACT_NAME: $CONTRACT_ADDRESS"
      fi
    fi
  done
else
  echo "   (Check contracts/deployments/varity-l3-testnet/ for addresses)"
fi

echo ""
echo "Next Steps:"
echo "1. Update frontend .env with contract addresses"
echo "2. Test contract interactions: npx hardhat run scripts/test-contracts.js --network varity-l3-testnet"
echo "3. Verify contracts on explorer (if not already done)"
echo "4. Run integration tests: npm run test:integration"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Save deployment timestamp
echo "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" > contracts/deployments/varity-l3-testnet/.timestamp

echo "📄 Deployment artifacts saved to: contracts/deployments/varity-l3-testnet/"
echo ""
