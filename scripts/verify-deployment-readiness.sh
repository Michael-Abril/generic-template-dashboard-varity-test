#!/bin/bash

# ==============================================================================
# DEPLOYMENT READINESS VERIFICATION SCRIPT
# ==============================================================================
# Verifies that all deployment infrastructure is in place and configured
# ==============================================================================

echo "🔍 Verifying Deployment Readiness..."
echo ""

CHECKS_PASSED=0
CHECKS_FAILED=0
TOTAL_CHECKS=0

# Function to check file exists
check_file() {
  local file=$1
  local description=$2

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "   Checking $description... "

  if [ -f "$file" ]; then
    echo "✅"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    return 0
  else
    echo "❌ NOT FOUND"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
  fi
}

# Function to check file is executable
check_executable() {
  local file=$1
  local description=$2

  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
  echo -n "   Checking $description is executable... "

  if [ -x "$file" ]; then
    echo "✅"
    CHECKS_PASSED=$((CHECKS_PASSED + 1))
    return 0
  else
    echo "❌ NOT EXECUTABLE"
    CHECKS_FAILED=$((CHECKS_FAILED + 1))
    return 1
  fi
}

echo "1️⃣  Deployment Scripts"
echo "─────────────────────────────────────────────────────────────────"
check_file "scripts/deploy-frontend.sh" "Frontend deployment script"
check_executable "scripts/deploy-frontend.sh" "deploy-frontend.sh"
check_file "scripts/deploy-backend.sh" "Backend deployment script"
check_executable "scripts/deploy-backend.sh" "deploy-backend.sh"
check_file "scripts/deploy-contracts.sh" "Contract deployment script"
check_executable "scripts/deploy-contracts.sh" "deploy-contracts.sh"
check_file "scripts/health-check.sh" "Health check script"
check_executable "scripts/health-check.sh" "health-check.sh"
echo ""

echo "2️⃣  Environment Configuration"
echo "─────────────────────────────────────────────────────────────────"
check_file ".env.example" "Environment template"
check_file ".env.production.example" "Production environment template"
echo ""

echo "3️⃣  CI/CD Pipeline"
echo "─────────────────────────────────────────────────────────────────"
check_file ".github/workflows/deploy.yml" "GitHub Actions workflow"
echo ""

echo "4️⃣  Documentation"
echo "─────────────────────────────────────────────────────────────────"
check_file "DEPLOYMENT.md" "Deployment guide"
check_file "README.md" "Project README"
check_file "ANALYSIS.md" "Production readiness analysis"
echo ""

echo "5️⃣  Project Structure"
echo "─────────────────────────────────────────────────────────────────"
check_file "package.json" "Package configuration"
check_file "next.config.js" "Next.js configuration"
check_file "tailwind.config.ts" "Tailwind CSS configuration"
echo ""

echo "6️⃣  Source Code"
echo "─────────────────────────────────────────────────────────────────"
check_file "src/app/layout.tsx" "Root layout"
check_file "src/app/providers.tsx" "Providers configuration"
check_file "src/lib/varity-chain.ts" "Varity L3 chain definition"
echo ""

echo "═══════════════════════════════════════════════════════════════════"
echo "DEPLOYMENT READINESS SUMMARY"
echo "═══════════════════════════════════════════════════════════════════"
echo "Total Checks:    $TOTAL_CHECKS"
echo "Passed:          $CHECKS_PASSED"
echo "Failed:          $CHECKS_FAILED"

if [ $CHECKS_FAILED -eq 0 ]; then
  SUCCESS_RATE=100
else
  SUCCESS_RATE=$((CHECKS_PASSED * 100 / TOTAL_CHECKS))
fi

echo "Success Rate:    $SUCCESS_RATE%"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo "✅ ALL DEPLOYMENT INFRASTRUCTURE IN PLACE"
  echo ""
  echo "Ready to deploy using:"
  echo "  - Manual: ./scripts/deploy-*.sh"
  echo "  - CI/CD: git push origin main"
  echo ""
  exit 0
else
  echo "❌ DEPLOYMENT INFRASTRUCTURE INCOMPLETE"
  echo ""
  echo "Please ensure all required files are present"
  exit 1
fi
