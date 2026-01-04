@echo off
title LogiBot Launcher
cd /d D:\LOGISTICA

echo ============================================
echo   LOGIBOT - Iniciando servicios...
echo ============================================
echo.

:: Start keep-awake in background (hidden window)
start /min powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "D:\LOGISTICA\scripts\keep-awake.ps1"
echo [OK] Anti-suspension activado

:: Small delay
timeout /t 2 /nobreak >nul

:: Start bot with auto-restart
echo [OK] Iniciando bot...
echo.
call D:\LOGISTICA\scripts\start-bot.bat
