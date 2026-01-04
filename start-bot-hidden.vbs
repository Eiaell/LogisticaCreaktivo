Set WshShell = CreateObject("WScript.Shell")
' Parametro 1 = ventana visible, 0 = oculta
WshShell.Run chr(34) & "D:\LOGISTICA\start-bot.bat" & chr(34), 1
Set WshShell = Nothing
