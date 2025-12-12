#!/bin/bash
set -e

# ==============================================================================
# VARITY L3 BACKEND DEPLOYMENT SCRIPT
# ==============================================================================
# Deploys the Generic Company Dashboard backend to Akash Network
# ==============================================================================

echo "🚀 Deploying Backend to Akash Network..."
echo ""

# ==============================================================================
# STEP 1: ENVIRONMENT VALIDATION
# ==============================================================================
echo "📋 Step 1/7: Validating environment..."

# Check if VARITY_ENV is set
if [ -z "$VARITY_ENV" ]; then
  echo "⚠️  VARITY_ENV not set. Defaulting to 'testnet'"
  export VARITY_ENV="testnet"
fi

echo "   Environment: $VARITY_ENV"

# Check for required tools
if ! command -v docker &> /dev/null; then
  echo "❌ Error: Docker not installed"
  echo "   Install from: https://docs.docker.com/get-docker/"
  exit 1
fi

# Check for Akash CLI (optional - we'll use Docker registry approach)
if command -v akash &> /dev/null; then
  echo "   ✅ Akash CLI found"
  HAS_AKASH_CLI=true
else
  echo "   ⚠️  Akash CLI not found (optional)"
  echo "   Will use Docker registry deployment method"
  HAS_AKASH_CLI=false
fi

# Check for required environment variables
REQUIRED_VARS=(
  "DATABASE_URL"
  "VARITY_RPC_URL"
  "VARITY_CHAIN_ID"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: Required environment variable $var not set"
    exit 1
  fi
done

echo "✅ Environment validated"
echo ""

# ==============================================================================
# STEP 2: BUILD DOCKER IMAGE
# ==============================================================================
echo "🐳 Step 2/7: Building Docker image..."

# Check if backend directory exists
if [ ! -d "backend" ]; then
  echo "❌ Error: backend directory not found"
  echo "   Current directory: $(pwd)"
  exit 1
fi

# Build Docker image with multi-stage build
docker build -t varity-backend:latest -f backend/Dockerfile backend/

if [ $? -ne 0 ]; then
  echo "❌ Error: Docker build failed"
  exit 1
fi

echo "✅ Docker image built successfully"
echo ""

# ==============================================================================
# STEP 3: TAG AND PUSH TO REGISTRY
# ==============================================================================
echo "📤 Step 3/7: Pushing to container registry..."

# Use Docker Hub or GitHub Container Registry
REGISTRY_URL=${DOCKER_REGISTRY:-"ghcr.io/varity"}
IMAGE_TAG="$REGISTRY_URL/generic-backend:$VARITY_ENV-$(date +%Y%m%d-%H%M%S)"
IMAGE_LATEST="$REGISTRY_URL/generic-backend:$VARITY_ENV-latest"

# Tag image
docker tag varity-backend:latest $IMAGE_TAG
docker tag varity-backend:latest $IMAGE_LATEST

# Check if logged in to registry
if ! docker info | grep -q "Username"; then
  echo "⚠️  Not logged in to Docker registry"
  echo "   Run: docker login $REGISTRY_URL"
  echo ""
  echo "   For GitHub Container Registry:"
  echo "   docker login ghcr.io -u USERNAME -p TOKEN"
  echo ""
  exit 1
fi

# Push images
echo "   Pushing $IMAGE_TAG..."
docker push $IMAGE_TAG

echo "   Pushing $IMAGE_LATEST..."
docker push $IMAGE_LATEST

echo "✅ Images pushed to registry"
echo ""

# ==============================================================================
# STEP 4: GENERATE AKASH DEPLOYMENT MANIFEST
# ==============================================================================
echo "📝 Step 4/7: Generating Akash deployment manifest..."

# Create Akash deployment manifest
cat > akash-deploy.yaml <<EOF
---
version: "2.0"

services:
  backend:
    image: $IMAGE_LATEST
    expose:
      - port: 8000
        as: 80
        to:
          - global: true
    env:
      - DATABASE_URL=$DATABASE_URL
      - VARITY_RPC_URL=$VARITY_RPC_URL
      - VARITY_CHAIN_ID=$VARITY_CHAIN_ID
      - ENVIRONMENT=$VARITY_ENV
      - PORT=8000

profiles:
  compute:
    backend:
      resources:
        cpu:
          units: 2
        memory:
          size: 4Gi
        storage:
          size: 10Gi

  placement:
    akash:
      pricing:
        backend:
          denom: uakt
          amount: 1000

deployment:
  backend:
    akash:
      profile: backend
      count: 1
EOF

echo "✅ Akash deployment manifest generated"
echo ""

# ==============================================================================
# STEP 5: DEPLOY TO AKASH (IF CLI AVAILABLE)
# ==============================================================================
if [ "$HAS_AKASH_CLI" = true ]; then
  echo "☁️  Step 5/7: Deploying to Akash Network..."

  # Check for Akash wallet
  if [ -z "$AKASH_WALLET" ]; then
    echo "⚠️  AKASH_WALLET not set - skipping automatic deployment"
    echo "   Manual deployment required using: akash tx deployment create akash-deploy.yaml"
    echo ""
  else
    # Deploy to Akash
    echo "   Creating deployment on Akash..."
    akash tx deployment create akash-deploy.yaml \
      --from $AKASH_WALLET \
      --chain-id akashnet-2 \
      --node https://rpc.akash.network:443 \
      --gas-prices 0.025uakt \
      --gas auto \
      --gas-adjustment 1.5 \
      --yes

    if [ $? -eq 0 ]; then
      echo "✅ Deployment created on Akash"

      # Get deployment ID
      DEPLOYMENT_ID=$(akash query deployment list --owner $AKASH_WALLET --state active --output json | jq -r '.deployments[0].deployment.deployment_id.dseq')

      echo "   Deployment ID: $DEPLOYMENT_ID"
      echo ""
      echo "   Check deployment status:"
      echo "   akash query deployment get --owner $AKASH_WALLET --dseq $DEPLOYMENT_ID"
      echo ""
    else
      echo "❌ Error: Akash deployment failed"
      exit 1
    fi
  fi
else
  echo "⏭️  Step 5/7: Akash deployment (manual) - CLI not installed"
  echo ""
  echo "   To deploy manually:"
  echo "   1. Install Akash CLI: https://docs.akash.network/cli/installation"
  echo "   2. Create wallet or import existing one"
  echo "   3. Run: akash tx deployment create akash-deploy.yaml --from <wallet>"
  echo ""
fi

# ==============================================================================
# STEP 6: WAIT FOR DEPLOYMENT
# ==============================================================================
if [ "$HAS_AKASH_CLI" = true ] && [ -n "$DEPLOYMENT_ID" ]; then
  echo "⏳ Step 6/7: Waiting for deployment to be active..."

  # Wait up to 2 minutes for deployment
  TIMEOUT=120
  ELAPSED=0
  while [ $ELAPSED -lt $TIMEOUT ]; do
    STATUS=$(akash query deployment get --owner $AKASH_WALLET --dseq $DEPLOYMENT_ID --output json 2>/dev/null | jq -r '.deployment.state' || echo "unknown")

    if [ "$STATUS" == "active" ]; then
      echo "✅ Deployment is active"
      break
    fi

    echo "   Status: $STATUS (waiting...)"
    sleep 5
    ELAPSED=$((ELAPSED + 5))
  done

  if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "⚠️  Warning: Deployment timeout - check status manually"
  fi
else
  echo "⏭️  Step 6/7: Waiting for deployment (skipped)"
fi

echo ""

# ==============================================================================
# STEP 7: GET SERVICE ENDPOINTS
# ==============================================================================
if [ "$HAS_AKASH_CLI" = true ] && [ -n "$DEPLOYMENT_ID" ]; then
  echo "🌐 Step 7/7: Getting service endpoints..."

  # Get lease information
  LEASE_INFO=$(akash query market lease list --owner $AKASH_WALLET --dseq $DEPLOYMENT_ID --output json 2>/dev/null)

  if [ -n "$LEASE_INFO" ]; then
    # Extract provider and service URI
    PROVIDER=$(echo $LEASE_INFO | jq -r '.leases[0].lease.lease_id.provider')
    SERVICE_URI=$(akash query market lease get-service-uri --owner $AKASH_WALLET --dseq $DEPLOYMENT_ID --provider $PROVIDER 2>/dev/null | grep -o 'http[s]*://[^"]*' | head -1)

    if [ -n "$SERVICE_URI" ]; then
      echo "✅ Service endpoint: $SERVICE_URI"
      API_URL="$SERVICE_URI"
    else
      echo "⚠️  Could not retrieve service URI - check manually"
      API_URL="<pending>"
    fi
  else
    echo "⚠️  Could not retrieve lease information"
    API_URL="<pending>"
  fi
else
  echo "⏭️  Step 7/7: Service endpoints (manual check required)"
  API_URL="<deploy-to-akash-first>"
fi

echo ""

# ==============================================================================
# DEPLOYMENT COMPLETE
# ==============================================================================
echo "✅ Backend deployment complete!"
echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "DEPLOYMENT SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo "Environment:     $VARITY_ENV"
echo "Docker Image:    $IMAGE_TAG"
echo "Registry:        $REGISTRY_URL"
echo "API URL:         $API_URL"
echo ""
echo "Deployment Manifest: akash-deploy.yaml"
echo ""
echo "Next Steps:"
if [ "$HAS_AKASH_CLI" = true ] && [ -n "$DEPLOYMENT_ID" ]; then
  echo "1. Test the API: curl $API_URL/health"
  echo "2. Run health checks: ./scripts/health-check.sh"
  echo "3. Monitor logs: akash provider service-logs --owner $AKASH_WALLET --dseq $DEPLOYMENT_ID --provider $PROVIDER"
else
  echo "1. Deploy to Akash using akash-deploy.yaml"
  echo "2. Get service endpoint from Akash provider"
  echo "3. Run health checks: ./scripts/health-check.sh"
fi
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Save deployment info to file
cat > backend-deployment-info.json <<EOF
{
  "environment": "$VARITY_ENV",
  "dockerImage": "$IMAGE_TAG",
  "registry": "$REGISTRY_URL",
  "apiUrl": "$API_URL",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deploymentManifest": "akash-deploy.yaml"
}
EOF

echo "📄 Deployment info saved to: backend-deployment-info.json"
echo ""
