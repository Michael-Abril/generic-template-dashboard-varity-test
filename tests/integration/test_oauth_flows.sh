#!/bin/bash

# OAuth Flow Test Script
# Tests OAuth authorization and callback for all 10 providers

API_URL="http://localhost:8001"
TEST_WALLET="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0"

echo "=========================================="
echo "OAuth Flow Test - All 10 Providers"
echo "=========================================="
echo ""

# Define providers
PROVIDERS=(
  "quickbooks"
  "salesforce"
  "shopify"
  "slack"
  "monday"
  "stripe"
  "hubspot"
  "zendesk"
  "google"
  "microsoft"
)

echo "Test 1: Check OAuth authorization endpoint for each provider"
echo "--------------------------------------------------------------"
for provider in "${PROVIDERS[@]}"; do
  echo -n "Testing $provider authorization... "

  # Start OAuth flow
  response=$(curl -s -X POST "$API_URL/api/v1/oauth/start/$provider" \
    -H "Content-Type: application/json" \
    -d "{\"wallet_address\":\"$TEST_WALLET\"}" 2>&1)

  # Check if authorization_url exists in response
  if echo "$response" | grep -q "authorization_url"; then
    echo "✅ PASS"
  else
    echo "❌ FAIL"
    echo "Response: $response"
  fi
done

echo ""
echo "Test 2: Check OAuth callback endpoint (POST)"
echo "--------------------------------------------------------------"
echo -n "Testing callback endpoint... "

# Test callback with mock data (should fail validation but endpoint should exist)
response=$(curl -s -X POST "$API_URL/api/v1/oauth/callback" \
  -H "Content-Type: application/json" \
  -d "{\"provider\":\"quickbooks\",\"code\":\"test123\",\"state\":\"invalid\",\"wallet_address\":\"$TEST_WALLET\"}" 2>&1)

# Check for expected error message (not 404)
if echo "$response" | grep -q "Invalid or expired state"; then
  echo "✅ PASS (endpoint exists, validation working)"
elif echo "$response" | grep -q "404"; then
  echo "❌ FAIL (404 Not Found)"
else
  echo "⚠️  UNKNOWN (unexpected response)"
  echo "Response: $response"
fi

echo ""
echo "Test 3: Check OAuth callback endpoint (GET - legacy)"
echo "--------------------------------------------------------------"
echo -n "Testing legacy GET callback... "

# Test legacy GET callback
response=$(curl -s -X GET "$API_URL/api/v1/oauth/callback?code=test123&state=invalid" 2>&1)

if echo "$response" | grep -q "Invalid or expired state"; then
  echo "✅ PASS (endpoint exists, validation working)"
elif echo "$response" | grep -q "404"; then
  echo "❌ FAIL (404 Not Found)"
else
  echo "⚠️  UNKNOWN (unexpected response)"
  echo "Response: $response"
fi

echo ""
echo "Test 4: Check OAuth status endpoint"
echo "--------------------------------------------------------------"
echo -n "Testing status endpoint... "

response=$(curl -s -X GET "$API_URL/api/v1/oauth/status/quickbooks?wallet_address=$TEST_WALLET" 2>&1)

if echo "$response" | grep -q "integration"; then
  echo "✅ PASS (endpoint exists)"
elif echo "$response" | grep -q "404"; then
  echo "❌ FAIL (404 Not Found)"
else
  echo "⚠️  UNKNOWN"
  echo "Response: $response"
fi

echo ""
echo "Test 5: Full OAuth Flow Simulation (QuickBooks)"
echo "--------------------------------------------------------------"

# Step 1: Start OAuth flow
echo "Step 1: Starting OAuth flow for QuickBooks..."
auth_response=$(curl -s -X POST "$API_URL/api/v1/oauth/start/quickbooks" \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\":\"$TEST_WALLET\"}")

if echo "$auth_response" | grep -q "authorization_url"; then
  echo "✅ Authorization URL generated"

  # Extract state from response
  state=$(echo "$auth_response" | grep -o '"state":"[^"]*"' | cut -d'"' -f4 || echo "")

  if [ -n "$state" ]; then
    echo "✅ State token: $state"

    # Step 2: Simulate OAuth callback (will fail at token exchange, but tests routing)
    echo "Step 2: Testing callback with valid state..."
    callback_response=$(curl -s -X POST "$API_URL/api/v1/oauth/callback" \
      -H "Content-Type: application/json" \
      -d "{\"provider\":\"quickbooks\",\"code\":\"test_auth_code\",\"state\":\"$state\",\"wallet_address\":\"$TEST_WALLET\",\"redirect_uri\":\"http://localhost:3001/oauth/callback/quickbooks\"}")

    if echo "$callback_response" | grep -q "Failed to exchange code"; then
      echo "✅ Callback endpoint working (failed at token exchange as expected)"
    elif echo "$callback_response" | grep -q "404"; then
      echo "❌ Callback endpoint not found (404)"
    else
      echo "⚠️  Unexpected response:"
      echo "$callback_response"
    fi
  else
    echo "❌ No state token in response"
  fi
else
  echo "❌ Failed to get authorization URL"
  echo "Response: $auth_response"
fi

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "If all tests show ✅ PASS, OAuth routing is working correctly."
echo "Token exchange failures are EXPECTED (no real OAuth credentials configured)."
echo ""
echo "Next steps:"
echo "1. Configure OAuth credentials in .env file"
echo "2. Test with real OAuth provider (QuickBooks, Salesforce, etc.)"
echo "3. Verify token storage in Filecoin"
echo "4. Check encryption with Lit Protocol"
echo ""
