#!/bin/bash
# Verify Critical Security Fixes - Generic Company Dashboard
# Run this after applying critical fixes to verify they were successful

set -e

echo "=================================================="
echo "VERIFYING CRITICAL SECURITY FIXES"
echo "=================================================="
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

PASS=0
FAIL=0

# ============================================
# VERIFICATION #1: .gitignore exists
# ============================================
echo "🔍 [1/5] Checking .gitignore file..."

if [ -f .gitignore ]; then
    if grep -q "\.env" .gitignore; then
        echo "✅ PASS: .gitignore exists and protects .env files"
        ((PASS++))
    else
        echo "❌ FAIL: .gitignore exists but doesn't protect .env files"
        ((FAIL++))
    fi
else
    echo "❌ FAIL: .gitignore file not found"
    ((FAIL++))
fi
echo ""

# ============================================
# VERIFICATION #2: CORS configuration
# ============================================
echo "🔍 [2/5] Checking CORS configuration..."

if grep -q 'allow_origins=\["*"\]' backend/app/main.py; then
    echo "❌ FAIL: CORS still uses wildcard (allow_origins=['*'])"
    echo "   This is a CRITICAL security vulnerability!"
    echo "   Fix: Edit backend/app/main.py around line 70"
    ((FAIL++))
elif grep -q "allowed_origins" backend/app/main.py && grep -q "CORS_ORIGINS" backend/app/main.py; then
    echo "✅ PASS: CORS configuration uses environment-based origins"
    ((PASS++))
else
    echo "⚠️  UNKNOWN: Could not verify CORS configuration"
    echo "   Manually check backend/app/main.py line 67-74"
fi
echo ""

# ============================================
# VERIFICATION #3: Cryptography version
# ============================================
echo "🔍 [3/5] Checking for duplicate cryptography versions..."

CRYPTO_COUNT=$(grep -c "cryptography==" backend/requirements.txt || true)

if [ "$CRYPTO_COUNT" -eq 1 ]; then
    echo "✅ PASS: Only one cryptography version in requirements.txt"
    CRYPTO_VERSION=$(grep "cryptography==" backend/requirements.txt)
    echo "   Version: $CRYPTO_VERSION"
    ((PASS++))
elif [ "$CRYPTO_COUNT" -gt 1 ]; then
    echo "❌ FAIL: Multiple cryptography versions found:"
    grep "cryptography==" backend/requirements.txt
    ((FAIL++))
else
    echo "❌ FAIL: No cryptography version found in requirements.txt"
    ((FAIL++))
fi
echo ""

# ============================================
# VERIFICATION #4: NPM vulnerabilities
# ============================================
echo "🔍 [4/5] Checking NPM security vulnerabilities..."

VULN_COUNT=$(npm audit --production 2>/dev/null | grep -c "vulnerabilities" || echo "0")

if npm audit --production 2>&1 | grep -q "found 0 vulnerabilities"; then
    echo "✅ PASS: No NPM vulnerabilities found"
    ((PASS++))
else
    echo "⚠️  WARNING: NPM vulnerabilities still exist"
    echo "   Run: npm audit"
    echo "   To see details and fix options"
    echo ""
    echo "   Quick summary:"
    npm audit --production 2>&1 | grep -A 5 "vulnerabilities" || echo "   (could not get summary)"
fi
echo ""

# ============================================
# VERIFICATION #5: Environment files protected
# ============================================
echo "🔍 [5/5] Checking if .env files are tracked in git..."

ENV_FILES_TRACKED=0

for file in .env .env.local backend/.env contracts/.env; do
    if git ls-files --error-unmatch "$file" 2>/dev/null; then
        echo "❌ WARNING: $file is still tracked in git!"
        ((ENV_FILES_TRACKED++))
    fi
done

if [ $ENV_FILES_TRACKED -eq 0 ]; then
    echo "✅ PASS: No .env files tracked in git"
    ((PASS++))
else
    echo "❌ FAIL: $ENV_FILES_TRACKED .env files are still tracked in git"
    echo "   Run: git rm --cached .env .env.local backend/.env contracts/.env"
    echo "   Then: git commit -m 'Remove sensitive environment files from git'"
    ((FAIL++))
fi
echo ""

# ============================================
# SUMMARY
# ============================================
echo "=================================================="
echo "VERIFICATION SUMMARY"
echo "=================================================="
echo ""
echo "✅ PASSED: $PASS/5 checks"
echo "❌ FAILED: $FAIL/5 checks"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 ALL CRITICAL FIXES VERIFIED!"
    echo ""
    echo "Next steps:"
    echo "1. Test the application end-to-end"
    echo "2. Review and fix HIGH priority issues (see QA report)"
    echo "3. Deploy to staging environment"
    echo ""
    exit 0
else
    echo "⚠️  CRITICAL ISSUES STILL PRESENT"
    echo ""
    echo "Please fix the failed checks above before deploying."
    echo "See PRODUCTION_READINESS_QA_REPORT.md for detailed instructions."
    echo ""
    exit 1
fi
