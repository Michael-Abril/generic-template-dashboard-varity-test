#!/bin/bash
# Fix Critical Security Issues - Generic Company Dashboard
# Time estimate: 50 minutes
# Run this script to fix all CRITICAL issues identified in QA report

set -e  # Exit on error

echo "=================================================="
echo "FIXING CRITICAL SECURITY ISSUES"
echo "=================================================="
echo ""

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ============================================
# CRITICAL FIX #1: Create .gitignore (5 min)
# ============================================
echo "🔧 [1/4] Creating .gitignore file..."

if [ -f .gitignore ]; then
    echo "⚠️  .gitignore already exists. Backing up to .gitignore.backup"
    cp .gitignore .gitignore.backup
fi

cat > .gitignore << 'EOF'
# Environment Files
.env
.env.local
.env.*.local
backend/.env
contracts/.env

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
backend/.venv/
backend/venv/
*.db
*.sqlite
*.sqlite3
marketplace_test.db

# Node
node_modules/
.next/
out/
build/
dist/

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db
*.bak

# Logs
*.log
logs/
backend/logs/

# Test
.pytest_cache/
.coverage
htmlcov/
.tox/

# Hardhat
cache/
artifacts/
typechain-types/
.openzeppelin/

# Production
*.production.env
*.prod.env
EOF

echo "✅ .gitignore created successfully"
echo ""

# Check if .env files are tracked in git
if git ls-files --error-unmatch .env 2>/dev/null; then
    echo "⚠️  WARNING: .env files are currently tracked in git!"
    echo "   Run these commands to remove them:"
    echo "   git rm --cached .env .env.local backend/.env contracts/.env"
    echo "   git commit -m 'Remove sensitive environment files from git'"
    echo ""
fi

# ============================================
# CRITICAL FIX #2: Fix CORS Config (10 min)
# ============================================
echo "🔧 [2/4] Fixing CORS configuration in backend/app/main.py..."

# Backup original file
cp backend/app/main.py backend/app/main.py.backup

# Create fixed CORS configuration
cat > /tmp/cors_fix.py << 'PYTHON_CODE'
import os

# Parse CORS origins from environment variable
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:3001")
allowed_origins = [origin.strip() for origin in CORS_ORIGINS.split(",")]

# CORS middleware with production-safe configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # ✅ Specific origins only
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],  # ✅ Specific methods
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Wallet-Address",
        "X-Signature",
        "X-Message",
        "X-Timestamp",
    ],  # ✅ Specific headers only
)
PYTHON_CODE

echo "⚠️  MANUAL ACTION REQUIRED:"
echo "   Edit backend/app/main.py around line 67-74"
echo "   Replace the CORS configuration with the one in /tmp/cors_fix.py"
echo ""
echo "   Current (INSECURE):"
echo "   allow_origins=['*']"
echo ""
echo "   Replace with (SECURE):"
echo "   See /tmp/cors_fix.py for the complete secure configuration"
echo ""
echo "✅ CORS configuration template ready at /tmp/cors_fix.py"
echo ""

# ============================================
# CRITICAL FIX #3: Fix requirements.txt (5 min)
# ============================================
echo "🔧 [3/4] Fixing duplicate cryptography versions in requirements.txt..."

# Backup original file
cp backend/requirements.txt backend/requirements.txt.backup

# Remove duplicate cryptography line (the older version)
sed -i '/cryptography==41.0.7/d' backend/requirements.txt

echo "✅ Removed duplicate cryptography==41.0.7"
echo "   Keeping cryptography==46.0.3 (latest stable)"
echo ""

# ============================================
# CRITICAL FIX #4: Fix NPM vulnerabilities (30 min)
# ============================================
echo "🔧 [4/4] Fixing NPM security vulnerabilities..."

# Backup package files
cp package.json package.json.backup
cp package-lock.json package-lock.json.backup

echo "📋 Running npm audit to see vulnerabilities..."
npm audit || true
echo ""

echo "🔧 Applying non-breaking fixes..."
npm audit fix || true
echo ""

echo "⚠️  MANUAL DECISION REQUIRED:"
echo "   Some vulnerabilities require breaking changes to fix."
echo "   Review the audit output above."
echo ""
echo "   To apply breaking fixes (may require testing):"
echo "   npm audit fix --force"
echo ""
echo "   Affected packages may include:"
echo "   - @coinbase/wallet-sdk: 4.0.x → 4.3.0+"
echo "   - @privy-io/react-auth: <2.4.0 → 3.7.0 (BREAKING)"
echo "   - cookie: <0.7.0 → 0.7.0+"
echo "   - elliptic: <=6.6.0 → 6.6.1+"
echo ""
echo "   After applying fixes, you MUST test:"
echo "   - npm run build"
echo "   - npm run dev"
echo "   - Verify Privy authentication works"
echo "   - Verify wallet connections work"
echo ""

# ============================================
# SUMMARY
# ============================================
echo "=================================================="
echo "CRITICAL FIXES COMPLETED"
echo "=================================================="
echo ""
echo "✅ .gitignore created"
echo "⚠️  CORS configuration - manual edit required"
echo "✅ Cryptography duplicate removed"
echo "⚠️  NPM vulnerabilities - review and apply breaking fixes if needed"
echo ""
echo "NEXT STEPS:"
echo "1. Edit backend/app/main.py to fix CORS (see /tmp/cors_fix.py)"
echo "2. Review npm audit output and decide on breaking changes"
echo "3. Test the application:"
echo "   cd backend && pip install -r requirements.txt"
echo "   npm run build"
echo "   npm run dev"
echo "4. Run verification script:"
echo "   ./verify-critical-fixes.sh"
echo ""
echo "BACKUP FILES CREATED:"
echo "- .gitignore.backup (if existed)"
echo "- backend/app/main.py.backup"
echo "- backend/requirements.txt.backup"
echo "- package.json.backup"
echo "- package-lock.json.backup"
echo ""
echo "To restore backups if needed:"
echo "cp *.backup [original-file]"
echo ""
echo "=================================================="
echo "Time spent: ~20 minutes"
echo "Manual work remaining: ~30 minutes"
echo "Total: ~50 minutes to fix all critical issues"
echo "=================================================="
