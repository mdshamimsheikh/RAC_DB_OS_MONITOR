@echo off
setlocal enabledelayedexpansion

:: Change working directory to script location
cd /d "%~dp0"

echo ============================================================
echo   Oracle DataCore - Windows Build Script for Tomcat ^& Node
echo ============================================================
echo [INFO] Working Directory: %CD%
echo.

echo [1/2] Cleaning previous build artifacts...
if exist dist rmdir /s /q dist
if exist oracle-datacore-api.war del /f /q oracle-datacore-api.war

if not exist node_modules (
    echo [INFO] Installing NPM dependencies...
    call npm install
)

echo [2/2] Building Vite frontend, esbuild server, and oracle-datacore-api.war...
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Build failed! Please check error output above.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ============================================================
echo  SUCCESS: oracle-datacore-api.war created successfully!
echo  Location: %CD%\oracle-datacore-api.war
echo ============================================================
echo.
echo  HOW TO DEPLOY TO TOMCAT ON WINDOWS:
echo  1. Copy "oracle-datacore-api.war" to your Tomcat webapps folder:
echo     e.g., C:\Program Files\Apache Software Foundation\Tomcat 9.0\webapps\
echo  2. Tomcat will automatically extract it to "oracle-datacore-api" folder
echo  3. Access the web application in browser:
echo     http://localhost:8080/oracle-datacore-api/
echo  4. Run Node API backend server on host:
echo     set NODE_ENV=production
echo     node dist\server.cjs
echo ============================================================
echo.
pause




