#!/usr/bin/env bash

echo "========================================================"
echo " 🚀 Oracle DataCore Portal - Docker Automated Launcher"
echo "========================================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH."
    echo "Please install Docker Desktop or Docker Engine first."
    exit 1
fi

# Ensure storage JSON files exist before volume mapping
if [ ! -f "nodes.json" ]; then
    echo "[]" > nodes.json
fi

if [ ! -f "databases.json" ]; then
    echo '{"primaryDbs":[],"standbyDbs":[],"customNotifications":[]}' > databases.json
fi

echo "📦 Building & starting Docker container on http://localhost:3030..."
docker compose up -d --build

echo ""
echo "========================================================"
echo " ✅ Docker container is running successfully!"
echo " 🌐 Open Web Portal: http://localhost:3030"
echo " 📜 Logs command: docker compose logs -f"
echo " 🛑 Stop command: docker compose down"
echo "========================================================"
