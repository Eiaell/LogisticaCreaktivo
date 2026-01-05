Set WshShell = CreateObject("WScript.Shell")
' Parametro 1 = ventana visible, 0 = oculta
WshShell.Run chr(34) & "D:\LOGISTICA\scripts\start-all.bat" & chr(34), 1
Set WshShell = Nothing
