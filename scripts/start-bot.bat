@echo off
title LogiBot - Creaactivo Logistics
cd /d D:\LOGISTICA

echo ============================================
echo   LOGIBOT - Auto-restart enabled
echo ============================================
echo.

:loop
echo [%date% %time%] Iniciando bot...
call npm run dev

echo.
echo [%date% %time%] Bot se detuvo. Reiniciando en 5 segundos...
echo Presiona Ctrl+C para salir completamente.
timeout /t 5 /nobreak >nul
goto loop
