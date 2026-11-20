@echo off
title TrustFed Platform Runner
echo ========================================================
echo   TrustFed Financial Fraud Intelligence Platform
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Starting FastAPI Backend on port 8001...
start "TrustFed Backend (FastAPI)" cmd /k "cd backend && python -m uvicorn risks_api:app --host 127.0.0.1 --port 8001 --reload"

echo [*] Starting Vite Frontend on port 5173...
start "TrustFed Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo [*] Waiting for services to initialize...
timeout /t 3 /nobreak >nul

echo [*] Launching application in default browser...
start http://localhost:5173

echo.
echo ========================================================
echo   Services are running!
echo   - Frontend: http://localhost:5173
echo   - Backend API: http://localhost:8001
echo   - Swagger Docs: http://localhost:8001/docs
echo ========================================================
echo   Press any key to close this launcher window...
pause >nul
