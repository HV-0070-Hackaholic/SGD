# GovPulse All-In-One Service Launcher (PowerShell)
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 Launching GovPulse Smart Governance Dashboard (Telangana & India Command)" -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Cyan

$baseDir = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

Write-Host "`n[1/3] Starting Python FastAPI ML Microservice on port 8000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\ml-service'; python main.py"

Start-Sleep -Seconds 3

Write-Host "[2/3] Starting Node.js Express Gateway & WebSocket on port 5000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\backend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "[3/3] Starting React Vite Frontend Dashboard on port 5173..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$baseDir\frontend'; npm run dev -- --host 0.0.0.0"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "✅ All GovPulse microservices initiated!" -ForegroundColor Green
Write-Host "• Frontend Dashboard:    http://localhost:5173" -ForegroundColor White
Write-Host "• Frontend LAN Access:   http://<your-machine-ip>:5173" -ForegroundColor White
Write-Host "• Backend API Gateway:   http://localhost:5000/api/incidents" -ForegroundColor White
Write-Host "• Telangana Zones API:   http://localhost:5000/api/zones?state=Telangana" -ForegroundColor White
Write-Host "• FastAPI Docs & Health: http://localhost:8000/docs" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan
