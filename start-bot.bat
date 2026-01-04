@echo off
cd /d "D:\LOGISTICA"
echo ========================================
echo   LOGIBOT - Iniciando...
echo   %date% %time%
echo ========================================
echo.

:: Crear carpeta de logs si no existe
if not exist "logs" mkdir logs

:: Ejecutar el bot y guardar logs
npm run dev 2>&1 | tee logs\bot-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log

:: Si el bot se cierra, pausar para ver el error
echo.
echo [!] El bot se detuvo. Presiona cualquier tecla para cerrar...
pause > nul
