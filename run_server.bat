@echo off
title MoneyView Server
echo ===================================
echo   Starting MoneyView Web App (Production Mode)
echo ===================================
echo.
cd /d "%~dp0"

echo.
choice /c yn /t 3 /d n /m "Would you like to rebuild the application first (y/n)?"
if errorlevel 2 goto startServer
if errorlevel 1 goto buildServer

:buildServer
echo.
echo [1/2] Building optimized production assets...
call npm run build
goto startServer

:startServer
echo.
echo [2/2] Launching high-performance production server...
call npm run start
pause
