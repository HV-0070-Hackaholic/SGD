@echo off
echo =======================================================
echo 🚀 Launching GovPulse Smart Governance Dashboard
echo =======================================================

echo [1/3] Starting Python FastAPI ML Microservice on port 8000...
start "GovPulse ML Microservice (FastAPI)" cmd /k "cd /d %~dp0ml-service && python main.py"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Node.js Express Gateway & WebSocket on port 5000...
start "GovPulse Backend Gateway" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [3/3] Starting React Vite Frontend Dashboard on port 5173...
start "GovPulse Frontend Dashboard" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =======================================================
echo ✅ All GovPulse services launched!
echo - Frontend Dashboard:    http://localhost:5173
echo - Backend API Gateway:   http://localhost:5000/api/incidents
echo - FastAPI Docs / Health: http://localhost:8000/docs
echo =======================================================
