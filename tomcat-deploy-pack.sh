#!/bin/bash
# ====================================================================
# ORACLE DATACORE - SINGLE API & TOMCAT DEPLOYMENT PACKAGER
# Supports: Linux (CentOS/RHEL/Ubuntu/Debian) & Apache Tomcat 9/10
# ====================================================================

echo "============================================================"
echo "  Oracle DataCore - Packaging Single API & Web App for Tomcat"
echo "============================================================"

# 1. Clean previous build outputs
echo "[1/2] Cleaning previous dist artifacts..."
rm -rf dist oracle-datacore-api.war

if [ ! -d "node_modules" ]; then
    echo "📦 node_modules not found. Installing dependencies..."
    npm install
fi

# 2. Build Frontend, Server and WAR package
echo "[2/2] Building production frontend, esbuild server & WAR package..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed! Please check error output above."
    exit 1
fi

echo "============================================================"
echo " ✅ SUCCESS: oracle-datacore-api.war created successfully!"
echo " 📁 Location: ./oracle-datacore-api.war"
echo ""
echo " 🚀 HOW TO DEPLOY TO TOMCAT (Linux / Windows):"
echo " 1. Copy 'oracle-datacore-api.war' to your Tomcat 'webapps/' directory:"
echo "    cp oracle-datacore-api.war /opt/tomcat/webapps/"
echo " 2. Tomcat will automatically extract it as 'oracle-datacore-api/'"
echo " 3. Run Node API backend server on host:"
echo "    NODE_ENV=production node dist/server.cjs"
echo "============================================================"

