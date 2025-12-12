#!/bin/bash

# Varity L3 Deployment Automation Script
# This script automates the deployment process after ETH has been bridged

set -e  # Exit on error

DEPLOYER_ADDRESS="0x20B7d1426649D9a573ba7Fd10592456264220cbF"
VARITY_RPC="https://rpc-varity-testnet-rroe52pwjp.t.conduit.xyz"
MIN_BALANCE_WEI="10000000000000000"  # 0.01 ETH minimum

echo "======================================================================"
echo "VARITY L3 DEPLOYMENT AUTOMATION"
echo "======================================================================"
echo ""

# Step 1: Check balance on Varity L3
echo "Step 1: Checking deployer balance on Varity L3..."
BALANCE_RESPONSE=$(curl -s -X POST $VARITY_RPC \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getBalance\",\"params\":[\"$DEPLOYER_ADDRESS\",\"latest\"],\"id\":1}")

BALANCE_HEX=$(echo $BALANCE_RESPONSE | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
BALANCE_WEI=$(python3 -c "print(int('$BALANCE_HEX', 16))")
BALANCE_ETH=$(python3 -c "print(int('$BALANCE_HEX', 16) / 1e18)")

echo "  Deployer: $DEPLOYER_ADDRESS"
echo "  Balance: $BALANCE_ETH ETH"
echo ""

# Step 2: Verify sufficient balance
if [ "$BALANCE_WEI" -lt "$MIN_BALANCE_WEI" ]; then
    echo "ERROR: Insufficient balance on Varity L3!"
    echo "  Current: $BALANCE_ETH ETH"
    echo "  Required: 0.01 ETH minimum"
    echo ""
    echo "Please bridge ETH to Varity L3 first:"
    echo "  https://varity-testnet-rroe52pwjp-86d3bf2e4517f78c.testnets.rollbridge.app/"
    echo ""
    exit 1
fi

echo "✓ Sufficient balance confirmed"
echo ""

# Step 3: Deploy contracts
echo "Step 2: Deploying contracts to Varity L3..."
npm run contracts:deploy:varity

# Step 4: Read deployment results
echo ""
echo "Step 3: Reading deployment results..."
if [ -f "deployments.json" ]; then
    echo ""
    echo "======================================================================"
    echo "DEPLOYMENT SUCCESSFUL!"
    echo "======================================================================"
    cat deployments.json
    echo ""
    echo "======================================================================"
    echo ""
    
    # Extract addresses for easy copying
    TOOL_MARKETPLACE=$(cat deployments.json | grep -o '"ToolMarketplace": "[^"]*"' | cut -d'"' -f4)
    TOOL_LICENSE_NFT=$(cat deployments.json | grep -o '"ToolLicenseNFT": "[^"]*"' | cut -d'"' -f4)
    SUBSCRIPTION_BILLING=$(cat deployments.json | grep -o '"SubscriptionBilling": "[^"]*"' | cut -d'"' -f4)
    REVENUE_SPLITTER=$(cat deployments.json | grep -o '"RevenueSplitter": "[^"]*"' | cut -d'"' -f4)
    
    echo "Contract Addresses (for .env.local):"
    echo "----------------------------------------------------------------------"
    echo "NEXT_PUBLIC_TOOL_MARKETPLACE_ADDRESS=$TOOL_MARKETPLACE"
    echo "NEXT_PUBLIC_TOOL_LICENSE_NFT_ADDRESS=$TOOL_LICENSE_NFT"
    echo "NEXT_PUBLIC_SUBSCRIPTION_BILLING_ADDRESS=$SUBSCRIPTION_BILLING"
    echo "NEXT_PUBLIC_REVENUE_SPLITTER_ADDRESS=$REVENUE_SPLITTER"
    echo ""
    
    echo "Explorer Links:"
    echo "----------------------------------------------------------------------"
    echo "ToolMarketplace:      https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/$TOOL_MARKETPLACE"
    echo "ToolLicenseNFT:       https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/$TOOL_LICENSE_NFT"
    echo "SubscriptionBilling:  https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/$SUBSCRIPTION_BILLING"
    echo "RevenueSplitter:      https://explorer-varity-testnet-rroe52pwjp.t.conduit.xyz/address/$REVENUE_SPLITTER"
    echo ""
else
    echo "ERROR: deployments.json not found!"
    exit 1
fi

echo "Next steps:"
echo "1. Update .env.local with the contract addresses above"
echo "2. Verify contracts on Varity L3 explorer"
echo "3. Test frontend integration"
echo ""

