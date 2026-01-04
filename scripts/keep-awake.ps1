# Keep-Awake Script - Prevents Windows from sleeping while bot runs
# Run this alongside the bot

Add-Type @"
using System;
using System.Runtime.InteropServices;

public class PowerManager {
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint SetThreadExecutionState(uint esFlags);

    public const uint ES_CONTINUOUS = 0x80000000;
    public const uint ES_SYSTEM_REQUIRED = 0x00000001;
    public const uint ES_DISPLAY_REQUIRED = 0x00000002;
}
"@

Write-Host "============================================"
Write-Host "  KEEP-AWAKE - Suspension bloqueada"
Write-Host "============================================"
Write-Host ""
Write-Host "La PC no entrara en suspension mientras este script corra."
Write-Host "Presiona Ctrl+C para permitir suspension nuevamente."
Write-Host ""

# Prevent sleep but allow display to turn off
while ($true) {
    [PowerManager]::SetThreadExecutionState(
        [PowerManager]::ES_CONTINUOUS -bor [PowerManager]::ES_SYSTEM_REQUIRED
    ) | Out-Null
    Start-Sleep -Seconds 60
}
