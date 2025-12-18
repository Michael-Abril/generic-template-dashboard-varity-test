#!/bin/bash
set -e

# ==============================================================================
# VARITY L3 FRONTEND DEPLOYMENT SCRIPT
# ==============================================================================
# Deploys the Generic Company Dashboard frontend to Filecoin/IPFS via Pinata
# ==============================================================================

echo "🚀 Deploying Generic Company Dashboard Frontend..."
echo ""

# ==============================================================================
# STEP 1: ENVIRONMENT VALIDATION
# ==============================================================================
echo "📋 Step 1/6: Validating environment..."

# Check if VARITY_ENV is set
if [ -z "$VARITY_ENV" ]; then
  echo "⚠️  VARITY_ENV not set. Defaulting to 'testnet'"
  export VARITY_ENV="testnet"
fi

echo "   Environment: $VARITY_ENV"

# Check for required tools
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js not installed"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "❌ Error: npm not installed"
  exit 1
fi

# Check for Pinata credentials (required for IPFS deployment)
if [ -z "$PINATA_API_KEY" ] || [ -z "$PINATA_SECRET_KEY" ]; then
  echo "❌ Error: Pinata credentials not set"
  echo "   Please set PINATA_API_KEY and PINATA_SECRET_KEY environment variables"
  echo "   Get credentials from: https://app.pinata.cloud"
  exit 1
fi

echo "✅ Environment validated"
echo ""

# ==============================================================================
# STEP 2: INSTALL DEPENDENCIES
# ==============================================================================
echo "📦 Step 2/6: Installing dependencies..."

if [ ! -d "node_modules" ]; then
  npm install
else
  echo "   Dependencies already installed (skipping)"
fi

echo "✅ Dependencies ready"
echo ""

# ==============================================================================
# STEP 3: BUILD PRODUCTION BUNDLE
# ==============================================================================
echo "🔨 Step 3/6: Building production bundle..."

# Clean previous build
rm -rf .next out

# Run production build
npm run build

if [ ! -d ".next" ]; then
  echo "❌ Error: Build failed - .next directory not found"
  exit 1
fi

# Export static files
npx next export -o out 2>/dev/null || cp -r .next/static out/ || true

echo "✅ Production bundle built"
echo ""

# ==============================================================================
# STEP 4: UPLOAD TO IPFS VIA PINATA
# ==============================================================================
echo "📤 Step 4/6: Uploading to Filecoin via Pinata..."

# Create a tar archive of the build
tar -czf build.tar.gz out/

# Upload to Pinata using their API
PINATA_RESPONSE=$(curl -s -X POST "https://api.pinata.cloud/pinning/pinFileToIPFS" \
  -H "pinata_api_key: $PINATA_API_KEY" \
  -H "pinata_secret_api_key: $PINATA_SECRET_KEY" \
  -F file=@build.tar.gz \
  -F 'pinataMetadata={"name":"varity-generic-dashboard-'"$VARITY_ENV"'"}' \
  -F 'pinataOptions={"cidVersion": 1}')

# Extract IPFS hash from response
IPFS_HASH=$(echo $PINATA_RESPONSE | grep -o '"IpfsHash":"[^"]*' | cut -d'"' -f4)

# Clean up tar file
rm build.tar.gz

if [ -z "$IPFS_HASH" ]; then
  echo "❌ Error: Failed to upload to Pinata"
  echo "   Response: $PINATA_RESPONSE"
  exit 1
fi

echo "✅ Uploaded to IPFS: $IPFS_HASH"
echo ""

# ==============================================================================
# STEP 5: GENERATE ACCESS URLS
# ==============================================================================
echo "🌐 Step 5/6: Generating access URLs..."

IPFS_GATEWAY_URL="https://ipfs.io/ipfs/$IPFS_HASH"
PINATA_GATEWAY_URL="https://gateway.pinata.cloud/ipfs/$IPFS_HASH"
CLOUDFLARE_GATEWAY_URL="https://cloudflare-ipfs.com/ipfs/$IPFS_HASH"

echo "   IPFS Hash: $IPFS_HASH"
echo ""
echo "   Access URLs:"
echo "   - IPFS Gateway:       $IPFS_GATEWAY_URL"
echo "   - Pinata Gateway:     $PINATA_GATEWAY_URL"
echo "   - Cloudflare Gateway: $CLOUDFLARE_GATEWAY_URL"
echo ""

# ==============================================================================
# STEP 6: UPDATE DNS (PRODUCTION ONLY)
# ==============================================================================
if [ "$VARITY_ENV" == "production" ]; then
  echo "🔄 Step 6/6: Updating DNS records..."

  # Update ENS or custom DNS to point to IPFS hash
  # This would integrate with Cloudflare API, ENS, or other DNS provider
  echo "   ⚠️  DNS update not yet implemented"
  echo "   TODO: Implement DNS update for production deployments"
  echo ""
else
  echo "📝 Step 6/6: DNS update (skipped for $VARITY_ENV)"
  echo ""
fi

# ==============================================================================
# DEPLOYMENT COMPLETE
# ==============================================================================
echo "✅ Frontend deployment complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "DEPLOYMENT SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo "Environment:     $VARITY_ENV"
echo "IPFS Hash:       $IPFS_HASH"
echo "Primary URL:     $PINATA_GATEWAY_URL"
echo ""
echo "Next Steps:"
echo "1. Test the deployment at: $PINATA_GATEWAY_URL"
echo "2. Run health checks: ./scripts/health-check.sh"
echo "3. Monitor performance in browser DevTools"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Save deployment info to file
cat > deployment-info.json <<EOF
{
  "environment": "$VARITY_ENV",
  "ipfsHash": "$IPFS_HASH",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "urls": {
    "ipfsGateway": "$IPFS_GATEWAY_URL",
    "pinataGateway": "$PINATA_GATEWAY_URL",
    "cloudflareGateway": "$CLOUDFLARE_GATEWAY_URL"
  }
}
EOF

echo "📄 Deployment info saved to: deployment-info.json"
echo ""
