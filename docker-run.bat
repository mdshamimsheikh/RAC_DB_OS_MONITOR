@echo off
echo ========================================================
echo  🚀 Oracle DataCore Portal - Docker Windows Launcher
echo ========================================================

REM Ensure storage JSON files exist before volume mapping
if not exist "nodes.json" (
    echo [] > nodes.json
)

if not exist "databases.json" (
    echo {"primaryDbs":[],"standbyDbs":[],"customNotifications":[]} > databases.json
)

echo 📦 Building and starting Docker container on http://localhost:3030...
docker compose up -d --build

echo.
echo ========================================================
echo  ✅ Docker container is running successfully!
echo  🌐 Open Web Portal: http://localhost:3030
echo  📜 View Logs: docker compose logs -f
echo  🛑 Stop Portal: docker compose down
echo ========================================================
pause
