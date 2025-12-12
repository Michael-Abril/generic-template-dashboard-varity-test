#!/bin/bash

echo "========================================"
echo "  Stopping Varity Local Infrastructure"
echo "========================================"
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

cd "$PROJECT_ROOT"

# Check if docker-compose is running
if ! docker-compose ps | grep -q "Up"; then
    echo "No running services found."
    exit 0
fi

# Show current running services
echo "Current running services:"
docker-compose ps
echo ""

# Ask for confirmation
read -p "Stop all services? [y/N]: " CONFIRM
CONFIRM=${CONFIRM:-n}

if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

# Stop services
echo ""
echo "Stopping services..."
docker-compose stop

echo "✓ Services stopped"
echo ""

# Ask about data removal
echo "WARNING: Data Removal Options"
echo ""
echo "Choose an action:"
echo "  1. Keep all data (default - safe)"
echo "  2. Remove containers only (keeps data volumes)"
echo "  3. Remove containers AND data volumes (DESTROYS ALL DATA)"
echo ""
read -p "Choose option [1-3] (default: 1): " DATA_CHOICE
DATA_CHOICE=${DATA_CHOICE:-1}

case $DATA_CHOICE in
    1)
        echo "Keeping all data. Services can be restarted with ./scripts/start-infrastructure.sh"
        ;;
    2)
        echo "Removing containers..."
        docker-compose down
        echo "✓ Containers removed (data volumes preserved)"
        ;;
    3)
        echo ""
        echo "⚠️  WARNING: This will permanently delete:"
        echo "  - All PostgreSQL databases"
        echo "  - All Redis data"
        echo "  - All Ollama models (will need to re-download)"
        echo ""
        read -p "Are you SURE? Type 'DELETE' to confirm: " FINAL_CONFIRM

        if [ "$FINAL_CONFIRM" == "DELETE" ]; then
            echo "Removing containers and volumes..."
            docker-compose down -v
            echo "✓ All containers and data volumes removed"
            echo ""
            echo "To restore, run:"
            echo "  ./scripts/start-infrastructure.sh"
            echo "  ./scripts/setup-ollama.sh"
        else
            echo "Cancelled data removal."
        fi
        ;;
    *)
        echo "Invalid choice. No changes made."
        ;;
esac

echo ""
echo "========================================"
echo "  Infrastructure Stopped"
echo "========================================"
echo ""
