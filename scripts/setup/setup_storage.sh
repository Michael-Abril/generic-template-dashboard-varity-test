#!/bin/bash
# Varity Generic Template - Storage Setup Script
# This script sets up the Filecoin/IPFS + Lit Protocol storage layer

set -e  # Exit on error

echo "============================================================================"
echo "VARITY GENERIC TEMPLATE - STORAGE SETUP"
echo "============================================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${NC}$1${NC}"
}

# Check if we're in the backend directory
if [ ! -f "requirements.txt" ]; then
    print_error "Must run from backend directory"
    echo "Usage: cd backend && ./setup_storage.sh"
    exit 1
fi

print_info "Step 1: Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
print_success "Python version: $PYTHON_VERSION"
echo ""

print_info "Step 2: Creating virtual environment..."
if [ -d "venv" ]; then
    print_warning "Virtual environment already exists, skipping..."
else
    python3 -m venv venv
    print_success "Virtual environment created"
fi
echo ""

print_info "Step 3: Activating virtual environment..."
source venv/bin/activate
print_success "Virtual environment activated"
echo ""

print_info "Step 4: Installing dependencies..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt
print_success "Dependencies installed"
echo ""

print_info "Step 5: Checking environment configuration..."
if [ ! -f ".env" ]; then
    print_warning ".env file not found, creating from template..."
    cp .env.example .env
    print_warning "IMPORTANT: Edit .env and add your Pinata credentials!"
    echo ""
    print_info "Get Pinata credentials from: https://app.pinata.cloud/developers/api-keys"
    echo ""
    read -p "Press Enter to continue after adding credentials..."
fi
print_success "Environment file exists"
echo ""

print_info "Step 6: Validating .env configuration..."
if grep -q "REPLACE_WITH_YOUR" .env; then
    print_error "Pinata credentials not configured!"
    echo ""
    echo "Please edit .env file and replace placeholder values:"
    echo "  PINATA_API_KEY=REPLACE_WITH_YOUR_API_KEY"
    echo "  PINATA_SECRET_KEY=REPLACE_WITH_YOUR_SECRET_KEY"
    echo "  PINATA_JWT=REPLACE_WITH_YOUR_JWT_TOKEN"
    echo ""
    echo "Get credentials from: https://app.pinata.cloud/developers/api-keys"
    echo ""
    exit 1
fi
print_success "Pinata credentials configured"
echo ""

print_info "Step 7: Testing storage integration..."
echo ""
echo "Running storage tests..."
echo "============================================================================"
python test_storage.py
TEST_RESULT=$?
echo "============================================================================"
echo ""

if [ $TEST_RESULT -eq 0 ]; then
    print_success "Storage setup complete!"
    echo ""
    echo "Next steps:"
    echo "  1. Check Pinata dashboard: https://app.pinata.cloud/pinmanager"
    echo "  2. Review uploaded files and metadata"
    echo "  3. Read STORAGE_SETUP.md for detailed documentation"
    echo "  4. Read ENCRYPTION_APPROACH.md for encryption details"
    echo ""
    print_success "You're ready to build on Varity's decentralized storage!"
else
    print_error "Storage tests failed!"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Verify Pinata credentials in .env file"
    echo "  2. Check Pinata dashboard for API key status"
    echo "  3. Review error messages above"
    echo "  4. Read STORAGE_SETUP.md for detailed help"
    echo ""
    exit 1
fi

echo ""
echo "============================================================================"
print_info "STORAGE ARCHITECTURE SUMMARY"
echo "============================================================================"
echo ""
echo "Layer 1: Varity Internal"
echo "  - Namespace: varity-internal/{category}/{timestamp}"
echo "  - Access: Varity admins only"
echo "  - Encryption: Lit Protocol"
echo ""
echo "Layer 2: Industry RAG"
echo "  - Namespace: industry-rag/{industry}/{category}/v{version}"
echo "  - Access: All customers in industry + Varity admins"
echo "  - Encryption: Lit Protocol + Celestia DA"
echo ""
echo "Layer 3: Customer Data"
echo "  - Namespace: customer-{wallet}/{integration}/{data_type}/{timestamp}"
echo "  - Access: Single customer only + Emergency admin"
echo "  - Encryption: Lit Protocol + Celestia DA + ZK proofs"
echo ""
echo "Storage Stack:"
echo "  ✅ Filecoin/IPFS (via Pinata API)"
echo "  ✅ Lit Protocol encryption (placeholder for MVP)"
echo "  ⏳ Celestia DA (Phase 2)"
echo "  ⏳ ZK proofs (Phase 2)"
echo ""
echo "============================================================================"
