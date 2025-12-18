#!/bin/bash
set -e

echo "=== PHASE 1: CLEANUP - DUPLICATE FILES AND TEST ARTIFACTS ==="
echo ""

# Track deletions
DELETED_COUNT=0

echo "Step 1.1: Deleting duplicate API files..."
if [ -f "backend/app/api/v1/marketplace.py" ]; then
  rm "backend/app/api/v1/marketplace.py"
  echo "  ✓ Deleted backend/app/api/v1/marketplace.py"
  ((DELETED_COUNT++))
fi

if [ -f "backend/app/api/v1/oauth.py" ]; then
  rm "backend/app/api/v1/oauth.py"
  echo "  ✓ Deleted backend/app/api/v1/oauth.py"
  ((DELETED_COUNT++))
fi

echo ""
echo "Step 1.2: Deleting duplicate README files..."
if [ -f "README_FRONTEND_UPDATE.md" ]; then
  rm "README_FRONTEND_UPDATE.md"
  echo "  ✓ Deleted README_FRONTEND_UPDATE.md"
  ((DELETED_COUNT++))
fi

if [ -f "README_UPDATED.md" ]; then
  rm "README_UPDATED.md"
  echo "  ✓ Deleted README_UPDATED.md"
  ((DELETED_COUNT++))
fi

echo ""
echo "Step 1.3: Deleting duplicate environment templates..."
if [ -f ".env.local" ]; then
  rm ".env.local"
  echo "  ✓ Deleted .env.local"
  ((DELETED_COUNT++))
fi

if [ -f ".env.local.example" ]; then
  rm ".env.local.example"
  echo "  ✓ Deleted .env.local.example"
  ((DELETED_COUNT++))
fi

if [ -f ".env.local.template" ]; then
  rm ".env.local.template"
  echo "  ✓ Deleted .env.local.template"
  ((DELETED_COUNT++))
fi

echo ""
echo "Step 1.4: Deleting test database files..."
if [ -f "backend/marketplace_test.db" ]; then
  rm "backend/marketplace_test.db"
  echo "  ✓ Deleted backend/marketplace_test.db"
  ((DELETED_COUNT++))
fi

if [ -f "src/app/onboarding/marketplace_test.db" ]; then
  rm "src/app/onboarding/marketplace_test.db"
  echo "  ✓ Deleted src/app/onboarding/marketplace_test.db"
  ((DELETED_COUNT++))
fi

echo ""
echo "Step 1.5: Deleting test result JSON files..."
test_files=(
  "ai_chat_test_output.log"
  "ai_chat_test_results.json"
  "api_bugs.json"
  "bug_fix_results.json"
  "build_output.txt"
  "e2e_user_flow_test_results.json"
  "frontend_bugs.json"
  "integration_bugs.json"
  "marketplace_test_results.json"
  "optimization_results.json"
  "security_issues.json"
  "smart_contract_test_results.json"
  "storage_test_results.json"
  "storage_test_results_auth.json"
  "test_results.json"
  "user_flow_results.json"
)

for file in "${test_files[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✓ Deleted $file"
    ((DELETED_COUNT++))
  fi
done

echo ""
echo "=== PHASE 1 COMPLETE ==="
echo "Total files deleted: $DELETED_COUNT"
echo ""
