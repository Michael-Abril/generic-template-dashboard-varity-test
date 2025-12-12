#!/bin/bash
# Install Export Functionality Dependencies
# This script installs the openpyxl package required for Excel exports

echo "Installing export functionality dependencies..."
echo ""

# Check if running in virtual environment
if [[ -z "$VIRTUAL_ENV" ]]; then
    echo "⚠️  WARNING: Not in a virtual environment!"
    echo "   It's recommended to activate .venv first:"
    echo "   source .venv/bin/activate"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Install openpyxl for Excel export
echo "Installing openpyxl 3.1.2..."
pip install openpyxl==3.1.2

# Verify installation
echo ""
echo "Verifying installation..."
python -c "import openpyxl; print(f'✅ openpyxl {openpyxl.__version__} installed successfully')" 2>/dev/null

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Export functionality dependencies installed successfully!"
    echo ""
    echo "You can now use all export formats:"
    echo "  • CSV Export"
    echo "  • PDF Export"
    echo "  • JSON Export"
    echo "  • Excel Export"
    echo ""
    echo "Test the exports at: http://localhost:8002/docs"
else
    echo ""
    echo "❌ Installation failed. Please check the error messages above."
    exit 1
fi
