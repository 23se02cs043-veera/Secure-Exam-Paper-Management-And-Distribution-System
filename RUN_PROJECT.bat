@echo off
title Secure Exam Paper Management System - Local Launcher
color 0B
echo ====================================================================
echo    SECURE EXAM PAPER MANAGEMENT AND DISTRIBUTION SYSTEM
echo    Starting Local Backend and Frontend Servers...
echo ====================================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Flask Backend Server (Port 5000)...
start "Flask Backend" cmd /c "cd /d \"%~dp0backend\" && python run.py"

echo [2/2] Starting Vite Frontend Server (Port 3000)...
start "Vite Frontend" cmd /c "cd /d \"%~dp0frontend\" && npm run dev"

timeout /t 3 /nobreak >nul

echo.
echo ====================================================================
echo    PROJECT IS NOW RUNNING!
echo.
echo    Local Website:    http://localhost:3000
echo    Local Backend:    http://localhost:5000
echo    Render Live Site: https://secure-exam-frontend.onrender.com
echo ====================================================================
echo.

start http://localhost:3000
