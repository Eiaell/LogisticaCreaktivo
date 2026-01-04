# Errores Conocidos y Soluciones

Este documento registra los problemas encontrados durante el desarrollo y despliegue del bot, junto con sus soluciones.

---

## 1. Bot no inicia automaticamente al reiniciar Windows

**Problema:** El archivo `start-bot-hidden.vbs` en la carpeta de Startup apuntaba a la ruta incorrecta (`D:\LOGISTICA` vs `D:\Whatsapp`).

**Solucion:** Verificar que el archivo en `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\start-bot-hidden.vbs` apunte a la ruta correcta:
```vbs
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "D:\LOGISTICA\start-bot.bat" & chr(34), 0
Set WshShell = Nothing
```

---

## 2. Chrome/Puppeteer bloqueado - "Device or resource busy"

**Problema:** Al reiniciar el bot, Chrome no se cierra correctamente y deja archivos bloqueados en `.wwebjs_auth/session/`.

**Sintomas:**
- Error: `chrome_debug.log: Device or resource busy`
- Error: `SingletonLock: Device or resource busy`
- Bot se queda en "Initializing client..."

**Solucion:**
1. Cerrar Chrome manualmente o con PowerShell:
   ```powershell
   Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force
   ```
2. Eliminar archivos de bloqueo:
   ```bash
   rm -rf "D:/LOGISTICA/.wwebjs_auth/session/SingletonLock"
   rm -rf "D:/LOGISTICA/.wwebjs_auth/session/Default/chrome_debug.log"
   ```
3. Reiniciar el bot

---

## 3. taskkill cierra Claude Code junto con el bot

**Problema:** Usar `taskkill /F /IM node.exe` mata TODOS los procesos de Node.js, incluyendo Claude Code.

**Solucion:** NO usar `taskkill /F /IM node.exe`. En su lugar:
- Usar `KillShell` de Claude Code para matar el proceso en background
- O cerrar solo Chrome: `taskkill /F /IM chrome.exe`
- O identificar el PID especifico antes de matar

---

## 4. Mensajes clasificados como "otro" y no se procesan

**Problema:** DeepSeek clasifica mensajes como `tipo: "otro"` cuando no reconoce el formato de logistica, y el bot los ignoraba silenciosamente.

**Solucion:**
1. Modificado `handlers.ts` para responder siempre, incluso con tipo "otro"
2. Modificado `extraction.ts` para extraer datos estructurados (items, personas, montos) incluso en mensajes tipo "otro"
3. Nuevo tipo `ExtraccionOtro` en `types.ts` con campos adicionales

---

## 5. Respuesta JSON demasiado larga

**Problema:** El JSON con datos estructurados era muy largo y dificil de leer en WhatsApp.

**Solucion:** Creada funcion `formatCompactResponse()` que genera JSON compacto en una sola linea, ideal para consumo por otro LLM.

---

## 6. Sesion de WhatsApp expira

**Problema:** Despues de un tiempo sin uso o al cambiar de red, la sesion de WhatsApp expira y pide escanear QR de nuevo.

**Solucion:**
1. Revisar los logs del bot
2. Si pide QR, escanear desde WhatsApp > Dispositivos Vinculados
3. La sesion se guarda en `.wwebjs_auth/` - no borrar esta carpeta

---

## Comandos utiles para debugging

```bash
# Ver logs del bot
cd D:/LOGISTICA && npm start

# Verificar archivo de startup
cat "$APPDATA/Microsoft/Windows/Start Menu/Programs/Startup/start-bot-hidden.vbs"

# Cerrar Chrome sin afectar Claude
powershell -Command "Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force"

# Limpiar locks de sesion
rm -rf "D:/LOGISTICA/.wwebjs_auth/session/SingletonLock"

# Compilar TypeScript
cd D:/LOGISTICA && npm run build

# Ver estado de git
cd D:/LOGISTICA && git status
```
