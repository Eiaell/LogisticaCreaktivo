# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Creaactivo Logistics Intelligence System - A WhatsApp bot for capturing and querying logistics decisions. The bot receives voice messages or text via WhatsApp, transcribes audio using OpenAI Whisper, extracts structured entities using Claude, and stores data in local JSON files with optional Google Drive sync.

**Primary user context**: Logistics coordinator in Lima, Peru working with promotional materials suppliers (shirts, prints, fabrics). All interactions are in Spanish.

## Development Commands

```bash
npm run dev      # Start with tsx (hot reload)
npm run watch    # Start with tsx watch mode
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled JS from dist/
```

## Required Environment Variables

Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - For Whisper audio transcription
- `ANTHROPIC_API_KEY` - For Claude entity extraction
- `FLACO_NUMERO` - Authorized WhatsApp number (Peru format: 51XXXXXXXXX)
- `GOOGLE_CREDENTIALS_PATH` (optional) - Service account JSON path
- `GOOGLE_DRIVE_FOLDER_ID` (optional) - Drive folder for backups

## Architecture

### Data Flow
1. WhatsApp message received → `src/whatsapp/client.ts`
2. Audio transcribed (if voice) → `src/services/transcription.ts` (Whisper)
3. Entities extracted → `src/services/extraction.ts` (Claude)
4. Routed by type → `src/whatsapp/handlers.ts`
5. Data persisted → `src/services/storage.ts` (JSON files in `data/`)
6. Optional Drive sync → `src/services/drive.ts`

### Key Types (`src/models/types.ts`)
- **Pedido**: Customer order with state machine (cotizacion → aprobado → en_produccion → listo_recoger → en_campo → entregado → cerrado)
- **Proveedor**: Supplier with price/time history
- **AcuerdoProduccion**: Production agreement with supplier (pendiente → listo → recogido → problema)
- **MovimientoMovilidad**: Transportation movement with cost tracking
- **GastoExtraordinario**: Extraordinary expenses requiring reimbursement

### Message Types Extracted by Claude
The extraction service (`src/services/extraction.ts`) classifies messages into:
- `acuerdo_produccion` - Supplier production orders
- `consulta` - Queries about history, prices, times
- `movimiento_movilidad` - Transportation movements
- `cambio_estado` - Status updates
- `registro_gasto` - Expense registration
- `pendientes` - Pending items query
- `reporte` - Report requests (movilidad/gastos/produccion)

### Storage Structure
All data stored as JSON in `data/`:
- `pedidos.json`, `proveedores.json`, `acuerdos.json`, `movilidad.json`, `gastos.json`, `matriz_costos.json`
- Audio files: `data/audios/YYYY-MM/`

### Scheduled Tasks
- End-of-day reminder: 5:30 PM Mon-Sat (configurable via `REMINDER_CRON`)
- Drive sync: Every 30 minutes (if configured)

## Key Patterns

- WhatsApp authentication persisted in `.wwebjs_auth/`
- Initial suppliers/routes defined in `src/config/constants.ts`
- Flexible date parsing handles Spanish relative dates ("mañana", "el viernes", "pasado mañana")
- Taxi transport auto-flags for approval requirement
- Movement origin defaults to last destination if not specified
