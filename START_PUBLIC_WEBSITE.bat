@echo off
title Secure Exam Paper Management System - Public Website Launcher
color 0A
echo ====================================================================
echo    SECURE EXAM PAPER MANAGEMENT AND DISTRIBUTION SYSTEM
echo    STARTING PUBLIC WEBSITE ^& BACKEND/FRONTEND SERVERS...
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Flask Backend API Server (Port 5000)...
start "Flask Backend" cmd /c "cd backend && python run.py"

echo [2/3] Starting Vite Frontend Web Application (Port 3000)...
start "Vite Frontend" cmd /c "cd frontend && npm run dev -- --host 0.0.0.0"

echo [3/3] Launching Public Internet Domain Tunnel...
timeout /t 4 /nobreak >nul

start "Public Domain Tunnel" cmd /c "node scratch_start_tunnel.js"

echo.
echo ====================================================================
echo    PUBLIC WEBSITE IS NOW ACTIVE ^& ACCESSIBLE FROM ANY BROWSER!
echo    Public Domain URL: https://tender-boxes-hunt.loca.lt
echo    Localhost URL:     http://localhost:3000
echo ====================================================================
echo.
pause
