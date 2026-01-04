$WshShell = New-Object -ComObject WScript.Shell
$StartupPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\Logibot.lnk"
$Shortcut = $WshShell.CreateShortcut($StartupPath)
$Shortcut.TargetPath = "D:\LOGISTICA\start-bot-hidden.vbs"
$Shortcut.WorkingDirectory = "D:\LOGISTICA"
$Shortcut.Description = "Logibot WhatsApp"
$Shortcut.Save()
Write-Host "Acceso directo creado en: $StartupPath"
